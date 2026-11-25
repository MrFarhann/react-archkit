import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm, stat, symlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateProject } from '../src/generator.js'

const architectures = ['Type-Based', 'Feature-Based', 'Domain-Based', 'Feature-Sliced Design (FSD)', 'Atomic Design']
const packages = {
  router: '@tanstack/react-router',
  query: '@tanstack/react-query',
  table: '@tanstack/react-table',
  charts: '@tanstack/charts',
  form: '@tanstack/react-form',
  virtual: '@tanstack/react-virtual',
  store: '@tanstack/react-store',
}
const selections = Object.keys(packages)
const cli = fileURLToPath(new URL('../bin/cli.js', import.meta.url))
const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')

async function fixture(t, overrides = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'archkit-tanstack-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const targetDir = path.join(dir, 'example-app')
  await generateProject({
    projectName: 'example-app', targetDir, architecture: 'Type-Based', naming: 'kebab-case',
    language: 'JavaScript', tailwind: false, shadcn: false, tanstack: [], ...overrides,
  })
  return targetDir
}

async function filesBelow(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(entries.map(async entry => {
    const name = path.join(dir, entry.name)
    return entry.isDirectory() ? filesBelow(name) : [name]
  }))
  return files.flat()
}

async function npm(args, cwd) {
  try {
    return execFileSync(process.execPath, [npmCli, ...args], {
      cwd, encoding: 'utf8', stdio: 'pipe', timeout: 300000,
      env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' },
    })
  } catch (error) {
    assert.fail(`npm ${args.join(' ')} failed: ${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`)
  }
}

async function verifyDeclaredTanStackImports(target, pkg) {
  const sourceFiles = (await filesBelow(path.join(target, 'src'))).filter(file => /\.[jt]sx?$/.test(file))
  sourceFiles.push(path.join(target, 'vite.config.js'))
  const source = (await Promise.all(sourceFiles.map(file => readFile(file, 'utf8')))).join('\n')
  for (const match of source.matchAll(/(?:from\s*|import\s*)['"](@tanstack\/[^/'"]+)/g)) {
    assert.ok(pkg.dependencies[match[1]] || pkg.devDependencies[match[1]], `${match[1]} is imported but not declared`)
  }
  return source
}

test('TanStack tools are opt-in and each selection adds only its own React package', async t => {
  const empty = await fixture(t)
  const baseline = JSON.parse(await readFile(path.join(empty, 'package.json'), 'utf8'))
  for (const name of Object.values(packages)) {
    assert.equal(baseline.dependencies[name], undefined, `${name} must not be added by default`)
  }

  for (const selected of selections) {
    const target = await fixture(t, { tanstack: [selected] })
    const pkg = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'))
    for (const [id, name] of Object.entries(packages)) {
      assert.equal(Boolean(pkg.dependencies[name]), id === selected, `${selected}: dependency ${name}`)
    }
    const source = await verifyDeclaredTanStackImports(target, pkg)
    assert.ok(source.includes(packages[selected]), `${selected} should have usable source code importing ${packages[selected]}`)
  }
})

test('all TanStack selection combinations declare their actual dependencies', { timeout: 120000 }, async t => {
  for (let mask = 0; mask < (1 << selections.length); mask++) {
    const tanstack = selections.filter((_, index) => mask & (1 << index))
    const target = await fixture(t, { tanstack })
    const pkg = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'))
    for (const [id, name] of Object.entries(packages)) {
      assert.equal(Boolean(pkg.dependencies[name]), tanstack.includes(id), `${tanstack.join(',')}: dependency ${name}`)
    }
    await verifyDeclaredTanStackImports(target, pkg)
  }
})

test('invalid or duplicate TanStack selections fail before files are written', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'archkit-tanstack-invalid-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  for (const [index, tanstack] of ['query', ['router', 'router'], ['not-a-tool'], [null]].entries()) {
    const targetDir = path.join(dir, `invalid-${index}`)
    await assert.rejects(generateProject({
      projectName: `invalid-${index}`, targetDir, architecture: 'Type-Based', naming: 'kebab-case',
      language: 'JavaScript', tailwind: false, shadcn: false, tanstack,
    }))
  }
  assert.deepEqual(await readdir(dir), [])
})

async function runCheckboxInterview(cwd, cliPath, keys, hasForm = false) {
  const steps = [
    ['Do you want a Progressive Web App (PWA)?', '\x1b[B\r'],
    ['Which architecture do you want?', '\r'],
    ['Which file and folder naming convention do you want?', '\r'],
    ['Which language do you want?', '\r'],
    ['Do you want Tailwind CSS?', '\x1b[B\r'],
    ['Which formatter do you want?', '\r'],
    ['Do you want Axios?', '\x1b[B\r'],
    ['Do you want Graphify?', '\x1b[B\r'],
    ['Which testing tools do you want?', '\x1b[B\r'],
    ['Which TanStack tools do you want to use?', keys],
    ...(!hasForm ? [['Which form management library do you want?', '\r']] : []),
    ['Do you want Zod schema validation?', '\r'],
    ['Which state management library do you want?', '\r'],
    ['Create this project?', '\r'],
  ]
  const child = spawn(process.execPath, [cliPath, 'sample-app'], {
    cwd, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, FORCE_COLOR: '0', TERM: 'dumb' },
  })
  const { output, code } = await new Promise((resolve, reject) => {
    let output = '', step = 0, searchFrom = 0
    const timer = setTimeout(() => { child.kill(); reject(new Error(`Interview timed out at ${steps[step]?.[0]}:\n${output}`)) }, 20000)
    const onData = chunk => {
      output += chunk.toString()
      if (step >= steps.length) return
      const index = output.indexOf(steps[step][0], searchFrom)
      if (index < 0) return
      searchFrom = index + steps[step][0].length
      const answer = steps[step++][1]
      setTimeout(() => child.stdin.write(answer), 50)
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('error', error => { clearTimeout(timer); reject(error) })
    child.on('exit', code => { clearTimeout(timer); resolve({ output, code }) })
  })
  assert.equal(code, 0, output)
  return output
}

test('CLI checkbox can select Query and Form together', { timeout: 30000 }, async t => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'archkit-tanstack-cli-'))
  t.after(() => rm(cwd, { recursive: true, force: true }))
  const output = await runCheckboxInterview(cwd, cli, '\x1b[B \x1b[B\x1b[B\x1b[B \r', true)
  const pkg = JSON.parse(await readFile(path.join(cwd, 'sample-app', 'package.json'), 'utf8'))
  assert.ok(pkg.dependencies[packages.query], output)
  assert.ok(pkg.dependencies[packages.form], output)
  for (const id of ['router', 'table', 'charts', 'virtual', 'store']) {
    assert.equal(pkg.dependencies[packages[id]], undefined, output)
  }
})

test('packed CLI installs and generates a project with Router and Charts', { timeout: 300000 }, async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'archkit-tanstack-packed-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const [{ filename }] = JSON.parse(await npm(['pack', '--json', '--pack-destination', dir], projectRoot))
  const prefix = path.join(dir, 'consumer')
  await npm(['install', '--prefix', prefix, '--no-audit', '--no-fund', path.join(dir, filename)], dir)
  const installed = path.join(prefix, 'node_modules', 'create-react-archkit')
  const metadata = JSON.parse(await readFile(path.join(installed, 'package.json'), 'utf8'))
  const entry = typeof metadata.bin === 'string' ? metadata.bin : metadata.bin['create-react-archkit']
  assert.ok(entry, 'installed package must expose the CLI')
  const output = await runCheckboxInterview(dir, path.join(installed, entry), ' \x1b[B\x1b[B\x1b[B \r')
  const target = path.join(dir, 'sample-app')
  const pkg = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'))
  assert.ok(pkg.dependencies[packages.router], output)
  assert.ok(pkg.dependencies[packages.charts], output)
  for (const id of ['query', 'table', 'form', 'virtual', 'store']) assert.equal(pkg.dependencies[packages[id]], undefined, output)
  const routeFiles = await filesBelow(path.join(target, 'src', 'routes'))
  const routeSource = (await Promise.all(routeFiles.map(file => readFile(file, 'utf8')))).join('\n')
  assert.match(routeSource, /createFileRoute\(['"]\/['"]\)/)
  assert.match(routeSource, /createFileRoute\(['"]\/about['"]\)/)
  const examples = await readFile(path.join(target, 'src', 'tanstack-examples.tsx'), 'utf8')
  assert.match(examples, /@tanstack\/charts/)
})

test('Router creates a home page and an about page for every architecture', async t => {
  for (const [index, architecture] of architectures.entries()) {
    const target = await fixture(t, { architecture, language: index % 2 ? 'JavaScript' : 'TypeScript', tanstack: ['router'] })
    const routes = await filesBelow(path.join(target, 'src', 'routes'))
    const source = (await Promise.all(routes.map(file => readFile(file, 'utf8')))).join('\n')
    assert.match(source, /createFileRoute\(['"]\/['"]\)/)
    assert.match(source, /createFileRoute\(['"]\/about['"]\)/)
    assert.match(source, /\bApp\b/, `${architecture}: home should render the generated task app`)
    assert.match(source, /\bLink\b/, `${architecture}: routes should be navigable`)
  }
})

test('Router imports resolve across every architecture, naming convention, and language', { timeout: 120000 }, async t => {
  const conventions = ['kebab-case', 'camelCase', 'PascalCase', 'snake_case', 'UPPER_CASE']
  for (const architecture of architectures) {
    for (const naming of conventions) {
      for (const language of ['JavaScript', 'TypeScript']) {
        const target = await fixture(t, { architecture, naming, language, tanstack: ['router'] })
        const allFiles = await filesBelow(path.join(target, 'src'))
        const existing = new Set(allFiles.map(file => path.relative(target, file).replaceAll('\\', '/')))
        for (const file of allFiles.filter(file => /\.[jt]sx?$/.test(file))) {
          const sourceFile = path.relative(target, file).replaceAll('\\', '/')
          const source = await readFile(file, 'utf8')
          for (const match of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
            const specifier = match[1]
            if (!specifier.startsWith('.') && !specifier.startsWith('@/')) continue
            const resolved = specifier.startsWith('@/')
              ? path.posix.join('src', specifier.slice(2))
              : path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile), specifier))
            // Vite's Router plugin creates the route tree during dev/build.
            if (resolved === 'src/routeTree.gen') continue
            const candidates = [resolved, ...['.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx', '/index.ts', '/index.tsx'].map(ext => resolved + ext)]
            assert.ok(candidates.some(candidate => existing.has(candidate)), `${architecture} / ${naming} / ${language}: ${sourceFile} cannot resolve ${specifier}`)
          }
        }
      }
    }
  }
})

test('each TanStack tool builds by itself with TypeScript', { timeout: 600000 }, async t => {
  // Share one installation for speed; manifests and imports are separately checked above.
  const donor = await fixture(t, { language: 'TypeScript', tanstack: selections })
  await npm(['install', '--no-audit', '--no-fund'], donor)
  for (const [index, selected] of selections.entries()) {
    const target = await fixture(t, {
      architecture: architectures[index % architectures.length], language: 'TypeScript', tanstack: [selected],
    })
    await symlink(path.join(donor, 'node_modules'), path.join(target, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
    await npm(['run', 'build'], target)
    assert.ok((await stat(path.join(target, 'dist', 'index.html'))).isFile(), selected)
  }
})

for (const scenario of [
  { label: 'router only / TypeScript', language: 'TypeScript', architecture: 'Type-Based', tanstack: ['router'] },
  { label: 'all tools / JavaScript / FSD', language: 'JavaScript', architecture: 'Feature-Sliced Design (FSD)', tanstack: selections },
  { label: 'all tools / TypeScript / Atomic Design / PWA / shadcn', language: 'TypeScript', architecture: 'Atomic Design', tanstack: selections, pwa: true, tailwind: true, shadcn: true },
]) {
  test(`TanStack project installs and builds: ${scenario.label}`, { timeout: 600000 }, async t => {
    const target = await fixture(t, scenario)
    await npm(['install', '--no-audit', '--no-fund'], target)
    await npm(['run', 'build'], target)
    assert.ok((await stat(path.join(target, 'dist', 'index.html'))).isFile())
  })
}
