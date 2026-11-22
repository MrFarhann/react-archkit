import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generateProject } from '../src/generator.js';

const architectures = ['Type-Based', 'Feature-Based', 'Domain-Based', 'Feature-Sliced Design (FSD)', 'Atomic Design'];
const tools = ['router', 'query', 'table', 'charts', 'form', 'virtual', 'store'];

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = await Promise.all(entries.map(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : /\.[jt]sx?$/.test(entry.name) ? [file] : [];
  }));
  return results.flat();
}

test('TanStack examples belong before the footer across generated app variants', { timeout: 120000 }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-tanstack-layout-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  for (const [index, architecture] of architectures.entries()) {
    for (const language of ['JavaScript', 'TypeScript']) {
      for (const shadcn of [false, true]) {
        const targetDir = path.join(root, `${index}-${language}-${shadcn}`);
        const label = `${architecture} / ${language} / ${shadcn ? 'shadcn' : 'CSS'}`;
        await generateProject({ projectName: 'layout-test', targetDir, architecture, naming: 'kebab-case', language, tailwind: shadcn, shadcn, tanstack: tools });
        const paths = await sourceFiles(path.join(targetDir, 'src'));
        const sources = await Promise.all(paths.map(file => readFile(file, 'utf8')));
        const application = paths.map((file, i) => ({ file, source: sources[i] }));
        const shell = application.find(({ source }) => source.includes('className="page-shell"') && (source.includes('<TanStackExamples') || source.includes('{examples}')));
        assert.ok(shell, `${label}: shell exists`);
        const footer = shell.source.indexOf('<footer');
        const directExamples = shell.source.indexOf('<TanStackExamples');
        const slot = shell.source.indexOf('{examples}');
        const position = directExamples >= 0 ? directExamples : slot;
        assert.ok(position >= 0 && position < footer, `${label}: examples render before the footer`);
        const mounts = sources.join('\n').match(/<TanStackExamples\s*\/>/g) || [];
        assert.equal(mounts.length, 1, `${label}: examples mounted once`);
        const ext = language === 'TypeScript' ? 'tsx' : 'jsx';
        const examples = await readFile(path.join(targetDir, 'src', `tanstack-examples.${ext}`), 'utf8');
        if (shadcn) {
          const uiBase = architecture === 'Feature-Sliced Design (FSD)' ? 'shared' : 'components';
          for (const component of ['button', 'input', 'card']) {
            assert.match(examples, new RegExp(`@/${uiBase}/ui/${component}`), `${label}: examples import ${component}`);
          }
        } else {
          assert.doesNotMatch(examples, /@\/(?:components|shared)\/ui\//, `${label}: plain examples require no shadcn components`);
        }
        const main = await readFile(path.join(targetDir, 'src', `main.${ext}`), 'utf8');
        assert.doesNotMatch(main, /<TanStackExamples\s*\/>/, `${label}: no extra mount after the application`);
        assert.match(main, /<QueryClientProvider\b[\s\S]*<RouterProvider\b[\s\S]*<\/QueryClientProvider>/, `${label}: Query wraps Router`);
        const pkg = JSON.parse(await readFile(path.join(targetDir, 'package.json'), 'utf8'));
        const allImports = sources.join('\n') + await readFile(path.join(targetDir, 'vite.config.js'), 'utf8');
        for (const match of allImports.matchAll(/(?:from\s*|import\s*)['"](@tanstack\/[^/'"]+)/g)) {
          assert.ok(pkg.dependencies[match[1]] || pkg.devDependencies[match[1]], `${label}: ${match[1]} declared`);
        }
      }
    }
  }
});

test('no examples are mounted without an example tool', { timeout: 120000 }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-tanstack-empty-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [index, architecture] of architectures.entries()) {
    for (const [caseName, tanstack] of [['none', []], ['router-only', ['router']]]) {
      const targetDir = path.join(root, `${index}-${caseName}`);
      await generateProject({ projectName: 'empty-test', targetDir, architecture, naming: 'kebab-case', language: 'TypeScript', tailwind: false, shadcn: false, tanstack });
      const files = await sourceFiles(path.join(targetDir, 'src'));
      assert.ok(!files.some(file => /tanstack-examples\.[jt]sx$/.test(file)), `${architecture} / ${caseName}: no example file`);
      const source = (await Promise.all(files.map(file => readFile(file, 'utf8')))).join('\n');
      assert.doesNotMatch(source, /TanStackExamples/, `${architecture} / ${caseName}: no example import`);
    }
  }
});

test('TanStack example controls are labelled and mobile-safe', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-tanstack-controls-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const shadcn of [false, true]) {
    const targetDir = path.join(root, shadcn ? 'shadcn' : 'plain');
    await generateProject({ projectName: 'controls-test', targetDir, architecture: 'Type-Based', naming: 'kebab-case', language: 'TypeScript', tailwind: shadcn, shadcn, tanstack: tools });
    const examples = await readFile(path.join(targetDir, 'src', 'tanstack-examples.tsx'), 'utf8');
    const css = await readFile(path.join(targetDir, 'src', 'index.css'), 'utf8');
    assert.match(examples, /htmlFor="tanstack-example-name"/);
    assert.match(examples, /aria-describedby=/);
    assert.match(examples, /role="alert"/);
    assert.match(examples, /role="status"/);
    assert.match(examples, /aria-label="Virtualized example list"/);
    assert.match(examples, /tabIndex=\{0\}/);
    assert.match(examples, /ariaLabel="Tasks completed each week"/);
    const exampleStyles = css.slice(css.indexOf('/* Optional TanStack starter examples */'));
    assert.match(exampleStyles, /@media\s*\(max-width:/);
    assert.match(exampleStyles, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    assert.match(exampleStyles, /\.tanstack-table-scroll\s*\{[^}]*overflow-x:\s*auto/);
    assert.match(exampleStyles, /\.tanstack-chart\s*\{[^}]*overflow-x:\s*auto/);
    if (shadcn) {
      assert.match(examples, /@\/components\/ui\/(?:button|input|card)/);
    } else {
      assert.doesNotMatch(examples, /@\/(?:components|shared)\/ui\//);
    }
  }
});
