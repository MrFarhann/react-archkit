import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generateProject } from '../src/generator.js';

test('form validation is outside the input row and remains accessible in generated variants', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archkit-form-layout-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const language of ['JavaScript', 'TypeScript']) {
    for (const shadcn of [false, true]) {
      const targetDir = path.join(root, `${language}-${shadcn}`);
      await generateProject({ projectName: 'form-test', targetDir, architecture: 'Type-Based', naming: 'kebab-case', language, tailwind: shadcn, shadcn, tanstack: ['form'] });
      const ext = language === 'TypeScript' ? 'tsx' : 'jsx';
      const source = await readFile(path.join(targetDir, 'src', `tanstack-examples.${ext}`), 'utf8');
      const css = await readFile(path.join(targetDir, 'src', 'index.css'), 'utf8');
      const field = source.indexOf('className="tanstack-form-field"');
      const endOfField = source.indexOf('</div>', field);
      const submit = source.indexOf('type="submit"', endOfField);
      const error = source.indexOf('id="tanstack-example-name-error"', endOfField);
      assert.ok(field >= 0 && endOfField > field, `${language}/${shadcn}: input group exists`);
      assert.ok(submit > endOfField && error > submit, `${language}/${shadcn}: action and error follow the input group`);
      assert.match(source.slice(field, endOfField), /htmlFor="tanstack-example-name"/);
      assert.match(source.slice(field, endOfField), /aria-describedby=/);
      assert.match(source.slice(error, error + 100), /role="alert"/);
      assert.match(css, /\.tanstack-field-error\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
      assert.match(css, /\.tanstack-form\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
      assert.match(css, /@media\s*\(max-width:\s*460px\)[\s\S]*?\.tanstack-form\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    }
  }
});
