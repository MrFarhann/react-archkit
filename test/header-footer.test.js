import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generateProject } from '../src/generator.js';

const architectures = ['Type-Based', 'Feature-Based', 'Domain-Based', 'Feature-Sliced Design (FSD)', 'Atomic Design'];

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const children = await Promise.all(entries.map(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : /\.[jt]sx?$/.test(entry.name) ? [file] : [];
  }));
  return children.flat();
}

function checkAttribution(source, label) {
  assert.match(source, /Developed by/,
    `${label}: developer credit is present`);
  assert.match(source, /href=["']https:\/\/github\.com\/MrFarhann["']/,
    `${label}: developer credit links to the requested GitHub profile`);
  assert.match(source, /Farhan\s*\(@MrFarhann\)/,
    `${label}: developer name is visible`);
}

test('starter and Router routes have a single branded header and developer credit', { timeout: 120000 }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-header-footer-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  for (const [index, architecture] of architectures.entries()) {
    for (const language of ['JavaScript', 'TypeScript']) {
      for (const shadcn of [false, true]) {
        for (const router of [false, true]) {
          const label = `${architecture} / ${language} / ${shadcn ? 'shadcn' : 'CSS'} / ${router ? 'Router' : 'no Router'}`;
          const targetDir = path.join(root, `${index}-${language}-${shadcn}-${router}`);
          const tanstack = router ? ['router', 'query'] : ['query'];
          await generateProject({ projectName: 'header-test', targetDir, architecture, naming: 'kebab-case', language, tailwind: shadcn, shadcn, tanstack });
          const files = await sourceFiles(path.join(targetDir, 'src'));
          const modules = await Promise.all(files.map(async file => ({ file, source: await readFile(file, 'utf8') })));
          const shell = modules.find(({ source }) => source.includes('className="page-shell"') && source.includes('className="app"'));
          assert.ok(shell, `${label}: home shell exists`);
          checkAttribution(shell.source, `${label} home`);
          const shellHeaders = (shell.source.match(/<header className="topbar"/g) || []).length;

          const ext = language === 'TypeScript' ? 'tsx' : 'jsx';
          const routeRoot = modules.find(({ file }) => file === path.join(targetDir, 'src', 'routes', `__root.${ext}`));
          if (!router) {
            assert.equal(shellHeaders, 1, `${label}: standalone app supplies exactly one header`);
            assert.equal(routeRoot, undefined, `${label}: no Router layout generated`);
            assert.doesNotMatch(shell.source, /className="topbar-nav"/, `${label}: no unusable Router links`);
            continue;
          }

          assert.equal(shellHeaders, 0, `${label}: routed home does not duplicate the header`);
          assert.ok(routeRoot, `${label}: Router root exists`);
          assert.equal((routeRoot.source.match(/<header className="topbar"/g) || []).length, 1, `${label}: Router supplies exactly one shared header`);
          assert.match(routeRoot.source, /<Link\b[^>]*to="\/"[^>]*>Home<\/Link>/);
          assert.match(routeRoot.source, /<Link\b[^>]*to="\/about"[^>]*>About<\/Link>/);
          assert.match(routeRoot.source, /<Outlet\s*\/>/, `${label}: shared header wraps route content`);
          const about = modules.find(({ file }) => file === path.join(targetDir, 'src', 'routes', `about.${ext}`));
          assert.ok(about, `${label}: About route exists`);
          checkAttribution(about.source, `${label} about`);
          assert.equal((about.source.match(/<footer className="footer"/g) || []).length, 1, `${label}: About has one footer`);
        }
      }
    }
  }
});
