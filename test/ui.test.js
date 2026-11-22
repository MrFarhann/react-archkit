import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateProject } from '../src/generator.js';

const architectures = ['Type-Based', 'Feature-Based', 'Domain-Based', 'Feature-Sliced Design (FSD)', 'Atomic Design'];
const languages = ['JavaScript', 'TypeScript'];
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const groups = await Promise.all(entries.map(async entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : /\.[jt]sx?$/.test(file) ? [file] : [];
  }));
  return groups.flat();
}

test('UI scaffolds accessible task controls, real shadcn components and attribution across architectures', { timeout: 120000 }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-ui-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  for (const [architectureIndex, architecture] of architectures.entries()) {
    for (const language of languages) {
      for (const shadcn of [false, true]) {
        const id = `${architectureIndex}-${language}-${shadcn}`;
        const targetDir = path.join(root, id);
        await generateProject({ projectName: 'ui-test', targetDir, architecture, naming: 'kebab-case', language, tailwind: shadcn, shadcn });
        const [pkgRaw, readme, css, names] = await Promise.all([
          readFile(path.join(targetDir, 'package.json'), 'utf8'),
          readFile(path.join(targetDir, 'README.md'), 'utf8'),
          readFile(path.join(targetDir, 'src', 'index.css'), 'utf8'),
          readdir(targetDir),
        ]);
        const pkg = JSON.parse(pkgRaw);
        const uiDir = architecture === 'Feature-Sliced Design (FSD)' ? 'shared' : 'components';
        const ext = language === 'TypeScript' ? 'tsx' : 'jsx';
        const paths = await sourceFiles(path.join(targetDir, 'src'));
        const applicationPaths = paths.filter(file => !file.replaceAll('\\', '/').includes(`/${uiDir}/ui/`));
        const app = (await Promise.all(applicationPaths.map(file => readFile(file, 'utf8')))).join('\n');
        const label = `${architecture} / ${language} / ${shadcn ? 'shadcn' : 'plain'}`;

        assert.match(app, /htmlFor="task-title"/, label);
        assert.match(app, /aria-pressed=\{(?:task\.)?completed\}/, label);
        assert.match(app, /Mark incomplete:/, label);
        assert.match(app, /Mark complete:/, label);
        assert.match(app, /completedCount/, label);
        assert.match(app, /taskCount/, label);
        assert.match(css, /:focus-visible/, label);
        assert.match(readme, /https:\/\/react\.dev\//, label);
        assert.match(readme, /https:\/\/vite\.dev\//, label);
        assert.doesNotMatch(css, /@import\s+url\(|fonts\.googleapis\.com/i, label);

        if (shadcn) {
          assert.ok(pkg.dependencies['@radix-ui/react-slot'], label);
          for (const component of ['button', 'input', 'card']) {
            assert.match(app, new RegExp(`@/${uiDir}/ui/${component}`), `${label}: app imports ${component}`);
            assert.ok(paths.some(file => file.replaceAll('\\', '/').endsWith(`/${uiDir}/ui/${component}.${ext}`)), `${label}: ${component} exists`);
          }
          assert.ok(names.includes('THIRD_PARTY_NOTICES.md'), label);
          const notice = await readFile(path.join(targetDir, 'THIRD_PARTY_NOTICES.md'), 'utf8');
          assert.match(notice, /Copyright \(c\) 2023 shadcn/);
          assert.match(notice, /Permission is hereby granted/);
          assert.match(readme, /https:\/\/ui\.shadcn\.com\//, label);
        } else {
          assert.equal(pkg.dependencies['@radix-ui/react-slot'], undefined, label);
          assert.ok(!names.includes('THIRD_PARTY_NOTICES.md'), label);
          assert.doesNotMatch(app, /@\/(?:shared|components)\/ui\/(?:button|input|card)/, label);
        }
      }
    }
  }
});

test('installed package generates shadcn components with upstream license notice', { timeout: 300000 }, async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'archkit-ui-packed-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const npm = (args, cwd) => execFileSync(process.execPath, [npmCli, ...args], {
    cwd, encoding: 'utf8', stdio: 'pipe', timeout: 180000,
    env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' },
  });
  const [{ filename }] = JSON.parse(npm(['pack', '--json', '--pack-destination', dir], projectRoot));
  const prefix = path.join(dir, 'consumer');
  npm(['install', '--prefix', prefix, '--no-audit', '--no-fund', path.join(dir, filename)], dir);
  const packageRoot = path.join(prefix, 'node_modules', 'create-react-archkit');
  const { generateProject: generateInstalledProject } = await import(pathToFileURL(path.join(packageRoot, 'src', 'generator.js')).href);
  const targetDir = path.join(dir, 'app');
  await generateInstalledProject({ projectName: 'app', targetDir, architecture: 'Type-Based', naming: 'kebab-case', language: 'TypeScript', tailwind: true, shadcn: true });
  const [notice, input, card] = await Promise.all([
    readFile(path.join(targetDir, 'THIRD_PARTY_NOTICES.md'), 'utf8'),
    readFile(path.join(targetDir, 'src', 'components', 'ui', 'input.tsx'), 'utf8'),
    readFile(path.join(targetDir, 'src', 'components', 'ui', 'card.tsx'), 'utf8'),
  ]);
  assert.match(notice, /Copyright \(c\) 2023 shadcn/);
  assert.match(notice, /Permission is hereby granted/);
  assert.match(notice, /THE SOFTWARE IS PROVIDED/);
  assert.match(input, /function Input/);
  assert.match(card, /function Card/);
});
