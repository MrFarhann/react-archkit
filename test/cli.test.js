import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/cli.js', import.meta.url));

// Drive each prompt only after it appears, as a real user would. This uses no PTY
// dependency and also checks the CLI handles piped input without losing answers.
async function runInterview(formatter, create, { pwa = true, strategy = 'generateSW', update = 'prompt', current = false } = {}) {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'react-archkit-cli-'));
  const cwd = current ? path.join(temp, 'current-app') : temp;
  if (current) await mkdir(cwd);
  const steps = [
    ['Do you want a Progressive Web App (PWA)?', pwa ? '\r' : '\x1b[B\r'],
    ...(pwa ? [
      ['Which service worker strategy do you want?', strategy === 'generateSW' ? '\r' : '\x1b[B\r'],
      ['How should the app update?', update === 'prompt' ? '\r' : '\x1b[B\r'],
    ] : []),
    ['Which architecture do you want?', '\r'],
    ['Which file and folder naming convention do you want?', '\r'],
    ['Which language do you want?', '\r'],
    ['Do you want Tailwind CSS?', '\x1b[B\r'], // No: also checks shadcn question is skipped.
    ['Which formatter do you want?', formatter === 'Biome' ? '\r' : '\x1b[B\r'],
    ...(formatter === 'Prettier' ? [['Do you want esbuild as a direct dependency?', '\r']] : []),
    ['Do you want Axios?', '\r'],
    ['Do you want Graphify?', create ? '\r' : '\x1b[B\r'],
    ['Which TanStack tools do you want to use?', '\r'],
    ['Create this project?', create ? '\r' : 'n\r'],
  ];
  try {
    const child = spawn(process.execPath, [cli, current ? '.' : 'interview-app'], {
      cwd, stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0', TERM: 'dumb' },
    });
    const { output, code } = await new Promise((resolve, reject) => {
      let output = '';
      let step = 0;
      let searchFrom = 0;
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`Interview timed out at ${steps[step]?.[0]}:\n${output}`));
      }, 20000);
      const onData = chunk => {
        output += chunk.toString();
        if (step >= steps.length) return;
        const index = output.indexOf(steps[step][0], searchFrom);
        if (index < 0) return;
        searchFrom = index + steps[step][0].length;
        const answer = steps[step++][1];
        // Wait until Inquirer has attached the next keypress listener.
        setTimeout(() => child.stdin.write(answer), 50);
      };
      child.stdout.on('data', onData);
      child.stderr.on('data', onData);
      child.on('error', error => { clearTimeout(timer); reject(error); });
      child.on('exit', code => { clearTimeout(timer); resolve({ output, code }); });
    });
    assert.equal(code, 0, output);
    assert.match(output, create ? /Project created successfully\./ : /Project creation cancelled\./);
    assert.match(output, new RegExp(`Formatter: ${formatter}`));
    assert.match(output, /Tailwind CSS: No/);
    assert.match(output, new RegExp(`PWA: ${pwa ? 'Yes' : 'No'}`));
    assert.equal(output.includes('Which service worker strategy do you want?'), pwa);
    assert.equal(output.includes('How should the app update?'), pwa);
    if (pwa) {
      assert.match(output, new RegExp(`Service worker strategy: ${strategy}`));
      assert.match(output, new RegExp(`PWA updates: ${update}`));
    }
    assert.match(output, /Axios: Yes/);
    assert.match(output, new RegExp(`Graphify: ${create ? 'Yes' : 'No'}`));
    assert.doesNotMatch(output, /Do you want shadcn\/ui\?/);
    assert.equal(output.includes('Do you want esbuild as a direct dependency?'), formatter === 'Prettier');
    assert.match(output, new RegExp(`Direct esbuild dependency: ${formatter === 'Prettier' ? 'Yes' : 'No'}`));
    if (!create) {
      assert.deepEqual(await readdir(cwd), [], 'cancellation must not create project files');
    } else {
      const project = current ? cwd : path.join(cwd, 'interview-app');
      const pkg = JSON.parse(await readFile(path.join(project, 'package.json'), 'utf8'));
      if (current) {
        assert.equal(pkg.name, 'current-app');
        assert.doesNotMatch(output, /\n\s+cd current-app/);
      }
      const viteConfig = await readFile(path.join(project, 'vite.config.js'), 'utf8');
      const docs = await readFile(path.join(project, 'PROJECT_STRUCTURE.md'), 'utf8');
      assert.equal(Boolean(pkg.devDependencies['vite-plugin-pwa']), pwa);
      assert.ok(pkg.dependencies.axios);
      assert.equal(viteConfig.includes('VitePWA('), pwa);
      if (pwa) {
        assert.match(viteConfig, new RegExp(strategy));
        assert.match(viteConfig, new RegExp(update));
      }
      assert.match(docs, /Graphify: configured/);
      if (pwa) assert.ok((await readFile(path.join(project, 'public/pwa-192x192.png'))).length > 8);
      assert.equal(Boolean(pkg.devDependencies['@biomejs/biome']), formatter === 'Biome');
      assert.equal(Boolean(pkg.devDependencies.prettier), formatter === 'Prettier');
      assert.equal(Boolean(pkg.devDependencies.esbuild), formatter === 'Prettier');
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

for (const formatter of ['Biome', 'Prettier']) {
  test(`interactive ${formatter} interview and cancellation`, { timeout: 30000 }, async () => runInterview(formatter, false));
  test(`interactive ${formatter} interview creates selected project`, { timeout: 30000 }, async () => runInterview(formatter, true));
}

test('interactive PWA-off skips worker questions', { timeout: 30000 }, async () => runInterview('Biome', true, { pwa: false }));
test('interactive custom worker and auto update', { timeout: 30000 }, async () => runInterview('Prettier', true, { strategy: 'injectManifest', update: 'autoUpdate' }));

test('dot creates a project inside an empty current directory', { timeout: 30000 }, async () => runInterview('Biome', true, { pwa: false, current: true }));

test('dot rejects a nonempty current directory without modifying its files', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'react-archkit-cli-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const cwd = path.join(temp, 'current-app');
  await mkdir(cwd);
  await writeFile(path.join(cwd, 'keep.txt'), 'existing user data');
  const result = spawnSync(process.execPath, [cli, '.'], { cwd, encoding: 'utf8', timeout: 10000 });
  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stderr, /empty|not empty/i);
  assert.deepEqual(await readdir(cwd), ['keep.txt']);
  assert.equal(await readFile(path.join(cwd, 'keep.txt'), 'utf8'), 'existing user data');
});

test('dot rejects a current directory with an invalid package name', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'react-archkit-cli-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const cwd = path.join(temp, 'Invalid Name');
  await mkdir(cwd);
  const result = spawnSync(process.execPath, [cli, '.'], { cwd, encoding: 'utf8', timeout: 10000 });
  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stderr, /name/i);
  assert.deepEqual(await readdir(cwd), []);
});
