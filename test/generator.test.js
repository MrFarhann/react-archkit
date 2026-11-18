import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { generateProject, validateProjectName } from '../src/generator.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const architectures = ['Type-Based', 'Feature-Based', 'Domain-Based', 'Feature-Sliced Design (FSD)', 'Atomic Design']
const languages = ['TypeScript', 'JavaScript']
const styles = [
  { name: 'CSS', tailwind: false, shadcn: false },
  { name: 'Tailwind', tailwind: true, shadcn: false },
  { name: 'shadcn', tailwind: true, shadcn: true },
]
const conventions = ['kebab-case', 'camelCase', 'PascalCase', 'snake_case', 'UPPER_CASE']
const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
const runNpm = (args, cwd) => execFileSync(process.execPath, [npmCli, ...args], {
  cwd, encoding: 'utf8', stdio: 'pipe', timeout: 300000,
  env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' },
})
async function tempDir(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'react-archkit-test-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  return dir
}
async function walk(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return (await Promise.all(entries.map(async entry => {
    const absolute = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(absolute, base) : [path.relative(base, absolute).replaceAll('\\', '/')]
  }))).flat()
}
async function checkImports(project, files) {
  const set = new Set(files)
  for (const file of files.filter(f => /\.[jt]sx?$/.test(f) && f.startsWith('src/'))) {
    const source = await readFile(path.join(project, file), 'utf8')
    const imports = [...source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)].map(m => m[1])
    for (const specifier of imports) {
      if (!specifier.startsWith('.') && !specifier.startsWith('@/')) continue
      const resolved = specifier.startsWith('@/')
        ? path.posix.join('src', specifier.slice(2))
        : path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier))
      assert.ok([resolved, ...['.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx', '/index.ts', '/index.tsx'].map(ext => resolved + ext)].some(candidate => set.has(candidate)), `${file}: cannot resolve ${specifier}`)
    }
  }
}

test('pnpm installs and builds a fresh project without a build-approval prompt', { timeout: 300000 }, async t => {
  const version = spawnSync('pnpm --version', { shell: true, encoding: 'utf8' })
  if (version.status !== 0) return t.skip('pnpm is not available on PATH')
  const dir = await tempDir(t)
  const targetDir = path.join(dir, 'pnpm-app')
  await generateProject({ projectName: 'pnpm-app', targetDir, architecture: 'Type-Based', naming: 'kebab-case', language: 'JavaScript', tailwind: false, shadcn: false })
  const run = command => spawnSync(command, { cwd: targetDir, shell: true, encoding: 'utf8', timeout: 180000, env: { ...process.env, CI: 'true' } })
  const install = run('pnpm install --reporter=append-only')
  const output = `${install.stdout || ''}\n${install.stderr || ''}`
  assert.equal(install.status, 0, output)
  assert.doesNotMatch(output, /approve-builds|ignored build scripts|ignored: esbuild|pnpm.onlyBuiltDependencies.*ignored|pnpm.*no longer read/i)
  const build = run('pnpm run build')
  assert.equal(build.status, 0, `${build.stdout || ''}\n${build.stderr || ''}`)
})

test('existing destination is not overwritten', async t => {
  const dir = await tempDir(t)
  const targetDir = path.join(dir, 'sample-app')
  await mkdir(targetDir)
  await writeFile(path.join(targetDir, 'keep.txt'), 'existing user data')
  await assert.rejects(generateProject({ projectName: 'sample-app', targetDir, architecture: 'Type-Based', naming: 'kebab-case', language: 'JavaScript', tailwind: false, shadcn: false }))
  assert.equal(await readFile(path.join(targetDir, 'keep.txt'), 'utf8'), 'existing user data')
  assert.deepEqual(await readdir(targetDir), ['keep.txt'])
})

test('project name validation rejects unsafe and invalid names', () => {
  for (const name of ['', '../escape', '/absolute', 'UPPER', 'has spaces', 'con', 'node_modules', 'ends.']) {
    assert.throws(() => validateProjectName(name), undefined, `rejected ${name}`)
  }
  assert.equal(validateProjectName('my-app'), 'my-app')
})

test('failed generation removes only files and directories created by that run', async t => {
  const dir = await tempDir(t)
  const targetDir = path.join(dir, 'sample-app')
  const sentinel = path.join(dir, 'keep.txt')
  await writeFile(sentinel, 'existing user data')
  const script = `
    import fs from 'node:fs/promises';
    import { syncBuiltinESMExports } from 'node:module';
    const original = fs.open;
    let writes = 0;
    fs.open = async (...args) => {
      const handle = await original(...args);
      if (++writes === 3) handle.writeFile = async () => { throw new Error('injected failure') };
      return handle;
    };
    syncBuiltinESMExports();
    const { generateProject } = await import(${JSON.stringify(pathToFileURL(path.join(root, 'src/generator.js')).href)});
    try {
      await generateProject({ projectName: 'sample-app', targetDir: ${JSON.stringify(targetDir)}, architecture: 'Type-Based', naming: 'kebab-case', language: 'JavaScript', tailwind: false, shadcn: false });
      process.exitCode = 1;
    } catch (error) {
      if (error.message !== 'injected failure') throw error;
    }
  `
  execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: dir, encoding: 'utf8' })
  assert.deepEqual(await readdir(dir), ['keep.txt'])
  assert.equal(await readFile(sentinel, 'utf8'), 'existing user data')
})

for (const architecture of architectures) {
  for (const language of languages) {
    for (const style of styles) {
      test(`build ${architecture} / ${language} / ${style.name}`, { timeout: 600000 }, async t => {
        const dir = await tempDir(t)
        const targetDir = path.join(dir, 'sample-app')
        await generateProject({ projectName: 'sample-app', targetDir, architecture, naming: 'kebab-case', language, tailwind: style.tailwind, shadcn: style.shadcn })
        const files = await walk(targetDir)
        assert.ok(files.includes('.gitignore'), 'generated .gitignore')
        assert.ok(files.includes('README.md'))
        assert.ok(files.includes('package.json'))
        assert.equal(files.includes('components.json'), style.shadcn)
        assert.ok(files.some(f => f.endsWith(language === 'TypeScript' ? '.tsx' : '.jsx')))
        await checkImports(targetDir, files)
        try {
          runNpm(['install', '--no-audit', '--no-fund'], targetDir)
          runNpm(['run', 'build'], targetDir)
        } catch (error) {
          assert.fail(`install/build failed: ${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`)
        }
        assert.ok((await stat(path.join(targetDir, 'dist/index.html'))).isFile())
      })
    }
  }
}

for (const naming of conventions) {
  test(`naming convention ${naming} resolves all imports`, async t => {
    const dir = await tempDir(t)
    for (const [index, architecture] of architectures.entries()) {
      const targetDir = path.join(dir, `sample-${index}`)
      await generateProject({ projectName: `sample-${index}`, targetDir, architecture, naming, language: 'TypeScript', tailwind: true, shadcn: false })
      const files = await walk(targetDir)
      await checkImports(targetDir, files)
      const sources = files.filter(file => file.startsWith('src/'))
      assert.ok(sources.length > 3)
    const examples = {
      'kebab-case': /task-(?:list|form|item)/,
      camelCase: /task(?:List|Form|Item)/,
      PascalCase: /Task(?:List|Form|Item)/,
      snake_case: /task_(?:list|form|item)/,
      UPPER_CASE: /TASK_(?:LIST|FORM|ITEM)/,
    }
      assert.ok(sources.some(file => examples[naming].test(file)), `expected ${naming} example in ${architecture}: ${sources.join(', ')}`)
    }
  })
}

test('published tarball installs and exposes the CLI in an isolated directory', { timeout: 300000 }, async t => {
  const dir = await tempDir(t)
  const packOutput = runNpm(['pack', '--json', '--pack-destination', dir], root)
  const [{ filename }] = JSON.parse(packOutput)
  const tarball = path.join(dir, filename)
  const isolated = path.join(dir, 'consumer')
  // npm install creates the prefix as needed; do not link to the repository.
  runNpm(['install', '--prefix', isolated, '--no-audit', '--no-fund', tarball], dir)
  const packageDir = path.join(isolated, 'node_modules', 'create-react-archkit')
  const metadata = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8'))
  const entry = typeof metadata.bin === 'string' ? metadata.bin : metadata.bin['create-react-archkit']
  assert.ok(entry)
  const output = execFileSync(process.execPath, [path.join(packageDir, entry), '--help'], { cwd: dir, encoding: 'utf8', timeout: 30000 })
  assert.match(output, /create-react-archkit/i)
  assert.ok((await readFile(path.join(packageDir, entry), 'utf8')).startsWith('#!'))
  const packedGenerator = await import(pathToFileURL(path.join(packageDir, 'src/generator.js')).href)
  const targetDir = path.join(dir, 'packed-project')
  await packedGenerator.generateProject({ projectName: 'packed-project', targetDir, architecture: 'Type-Based', naming: 'kebab-case', language: 'JavaScript', tailwind: false, shadcn: false })
  assert.ok((await stat(path.join(targetDir, '.gitignore'))).isFile())
  runNpm(['install', '--no-audit', '--no-fund'], targetDir)
  runNpm(['run', 'build'], targetDir)
})
