import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generateProject } from '../src/generator.js';

const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const base = { projectName: 'pwa-app', naming: 'kebab-case', tailwind: false, shadcn: false, formatter: 'Prettier', esbuild: false, axios: false, graphify: false };
const architectures = ['Type-Based', 'Feature-Based', 'Domain-Based', 'Feature-Sliced Design (FSD)', 'Atomic Design'];
const runNpm = (args, cwd) => execFileSync(process.execPath, [npmCli, ...args], {
  cwd, encoding: 'utf8', stdio: 'pipe', timeout: 300000,
  env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' },
});
async function tempDir(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'react-archkit-pwa-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
async function filesUnder(dir, prefix = '') {
  const entries = await readdir(path.join(dir, prefix), { withFileTypes: true });
  return (await Promise.all(entries.map(entry => {
    const relative = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? filesUnder(dir, relative) : [relative];
  }))).flat();
}

test('without PWA, generated project has no worker or registration', async t => {
  const parent = await tempDir(t);
  const targetDir = path.join(parent, 'pwa-app');
  await generateProject({ ...base, targetDir, architecture: 'Type-Based', language: 'TypeScript', pwa: false });
  const files = await filesUnder(targetDir);
  const config = await readFile(path.join(targetDir, 'vite.config.js'), 'utf8');
  const pkg = JSON.parse(await readFile(path.join(targetDir, 'package.json'), 'utf8'));
  assert.ok(!pkg.devDependencies['vite-plugin-pwa']);
  assert.doesNotMatch(config, /VitePWA|vite-plugin-pwa/);
  assert.ok(!files.some(file => /(^|\/)(?:sw|service-worker)\.[jt]s$/.test(file)), files.join('\n'));
  const source = await Promise.all(files.filter(file => /^src\/.*\.[jt]sx?$/.test(file)).map(file => readFile(path.join(targetDir, file), 'utf8')));
  assert.ok(source.every(file => !file.includes('virtual:pwa-register')));
});

test('invalid PWA strategy and update choices are rejected before writing', async t => {
  const parent = await tempDir(t);
  const targetDir = path.join(parent, 'pwa-app');
  for (const values of [{ pwaStrategy: 'invalid', pwaUpdate: 'prompt' }, { pwaStrategy: 'generateSW', pwaUpdate: 'invalid' }]) {
    await assert.rejects(generateProject({ ...base, targetDir, architecture: 'Type-Based', language: 'JavaScript', pwa: true, ...values }), /Invalid/);
    assert.deepEqual(await readdir(parent), [], 'invalid inputs must not create a destination');
  }
});

let caseNumber = 0;
for (const language of ['JavaScript', 'TypeScript']) {
  for (const pwaStrategy of ['generateSW', 'injectManifest']) {
    for (const pwaUpdate of ['prompt', 'autoUpdate']) {
      const architecture = architectures[caseNumber++ % architectures.length];
      test(`PWA production build ${pwaStrategy} / ${pwaUpdate} / ${language} / ${architecture}`, { timeout: 600000 }, async t => {
        const parent = await tempDir(t);
        const targetDir = path.join(parent, 'pwa-app');
        const formatter = language === 'TypeScript' && pwaStrategy === 'injectManifest' && pwaUpdate === 'prompt' ? 'Biome' : 'Prettier';
        await generateProject({ ...base, targetDir, architecture, language, pwa: true, pwaStrategy, pwaUpdate, formatter });
        const config = await readFile(path.join(targetDir, 'vite.config.js'), 'utf8');
        const pkg = JSON.parse(await readFile(path.join(targetDir, 'package.json'), 'utf8'));
        assert.match(config, new RegExp(`strategies:\\s*['"]${pwaStrategy}['"]`));
        assert.match(config, new RegExp(`registerType:\\s*['"]${pwaUpdate}['"]`));
        const files = await filesUnder(targetDir);
        const sourceFiles = files.filter(file => /^src\/.*\.[jt]sx?$/.test(file));
        const sources = (await Promise.all(sourceFiles.map(file => readFile(path.join(targetDir, file), 'utf8')))).join('\n');
        assert.match(sources, /virtual:pwa-register(?:\/react)?/, 'worker registration code must exist');
        if (pwaStrategy === 'injectManifest') {
          assert.match(sources, /__WB_MANIFEST/, 'custom worker needs the precache injection point');
          assert.match(sources, /workbox-precaching/, 'custom worker should precache assets');
          assert.ok(pkg.dependencies?.['workbox-precaching'] || pkg.devDependencies?.['workbox-precaching']);
        } else {
          assert.doesNotMatch(sources, /__WB_MANIFEST/, 'generateSW must not create custom worker');
        }
        if (pwaUpdate === 'prompt') {
          assert.match(sources, /(?:needRefresh|onNeedRefresh)/, 'prompt must react to a waiting worker');
          assert.match(sources, /(?:updateServiceWorker|updateSW)/, 'prompt must actually activate updates');
        } else {
          assert.match(sources, /(?:registerSW|useRegisterSW)/, 'autoUpdate must register through a virtual module');
        }
        try {
          runNpm(['install', '--no-audit', '--no-fund'], targetDir);
          runNpm(['run', 'build'], targetDir);
          if (formatter === 'Biome') runNpm(['run', 'lint'], targetDir);
          if (language === 'JavaScript' && pwaStrategy === 'injectManifest' && pwaUpdate === 'prompt') {
            runNpm(['run', 'format'], targetDir);
            runNpm(['run', 'format:check'], targetDir);
          }
        } catch (error) {
          assert.fail(`install/build failed: ${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`);
        }
        const distFiles = await filesUnder(path.join(targetDir, 'dist'));
        assert.ok(distFiles.includes('sw.js'), `missing built worker: ${distFiles.join(', ')}`);
        const html = await readFile(path.join(targetDir, 'dist/index.html'), 'utf8');
        assert.match(html, /manifest/i, 'built HTML must link to web app manifest');
        assert.ok(distFiles.some(file => file.endsWith('.webmanifest')), 'missing manifest');
        assert.ok((await stat(path.join(targetDir, 'dist/pwa-192x192.png'))).isFile());
        assert.ok((await stat(path.join(targetDir, 'dist/pwa-512x512.png'))).isFile());
        const builtScripts = (await Promise.all(distFiles.filter(file => /^assets\/.*\.js$/.test(file)).map(file => readFile(path.join(targetDir, 'dist', file), 'utf8')))).join('\n');
        assert.match(builtScripts, /serviceWorker/, 'built client must contain service worker registration');
      });
    }
  }
}
