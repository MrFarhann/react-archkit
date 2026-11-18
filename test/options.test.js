import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateProject } from '../src/generator.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
const runNpm = (args, cwd) => execFileSync(process.execPath, [npmCli, ...args], {
  cwd, encoding: 'utf8', stdio: 'pipe', timeout: 300000,
  env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' },
})
async function tempDir(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'react-archkit-options-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  return dir
}
const base = { projectName: 'options-app', architecture: 'Type-Based', naming: 'kebab-case', language: 'JavaScript', tailwind: false, shadcn: false }
async function filesUnder(dir, prefix = '') {
  const entries = await readdir(path.join(dir, prefix), { withFileTypes: true })
  return (await Promise.all(entries.map(entry => {
    const relative = path.posix.join(prefix, entry.name)
    return entry.isDirectory() ? filesUnder(dir, relative) : [relative]
  }))).flat()
}

// Cover each possible option combination without multiplying the costly install matrix.
test('all PWA, formatter, esbuild, Axios and Graphify choices generate consistent projects', async t => {
  const rootDir = await tempDir(t)
  let index = 0
  for (const pwa of [false, true]) for (const [formatter, esbuild] of [['Biome', false], ['Prettier', false], ['Prettier', true]]) for (const axios of [false, true]) for (const graphify of [false, true]) {
    const targetDir = path.join(rootDir, `case-${index++}`)
    await generateProject({ ...base, targetDir, pwa, formatter, esbuild, axios, graphify })
    const files = await filesUnder(targetDir)
    const pkg = JSON.parse(await readFile(path.join(targetDir, 'package.json'), 'utf8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    assert.equal(Boolean(deps['vite-plugin-pwa']), pwa, `${targetDir}: PWA dependency`)
    assert.equal(Boolean(deps['@biomejs/biome']), formatter === 'Biome', `${targetDir}: Biome dependency`)
    assert.equal(Boolean(deps.prettier), formatter === 'Prettier', `${targetDir}: Prettier dependency`)
    assert.equal(Boolean(deps.esbuild), esbuild, `${targetDir}: direct esbuild dependency`)
    assert.equal(Boolean(deps.axios), axios, `${targetDir}: Axios dependency`)
    assert.equal(files.some(f => /^biome\.jsonc?$/.test(f)), formatter === 'Biome', `${targetDir}: Biome config`)
    assert.equal(files.some(f => /^(?:\.prettierrc(?:\..*)?|prettier\.config\.[cm]?js)$/.test(f)), formatter === 'Prettier', `${targetDir}: Prettier config`)
    const viteConfig = await readFile(path.join(targetDir, 'vite.config.js'), 'utf8')
    assert.equal(viteConfig.includes('vite-plugin-pwa'), pwa, `${targetDir}: Vite PWA integration`)
    const markdown = await Promise.all(files.filter(f => f.endsWith('.md')).map(f => readFile(path.join(targetDir, f), 'utf8')))
    assert.ok(markdown.some(m => /structure/i.test(m) && /dependencies|packages/i.test(m)), `${targetDir}: structure and package documentation`)
    assert.ok(files.includes('PROJECT_STRUCTURE.md'), `${targetDir}: project structure document`)
    assert.equal(files.includes('.graphifyrc'), graphify, `${targetDir}: Graphify config`)
    assert.equal(files.includes('.graphifyignore'), graphify, `${targetDir}: Graphify ignore file`)
    if (graphify) {
      assert.ok(markdown.some(m => /graphify/i.test(m)), `${targetDir}: Graphify instructions`)
      assert.match(await readFile(path.join(targetDir, '.gitignore'), 'utf8'), /graphify-out\//)
    }
    if (axios) {
      const sources = await Promise.all(files.filter(f => /^src\/.*\.[jt]s$/.test(f)).map(f => readFile(path.join(targetDir, f), 'utf8')))
      assert.ok(sources.some(source => /from ['"]axios['"]/.test(source)), `${targetDir}: configured Axios client`)
    }
    if (pwa) for (const icon of ['public/pwa-192x192.png', 'public/pwa-512x512.png']) {
      assert.ok(files.includes(icon), `${targetDir}: missing ${icon}`)
      assert.equal((await readFile(path.join(targetDir, icon))).subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${icon} must be PNG`)
    }
  }
})

const cases = [
  { name: 'PWA / Biome / Axios / Graphify / TypeScript', pwa: true, formatter: 'Biome', esbuild: false, axios: true, graphify: true, language: 'TypeScript', architecture: 'Feature-Based', tailwind: true, shadcn: false },
  { name: 'PWA / Prettier / esbuild / shadcn / JavaScript', pwa: true, formatter: 'Prettier', esbuild: true, axios: false, graphify: false, language: 'JavaScript', architecture: 'Feature-Sliced Design (FSD)', tailwind: true, shadcn: true },
  { name: 'plain / Prettier / no esbuild / Axios / Graphify', pwa: false, formatter: 'Prettier', esbuild: false, axios: true, graphify: true, language: 'JavaScript', architecture: 'Atomic Design', tailwind: false, shadcn: false },
  { name: 'plain / Biome / no Axios / TypeScript', pwa: false, formatter: 'Biome', esbuild: false, axios: false, graphify: false, language: 'TypeScript', architecture: 'Domain-Based', tailwind: false, shadcn: false },
]
for (const options of cases) test(`install and build ${options.name}`, { timeout: 600000 }, async t => {
  const dir = await tempDir(t)
  const targetDir = path.join(dir, 'options-app')
  await generateProject({ ...base, targetDir, ...options })
  try {
    runNpm(['install', '--no-audit', '--no-fund'], targetDir)
    runNpm(['run', 'build'], targetDir)
    runNpm(['run', 'format'], targetDir)
    if (options.formatter === 'Biome') runNpm(['run', 'lint'], targetDir)
    else runNpm(['run', 'format:check'], targetDir)
  } catch (error) {
    assert.fail(`install/build failed: ${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`)
  }
  assert.ok((await stat(path.join(targetDir, 'dist/index.html'))).isFile())
  const dist = await filesUnder(path.join(targetDir, 'dist'))
  if (options.pwa) {
    assert.ok(dist.some(f => f.endsWith('.webmanifest')), 'built PWA manifest')
    assert.ok(dist.some(f => /(^|\/)sw\.js$/.test(f)), 'built service worker')
    const html = await readFile(path.join(targetDir, 'dist/index.html'), 'utf8')
    assert.match(html, /manifest/i, 'manifest linked in HTML')
  } else {
    assert.ok(!dist.some(f => /(^|\/)sw\.js$/.test(f)), 'no PWA service worker when disabled')
  }
})


test('pnpm installs and builds a PWA with Biome without approval prompts', { timeout: 600000 }, async t => {
  const version = spawnSync('pnpm --version', { shell: true, encoding: 'utf8' })
  if (version.status !== 0) return t.skip('pnpm is not available on PATH')
  const dir = await tempDir(t)
  const targetDir = path.join(dir, 'pnpm-pwa')
  await generateProject({ ...base, projectName: 'pnpm-pwa', targetDir, pwa: true, formatter: 'Biome', esbuild: false, axios: false, graphify: false })
  const store = path.join(dir, 'pnpm-store')
  const env = { ...process.env, CI: 'true', pnpm_config_store_dir: store, npm_config_store_dir: store }
  const run = command => spawnSync(command, { cwd: targetDir, shell: true, encoding: 'utf8', timeout: 300000, env })
  const install = run('pnpm install --reporter=append-only')
  const output = `${install.stdout || ''}\n${install.stderr || ''}`
  assert.equal(install.status, 0, output)
  assert.doesNotMatch(output, /approve-builds|ignored build scripts|ignored: esbuild/i)
  const build = run('pnpm run build')
  assert.equal(build.status, 0, `${build.stdout || ''}\n${build.stderr || ''}`)
  assert.ok((await stat(path.join(targetDir, 'dist/sw.js'))).isFile())
})
