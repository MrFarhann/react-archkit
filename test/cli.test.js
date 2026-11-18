import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/cli.js', import.meta.url));

// Drive each prompt only after it appears, as a real user would. This uses no PTY
// dependency and also checks the CLI handles piped input without losing answers.
async function runInterview(formatter, create, { pwa = true, strategy = 'generateSW', update = 'prompt' } = {}) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'react-archkit-cli-'));
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
    ['Create this project?', create ? '\r' : 'n\r'],
  ];
  try {
    const child = spawn(process.execPath, [cli, 'interview-app'], {
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
      const project = path.join(cwd, 'interview-app');
      const pkg = JSON.parse(await readFile(path.join(project, 'package.json'), 'utf8'));
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
    await rm(cwd, { recursive: true, force: true });
  }
}

for (const formatter of ['Biome', 'Prettier']) {
  test(`interactive ${formatter} interview and cancellation`, { timeout: 30000 }, async () => runInterview(formatter, false));
  test(`interactive ${formatter} interview creates selected project`, { timeout: 30000 }, async () => runInterview(formatter, true));
}

test('interactive PWA-off skips worker questions', { timeout: 30000 }, async () => runInterview('Biome', true, { pwa: false }));
test('interactive custom worker and auto update', { timeout: 30000 }, async () => runInterview('Prettier', true, { strategy: 'injectManifest', update: 'autoUpdate' }));
