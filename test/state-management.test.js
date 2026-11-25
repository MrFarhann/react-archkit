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
const packages = { zustand: ['zustand'], 'redux-toolkit': ['@reduxjs/toolkit', 'react-redux'], rosma: ['rosma'] };

async function fixture(t, overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-state-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 }));
  const targetDir = path.join(root, 'example-app');
  await generateProject({ projectName: 'example-app', targetDir, architecture: 'Type-Based', naming: 'kebab-case',
    language: 'JavaScript', tailwind: false, shadcn: false, formatter: 'None', testing: 'None', ...overrides });
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

test('state selection adds only the chosen packages across architectures and languages', { timeout: 120000 }, async t => {
  for (const architecture of architectures) {
    for (const language of ['JavaScript', 'TypeScript']) {
      for (const stateManagement of ['none', ...Object.keys(packages)]) {
        const target = await fixture(t, { architecture, language, stateManagement });
        const pkg = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'));
        for (const [choice, deps] of Object.entries(packages)) {
          for (const dep of deps) assert.equal(Boolean(pkg.dependencies?.[dep]), choice === stateManagement,
            `${architecture} / ${language} / ${stateManagement}: ${dep}`);
        }
      }
    }
  }
});

test('rejects invalid or conflicting state selections before writing files', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-state-invalid-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cases = [{ stateManagement: 'bogus' }, ...Object.keys(packages).map(stateManagement => ({ stateManagement, tanstack: ['store'] }))];
  for (const [index, selection] of cases.entries()) {
    await assert.rejects(generateProject({ projectName: `invalid-${index}`, targetDir: path.join(root, `invalid-${index}`),
      architecture: 'Type-Based', naming: 'kebab-case', language: 'JavaScript', tailwind: false, shadcn: false, ...selection }));
  }
  assert.deepEqual(await readdir(root), []);
});

async function runInterview(cwd, choice, tanstackStore = false) {
  const down = '\x1b[B';
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
    ['Which TanStack tools do you want to use?', tanstackStore ? `${down.repeat(6)} \r` : '\r'],
    ['Which form management library do you want?', '\r'],
    ['Do you want Zod schema validation?', '\r'],
    ...(!tanstackStore ? [['Which state management library do you want?', `${down.repeat(['none', 'zustand', 'redux-toolkit', 'rosma'].indexOf(choice))}\r`]] : []),
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
  assert.equal(output.includes('Which state management library do you want?'), !tanstackStore, output);
  assert.match(output, tanstackStore ? /State management: TanStack Store/ : /State management:/);
  const pkg = JSON.parse(await readFile(path.join(cwd, 'example-app', 'package.json'), 'utf8'));
  assert.equal(Boolean(pkg.dependencies['@tanstack/react-store']), tanstackStore, output);
  for (const [library, deps] of Object.entries(packages)) {
    for (const dep of deps) assert.equal(Boolean(pkg.dependencies[dep]), !tanstackStore && library === choice, output);
  }
}

test('CLI offers each state choice and skips the question for TanStack Store', { timeout: 120000 }, async t => {
  for (const [choice, tanstackStore] of [['none', false], ['zustand', false], ['redux-toolkit', false], ['rosma', false], ['none', true]]) {
    const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-state-cli-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await runInterview(root, choice, tanstackStore);
  }
});

const scenarios = [
  { stateManagement: 'zustand', language: 'JavaScript', architecture: 'Feature-Based', testing: 'Vitest' },
  { stateManagement: 'redux-toolkit', language: 'TypeScript', architecture: 'Feature-Sliced Design (FSD)', tanstack: ['router', 'query'], testing: 'Vitest' },
  { stateManagement: 'rosma', language: 'TypeScript', architecture: 'Atomic Design', tailwind: true, shadcn: true, testing: 'Vitest' },
  { stateManagement: 'zustand', language: 'TypeScript', architecture: 'Domain-Based', testing: 'Vitest' },
  { stateManagement: 'redux-toolkit', language: 'JavaScript', architecture: 'Type-Based', testing: 'Vitest' },
  { stateManagement: 'rosma', language: 'JavaScript', architecture: 'Feature-Based', testing: 'Vitest' },
];
for (const options of scenarios) {
  test(`installed ${options.stateManagement} ${options.language} project shares state across components and builds`, { timeout: 600000 }, async t => {
    const target = await fixture(t, options);
    const redux = options.stateManagement === 'redux-toolkit';
    const testExt = options.language === 'TypeScript' ? 'tsx' : 'jsx';
    await writeFile(path.join(target, `src/test/state-behavior.test.${testExt}`), `
import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { StateExample } from '@/state/state-example';
${redux ? "import { Provider } from 'react-redux';\nimport { store } from '@/state/store';" : ''}

it('shares changes between two mounted components in StrictMode', async () => {
  const user = userEvent.setup();
  render(<StrictMode>${redux ? '<Provider store={store}>' : ''}<StateExample /><StateExample />${redux ? '</Provider>' : ''}</StrictMode>);
  const counters = screen.getAllByText(/Shared count:/);
  expect(counters).toHaveLength(2);
  counters.forEach(counter => expect(counter).toHaveTextContent('Shared count: 0'));
  await user.click(screen.getAllByRole('button', { name: 'Increase shared count' })[0]);
  counters.forEach(counter => expect(counter).toHaveTextContent('Shared count: 1'));
});
`);
    runNpm(['install', '--no-audit', '--no-fund'], target);
    runNpm(['run', 'build'], target);
    assert.match(runNpm(['run', 'test:run'], target), /passed/i);
  });
}
