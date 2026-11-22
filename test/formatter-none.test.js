import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateProject } from '../src/generator.js';

const cli = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const architectures = ['Type-Based', 'Feature-Based', 'Domain-Based', 'Feature-Sliced Design (FSD)', 'Atomic Design'];
const formatterFiles = ['biome.json', 'biome.jsonc', '.prettierrc', '.prettierrc.json', '.prettierignore'];

async function checkNoFormatter(target) {
  const [pkgText, files, readme, structure] = await Promise.all([
    readFile(path.join(target, 'package.json'), 'utf8'), readdir(target),
    readFile(path.join(target, 'README.md'), 'utf8'), readFile(path.join(target, 'PROJECT_STRUCTURE.md'), 'utf8'),
  ]);
  const pkg = JSON.parse(pkgText);
  for (const name of ['@biomejs/biome', 'prettier', 'esbuild']) {
    assert.equal(pkg.dependencies?.[name], undefined, `${name} is not a runtime dependency`);
    assert.equal(pkg.devDependencies?.[name], undefined, `${name} is not a direct dev dependency`);
  }
  for (const script of ['format', 'format:check', 'lint']) assert.equal(pkg.scripts[script], undefined, `no ${script} script`);
  for (const name of formatterFiles) assert.ok(!files.includes(name), `${name} is not generated`);
  assert.doesNotMatch(readme, /npm run (?:format|format:check|lint)/, 'README must not suggest missing formatter scripts');
  assert.match(readme, /(?:formatting|formatter):?\s*(?:none|no formatter)/i);
  assert.match(structure, /formatter:\s*(?:none|no formatter)/i);
  return pkg;
}

test('no formatter works across architectures, languages and optional integrations', { timeout: 120000 }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-no-formatter-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [index, architecture] of architectures.entries()) {
    for (const language of ['JavaScript', 'TypeScript']) {
      const targetDir = path.join(root, `case-${index}-${language}`);
      await generateProject({ projectName: 'example-app', targetDir, architecture, naming: 'kebab-case', language,
        tailwind: true, shadcn: true, formatter: 'None', esbuild: false,
        pwa: true, axios: true, graphify: true, tanstack: ['router', 'query'] });
      const pkg = await checkNoFormatter(targetDir);
      assert.ok(pkg.dependencies['@tanstack/react-router']);
      assert.ok(pkg.dependencies['@tanstack/react-query']);
      assert.ok(pkg.dependencies.axios);
      assert.ok(pkg.devDependencies['vite-plugin-pwa']);
      assert.ok(pkg.scripts['graphify:build']);
    }
  }
});

test('formatter choices enforce compatible esbuild configuration', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-formatter-options-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const base = { projectName: 'example-app', architecture: 'Type-Based', naming: 'kebab-case', language: 'JavaScript', tailwind: false, shadcn: false };
  for (const formatter of ['Biome', 'None']) {
    const targetDir = path.join(root, formatter);
    await assert.rejects(generateProject({ ...base, targetDir, formatter, esbuild: true }));
  }
  assert.deepEqual(await readdir(root), [], 'invalid choices fail before writing files');
  const prettierDir = path.join(root, 'prettier');
  await generateProject({ ...base, targetDir: prettierDir, formatter: 'Prettier', esbuild: true });
  const pkg = JSON.parse(await readFile(path.join(prettierDir, 'package.json'), 'utf8'));
  assert.ok(pkg.devDependencies.prettier);
  assert.ok(pkg.devDependencies.esbuild);
  assert.ok(pkg.scripts.format && pkg.scripts['format:check']);
});

test('CLI selects no formatter, skips esbuild and builds a project with Router and PWA', { timeout: 600000 }, async t => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'archkit-no-formatter-cli-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const steps = [
    ['Do you want a Progressive Web App (PWA)?', '\r'],
    ['Which service worker strategy do you want?', '\r'],
    ['How should the app update?', '\r'],
    ['Which architecture do you want?', '\r'],
    ['Which file and folder naming convention do you want?', '\r'],
    ['Which language do you want?', '\r'],
    ['Do you want Tailwind CSS?', '\x1b[B\r'],
    ['Which formatter do you want?', '\x1b[B\x1b[B\r'],
    ['Do you want Axios?', '\x1b[B\r'],
    ['Do you want Graphify?', '\x1b[B\r'],
    ['Which TanStack tools do you want to use?', ' \x1b[B \r'],
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
  assert.match(output, /No formatter/);
  assert.match(output, /Formatter: None/);
  assert.doesNotMatch(output, /Do you want esbuild as a direct dependency/);
  const target = path.join(cwd, 'example-app');
  const pkg = await checkNoFormatter(target);
  assert.ok(pkg.dependencies['@tanstack/react-router']);
  assert.ok(pkg.dependencies['@tanstack/react-query']);
  assert.ok(pkg.devDependencies['vite-plugin-pwa']);
  const runNpm = args => execFileSync(process.execPath, [npmCli, ...args], {
    cwd: target, encoding: 'utf8', stdio: 'pipe', timeout: 300000,
    env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' },
  });
  try {
    runNpm(['install', '--no-audit', '--no-fund']);
    runNpm(['run', 'build']);
  } catch (error) {
    assert.fail(`Generated project could not install or build: ${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`);
  }
  assert.ok((await stat(path.join(target, 'dist', 'index.html'))).isFile());
});
