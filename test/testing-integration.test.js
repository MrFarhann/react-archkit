import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateProject } from '../src/generator.js';

const cli = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const architectures = ['Type-Based', 'Feature-Based', 'Domain-Based', 'Feature-Sliced Design (FSD)', 'Atomic Design'];
const testingPackages = ['vitest', 'jsdom', '@testing-library/react', '@testing-library/dom', '@testing-library/user-event', '@testing-library/jest-dom'];

async function fixture(t, overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-testing-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));
  const targetDir = path.join(root, 'example-app');
  await generateProject({ projectName: 'example-app', targetDir, architecture: 'Type-Based', naming: 'kebab-case',
    language: 'JavaScript', tailwind: false, shadcn: false, formatter: 'None', testing: 'Vitest', ...overrides });
  return targetDir;
}

function runNpm(args, cwd) {
  try {
    return execFileSync(process.execPath, [npmCli, ...args], {
      cwd, encoding: 'utf8', stdio: 'pipe', timeout: 300000,
      env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' },
    });
  } catch (error) {
    assert.fail(`npm ${args.join(' ')} failed: ${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`);
  }
}

test('testing tools are optional and omitted from a project when declined', async t => {
  const target = await fixture(t, { testing: 'None' });
  const pkg = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'));
  for (const name of testingPackages) {
    assert.equal(pkg.dependencies?.[name], undefined, `${name} should not be a dependency`);
    assert.equal(pkg.devDependencies?.[name], undefined, `${name} should not be a dev dependency`);
  }
  assert.equal(pkg.scripts.test, undefined);
  assert.equal(pkg.scripts['test:run'], undefined);
  assert.equal(pkg.engines.node, '^20.19.0 || >=22.12.0', 'declining testing preserves support for Node 23');
  const docs = await readFile(path.join(target, 'README.md'), 'utf8');
  assert.doesNotMatch(docs, /npm (?:run test|test)/);
});

test('invalid testing selection fails without creating a project', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-testing-invalid-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await assert.rejects(generateProject({ projectName: 'invalid-app', targetDir: path.join(root, 'invalid-app'),
    architecture: 'Type-Based', naming: 'kebab-case', language: 'JavaScript', tailwind: false, shadcn: false,
    testing: 'invalid' }));
  assert.deepEqual(await readdir(root), []);
});

test('Vitest is configured across architectures and both languages', { timeout: 120000 }, async t => {
  for (const architecture of architectures) {
    for (const language of ['JavaScript', 'TypeScript']) {
      const target = await fixture(t, { architecture, language, tanstack: ['router', 'query'] });
      const pkg = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'));
      for (const name of testingPackages) assert.ok(pkg.devDependencies?.[name], `${architecture} / ${language}: ${name}`);
      assert.equal(pkg.engines.node, '^20.19.0 || ^22.12.0 || >=24.0.0', `${architecture} / ${language}: compatible Node versions`);
      assert.equal(pkg.overrides?.['@vitejs/devtools-vitest']?.vitest, pkg.devDependencies.vitest, `${architecture} / ${language}: npm peer resolution uses the selected Vitest version`);
      assert.ok(pkg.scripts.test, `${architecture} / ${language}: test script`);
      assert.ok(pkg.scripts['test:run'], `${architecture} / ${language}: test:run script`);
      const docs = await readFile(path.join(target, 'README.md'), 'utf8');
      assert.match(docs, /vitest/i);
      assert.match(docs, /npm run test:run/);
    }
  }
});

const buildCases = [
  { name: 'JavaScript basic', language: 'JavaScript' },
  { name: 'TypeScript Router and Query', language: 'TypeScript', architecture: 'Feature-Based', tanstack: ['router', 'query'] },
  { name: 'TypeScript Domain', language: 'TypeScript', architecture: 'Domain-Based' },
  { name: 'JavaScript FSD Router', language: 'JavaScript', architecture: 'Feature-Sliced Design (FSD)', tanstack: ['router'] },
  { name: 'TypeScript Atomic with Router, Query, shadcn and PWA', language: 'TypeScript', architecture: 'Atomic Design', tailwind: true, shadcn: true, pwa: true, tanstack: ['router', 'query'] },
];
for (const { name, ...options } of buildCases) {
  test(`generated testing project installs, builds and runs example: ${name}`, { timeout: 600000 }, async t => {
    const target = await fixture(t, options);
    runNpm(['install', '--no-audit', '--no-fund'], target);
    const output = runNpm(['run', 'test:run'], target);
    assert.match(output, /passed/i, output);
    runNpm(['run', 'build'], target);
  });
}

async function runInterview(cwd, testingChoice) {
  const steps = [
    ['Do you want a Progressive Web App (PWA)?', '\x1b[B\r'],
    ['Which architecture do you want?', '\r'],
    ['Which file and folder naming convention do you want?', '\r'],
    ['Which language do you want?', '\r'],
    ['Do you want Tailwind CSS?', '\x1b[B\r'],
    ['Which formatter do you want?', '\x1b[B\x1b[B\r'],
    ['Do you want Axios?', '\x1b[B\r'],
    ['Do you want Graphify?', '\x1b[B\r'],
    ['Which testing tools do you want?', testingChoice === 'Vitest' ? '\r' : '\x1b[B\r'],
    ['Which TanStack tools do you want to use?', '\r'],
    ['Which form management library do you want?', '\r'],
    ['Do you want Zod schema validation?', '\r'],
    ['Which state management library do you want?', '\r'],
    ['Create this project?', '\r'],
  ];
  const child = spawn(process.execPath, [cli, 'example-app'], {
    cwd, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, FORCE_COLOR: '0', TERM: 'dumb' },
  });
  const { output, code } = await new Promise((resolve, reject) => {
    let output = '', step = 0, searchFrom = 0;
    const timer = setTimeout(() => { child.kill(); reject(new Error(`Interview timed out at ${steps[step]?.[0]}:\n${output}`)); }, 20000);
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
  const pkg = JSON.parse(await readFile(path.join(cwd, 'example-app', 'package.json'), 'utf8'));
  assert.equal(Boolean(pkg.devDependencies.vitest), testingChoice === 'Vitest', output);
  assert.match(output, /Testing:/);
}

test('interactive CLI offers testing by default and also allows none', { timeout: 60000 }, async t => {
  for (const choice of ['Vitest', 'None']) {
    const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-testing-cli-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await runInterview(root, choice);
  }
});
