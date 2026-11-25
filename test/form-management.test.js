import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateProject } from '../src/generator.js';

const cli = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const architectures = ['Type-Based', 'Feature-Based', 'Domain-Based', 'Feature-Sliced Design (FSD)', 'Atomic Design'];

async function fixture(t, options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-form-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 }));
  const targetDir = path.join(root, 'example-app');
  await generateProject({ projectName: 'example-app', targetDir, architecture: 'Type-Based', naming: 'kebab-case',
    language: 'JavaScript', tailwind: false, shadcn: false, formatter: 'None', testing: 'None', ...options });
  return targetDir;
}

function runNpm(args, cwd) {
  try {
    return execFileSync(process.execPath, [npmCli, ...args], { cwd, encoding: 'utf8', stdio: 'pipe', timeout: 300000,
      env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' } });
  } catch (error) {
    assert.fail(`npm ${args.join(' ')} failed: ${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`);
  }
}

test('form and schema choices add the right dependencies across architectures and languages', { timeout: 120000 }, async t => {
  for (const architecture of architectures) for (const language of ['JavaScript', 'TypeScript']) {
    for (const formManagement of ['none', 'react-hook-form', 'formik']) for (const zod of [false, true]) {
      const target = await fixture(t, { architecture, language, formManagement, zod });
      const pkg = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'));
      const context = `${architecture} / ${language} / ${formManagement} / Zod=${zod}`;
      assert.equal(Boolean(pkg.dependencies['react-hook-form']), formManagement === 'react-hook-form', context);
      assert.equal(Boolean(pkg.dependencies.formik), formManagement === 'formik', context);
      assert.equal(Boolean(pkg.dependencies.zod), zod, context);
      assert.equal(Boolean(pkg.dependencies['@hookform/resolvers']), formManagement === 'react-hook-form' && zod, context);
    }
  }
});

test('TanStack Form supports independent Zod selection without competing form libraries', async t => {
  for (const zod of [false, true]) {
    const target = await fixture(t, { tanstack: ['form'], formManagement: 'none', zod });
    const pkg = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'));
    assert.ok(pkg.dependencies['@tanstack/react-form']);
    assert.equal(Boolean(pkg.dependencies.zod), zod);
    assert.equal(pkg.dependencies['react-hook-form'], undefined);
    assert.equal(pkg.dependencies.formik, undefined);
    assert.equal(pkg.dependencies['@hookform/resolvers'], undefined);
  }
});

test('invalid or conflicting selections fail before writing files', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-form-invalid-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cases = [{ formManagement: 'bogus' }, { zod: 'yes' }, ...['react-hook-form', 'formik'].map(formManagement => ({ formManagement, tanstack: ['form'] }))];
  for (const [index, selection] of cases.entries()) {
    await assert.rejects(generateProject({ projectName: `invalid-${index}`, targetDir: path.join(root, `invalid-${index}`),
      architecture: 'Type-Based', naming: 'kebab-case', language: 'JavaScript', tailwind: false, shadcn: false, ...selection }));
  }
  assert.deepEqual(await readdir(root), []);
});

async function runInterview(cwd, formManagement, zod, tanstackForm = false, tanstackStore = false) {
  const down = '\x1b[B';
  const selectedTanstack = tanstackForm ? `${down.repeat(4)} ${tanstackStore ? down.repeat(2) + ' ' : ''}\r` : '\r';
  const steps = [
    ['Do you want a Progressive Web App (PWA)?', `${down}\r`],
    ['Which architecture do you want?', '\r'],
    ['Which file and folder naming convention do you want?', '\r'],
    ['Which language do you want?', '\r'],
    ['Do you want Tailwind CSS?', `${down}\r`],
    ['Which formatter do you want?', `${down}${down}\r`],
    ['Do you want Axios?', `${down}\r`],
    ['Do you want Graphify?', `${down}\r`],
    ['Which testing tools do you want?', `${down}\r`],
    ['Which TanStack tools do you want to use?', selectedTanstack],
    ...(!tanstackForm ? [['Which form management library do you want?', `${down.repeat(['none', 'react-hook-form', 'formik'].indexOf(formManagement))}\r`]] : []),
    ['Do you want Zod schema validation?', zod ? `${down}\r` : '\r'],
    ...(!tanstackStore ? [['Which state management library do you want?', '\r']] : []),
    ['Create this project?', '\r'],
  ];
  const child = spawn(process.execPath, [cli, 'example-app'], { cwd, stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0', TERM: 'dumb' } });
  const { output, code } = await new Promise((resolve, reject) => {
    let output = '', step = 0, searchFrom = 0;
    const timer = setTimeout(() => { child.kill(); reject(new Error(`Interview timed out at ${steps[step]?.[0]}:\n${output}`)); }, 25000);
    const onData = chunk => {
      output += chunk.toString();
      if (step >= steps.length) return;
      const index = output.indexOf(steps[step][0], searchFrom);
      if (index < 0) return;
      searchFrom = index + steps[step][0].length;
      const answer = steps[step++][1];
      setTimeout(() => child.stdin.write(answer), 50);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('exit', code => { clearTimeout(timer); resolve({ output, code }); });
  });
  assert.equal(code, 0, output);
  assert.equal(output.includes('Which form management library do you want?'), !tanstackForm, output);
  assert.ok(output.includes('Do you want Zod schema validation?'), output);
  assert.equal(output.includes('Which state management library do you want?'), !tanstackStore, output);
  const pkg = JSON.parse(await readFile(path.join(cwd, 'example-app', 'package.json'), 'utf8'));
  assert.equal(Boolean(pkg.dependencies.zod), zod, output);
  assert.equal(Boolean(pkg.dependencies['@tanstack/react-form']), tanstackForm, output);
  assert.equal(Boolean(pkg.dependencies['react-hook-form']), formManagement === 'react-hook-form', output);
  assert.equal(Boolean(pkg.dependencies.formik), formManagement === 'formik', output);
  assert.equal(Boolean(pkg.dependencies['@hookform/resolvers']), formManagement === 'react-hook-form' && zod, output);
}

test('CLI offers all form choices, asks about Zod, and skips selections already covered by TanStack', { timeout: 120000 }, async t => {
  const cases = [['none', false], ['react-hook-form', false], ['react-hook-form', true], ['formik', true], ['none', true, true], ['none', false, true, true]];
  for (const args of cases) {
    const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-form-cli-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await runInterview(root, ...args);
  }
});

const scenarios = [
  { name: 'React Hook Form / JavaScript', formManagement: 'react-hook-form', language: 'JavaScript' },
  { name: 'React Hook Form with Zod / TypeScript and Router', formManagement: 'react-hook-form', zod: true, language: 'TypeScript', tanstack: ['router', 'query'], architecture: 'Feature-Based' },
  { name: 'React Hook Form with Zod, Redux, Router, Query and shadcn / TypeScript', formManagement: 'react-hook-form', zod: true, stateManagement: 'redux-toolkit', language: 'TypeScript', tanstack: ['router', 'query'], architecture: 'Atomic Design', tailwind: true, shadcn: true },
  { name: 'Formik / TypeScript', formManagement: 'formik', language: 'TypeScript', architecture: 'Domain-Based' },
  { name: 'Formik with Zod / JavaScript and shadcn', formManagement: 'formik', zod: true, language: 'JavaScript', tailwind: true, shadcn: true },
  { name: 'TanStack Form with Zod / TypeScript and shadcn', formManagement: 'none', zod: true, language: 'TypeScript', architecture: 'Feature-Sliced Design (FSD)', tanstack: ['form'], tailwind: true, shadcn: true },
  { name: 'TanStack Form without Zod / TypeScript', formManagement: 'none', zod: false, language: 'TypeScript', tanstack: ['form'] },
  { name: 'Zod alone / TypeScript', formManagement: 'none', zod: true, language: 'TypeScript', architecture: 'Atomic Design' },
];
for (const { name, ...options } of scenarios) {
  test(`generated ${name} installs, builds and validates`, { timeout: 600000 }, async t => {
    const target = await fixture(t, { testing: 'Vitest', ...options });
    const ext = options.language === 'TypeScript' ? 'tsx' : 'jsx';
    const schemaOnly = options.formManagement === 'none' && !options.tanstack?.includes('form');
    const isTanstack = options.tanstack?.includes('form');
    const behavior = schemaOnly ? `
import { expect, it } from 'vitest';
import { formSchema } from '@/forms/schema';
it('rejects a blank name and accepts a nonblank name', () => {
  expect(formSchema.safeParse({ name: '   ' }).success).toBe(false);
  expect(formSchema.safeParse({ name: 'Alice' }).success).toBe(true);
});
` : `
import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
${isTanstack ? "import { TanStackExamples as Example } from '@/tanstack-examples';" : "import { FormExample as Example } from '@/forms/form-example';"}
${options.stateManagement === 'redux-toolkit' ? "import { Provider } from 'react-redux';\nimport { store } from '@/state/store';\nimport { StateExample } from '@/state/state-example';" : ''}
it('validates the name and accepts a valid submission', async () => {
  const user = userEvent.setup();
  render(<StrictMode>${options.stateManagement === 'redux-toolkit' ? '<Provider store={store}><Example /><StateExample /></Provider>' : '<Example />'}</StrictMode>);
  await user.click(screen.getByRole('button', { name: /say hello/i }));
  expect(await screen.findByText('Please enter a name.')).toBeInTheDocument();
  const name = screen.getByRole('textbox', { name: /your name/i });
  await user.type(name, '   ');
  await user.click(screen.getByRole('button', { name: /say hello/i }));
  expect(await screen.findByText('Please enter a name.')).toBeInTheDocument();
  await user.clear(name);
  await user.type(name, 'Alice');
  await user.click(screen.getByRole('button', { name: /say hello/i }));
  expect(await screen.findByText('Hello, Alice!')).toBeInTheDocument();
  ${options.stateManagement === 'redux-toolkit' ? "await user.click(screen.getByRole('button', { name: /increase shared count/i }));\n  expect(screen.getByText(/Shared count:/)).toHaveTextContent('Shared count: 1');" : ''}
});
`;
    await writeFile(path.join(target, `src/test/form-behavior.test.${ext}`), behavior);
    runNpm(['install', '--no-audit', '--no-fund'], target);
    runNpm(['run', 'build'], target);
    assert.match(runNpm(['run', 'test:run'], target), /passed/i);
  });
}
