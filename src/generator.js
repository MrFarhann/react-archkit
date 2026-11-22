import { lstat, mkdir, open, readdir, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { architectureFiles } from './architectures.js';
import { appStyles } from './styles.js';
import { applyOptions } from './options.js';
import { tanstackTools } from './tanstack-tools.js';
import { addShadcnComponents } from './shadcn.js';

const architectures = ['Type-Based', 'Feature-Based', 'Domain-Based', 'Feature-Sliced Design (FSD)', 'Atomic Design'];
const namings = ['kebab-case', 'camelCase', 'PascalCase', 'snake_case', 'UPPER_CASE'];

export function validateProjectName(name) {
  if (typeof name !== 'string' || name.length > 214 || !/^[a-z0-9][a-z0-9._-]*$/.test(name) || /^(?:node_modules|favicon\.ico|con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) || name.endsWith('.')) {
    throw new Error('Project name must be a valid lowercase npm package name and a single safe folder name (for example, my-app).');
  }
  return name;
}

function json(value) { return `${JSON.stringify(value, null, 2)}\n`; }

const guides = {
  'Type-Based': 'Place new UI in components, reusable state logic in hooks, and supporting functions in utils. Group by technical role.',
  'Feature-Based': 'Give a new capability its own folder under features, keeping its UI and logic together. Lift shared state to the application.',
  'Domain-Based': 'Extend the tasks domain model and its rules for task behavior; put domain UI alongside the domain and keep application wiring separate.',
  'Feature-Sliced Design (FSD)': 'Add slices to the appropriate layers. Import lower layers through slice public APIs; avoid imports between slices on the same layer.',
  'Atomic Design': 'Compose atoms into molecules, organisms, templates and pages. Keep task behavior in the separate model, not in the visual hierarchy.'
};

function sharedFiles(options, appPath) {
  const { projectName, architecture, naming, language, tailwind, shadcn } = options;
  const ts = language === 'TypeScript';
  const ext = ts ? 'tsx' : 'jsx';
  const fsd = architecture === 'Feature-Sliced Design (FSD)';
  const uiDir = fsd ? 'shared/ui' : 'components/ui';
  const libDir = fsd ? 'shared/lib' : 'lib';
  const dependencies = { react: '19.2.0', 'react-dom': '19.2.0' };
  const devDependencies = { '@vitejs/plugin-react': '5.1.2', vite: '7.3.1' };
  if (ts) Object.assign(devDependencies, { '@types/react': '19.2.7', '@types/react-dom': '19.2.3', typescript: '5.9.3' });
  if (tailwind) Object.assign(devDependencies, { '@tailwindcss/vite': '4.1.18', tailwindcss: '4.1.18' });
  if (shadcn) Object.assign(dependencies, { '@radix-ui/react-slot': '1.2.4', 'class-variance-authority': '0.7.1', clsx: '2.1.1', 'tailwind-merge': '3.4.0', 'lucide-react': '0.562.0' });
  const pkg = { name: projectName, private: true, version: '0.0.0', type: 'module', engines: { node: '^20.19.0 || >=22.12.0' }, scripts: { dev: 'vite', build: ts ? 'tsc --noEmit && vite build' : 'vite build', preview: 'vite preview' }, dependencies, devDependencies };
  const config = { compilerOptions: { target: 'ES2022', useDefineForClassFields: true, lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext', skipLibCheck: true, moduleResolution: 'Bundler', allowImportingTsExtensions: true, resolveJsonModule: true, isolatedModules: true, noEmit: true, jsx: 'react-jsx', strict: true, baseUrl: '.', paths: { '@/*': ['./src/*'] } }, include: ['src'] };
  const files = {
    'package.json': json(pkg),
    '.gitignore': 'node_modules\ndist\n*.local\n',
    'pnpm-workspace.yaml': 'packages:\n  - .\nallowBuilds:\n  esbuild: true\nonlyBuiltDependencies:\n  - esbuild\n',
    'index.html': `<!doctype html>\n<html lang="en">\n  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${projectName}</title></head>\n  <body><div id="root"></div><script type="module" src="/src/main.${ext}"></script></body>\n</html>\n`,
    'vite.config.js': `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n${tailwind ? "import tailwindcss from '@tailwindcss/vite';\n" : ''}import { fileURLToPath, URL } from 'node:url';\n\nexport default defineConfig({\n  plugins: [react()${tailwind ? ', tailwindcss()' : ''}],\n  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },\n});\n`,
    [ts ? 'tsconfig.json' : 'jsconfig.json']: json(ts ? config : { compilerOptions: { baseUrl: '.', paths: { '@/*': ['./src/*'] }, jsx: 'react-jsx' }, include: ['src'] }),
    [`src/main.${ext}`]: `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './${appPath.replace(/\.(tsx|jsx)$/, '')}';\nimport './index.css';\n\nconst root = document.getElementById('root');\nif (!root) throw new Error('Root element not found');\ncreateRoot(root).render(<React.StrictMode><App /></React.StrictMode>);\n`,
    'src/index.css': appStyles(tailwind),
    'README.md': `# ${projectName}\n\nA React + Vite task app using **${architecture}**, ${language}, and ${shadcn ? 'Tailwind CSS with shadcn/ui' : tailwind ? 'Tailwind CSS' : 'plain CSS'}.\n\n## Run\n\nRequires Node.js 20.19+ or 22.12+.\n\n\`\`\`sh\nnpm install\nnpm run dev\n\`\`\`\n\nRun \`npm run build\` for a production build${ts ? ' including type checking' : ''}.\n\nFor pnpm 10.25 or newer, run \`pnpm install\` and \`pnpm dev\`. The generated pnpm configuration permits only esbuild's install script; other dependencies that require build scripts still need review.\n\n## Extend the example\n\n${guides[architecture]}\n\nThe selected **${naming}** convention applies to changeable sample file and folder names. Tooling filenames, entry points, architecture layer names and shadcn/ui paths remain fixed where required. React component identifiers remain PascalCase.\n${shadcn ? '\nshadcn/ui is configured: add components with `npx shadcn@latest add badge`. The CLI uses the aliases in `components.json`.\n' : ''}`
  };
  if (shadcn) {
    const tokens = { background: '#ffffff', foreground: '#171717', card: '#ffffff', 'card-foreground': '#171717', popover: '#ffffff', 'popover-foreground': '#171717', primary: '#171717', 'primary-foreground': '#fafafa', secondary: '#f5f5f5', 'secondary-foreground': '#171717', muted: '#f5f5f5', 'muted-foreground': '#737373', accent: '#f5f5f5', 'accent-foreground': '#171717', destructive: '#dc2626', border: '#e5e5e5', input: '#e5e5e5', ring: '#a3a3a3' };
    const theme = Object.keys(tokens).map(key => `  --color-${key}: var(--${key});`).join('\n');
    const values = Object.entries(tokens).map(([key, value]) => `  --${key}: ${value};`).join('\n');
    files['src/index.css'] += `\n@theme inline {\n${theme}\n  --radius-sm: calc(var(--radius) - 4px);\n  --radius-md: calc(var(--radius) - 2px);\n  --radius-lg: var(--radius);\n  --radius-xl: calc(var(--radius) + 4px);\n}\n:root {\n${values}\n  --radius: 0.625rem;\n}\n`;
    files['components.json'] = json({ '$schema': 'https://ui.shadcn.com/schema.json', style: 'new-york', rsc: false, tsx: ts, tailwind: { config: '', css: 'src/index.css', baseColor: 'neutral', cssVariables: true, prefix: '' }, aliases: { components: fsd ? '@/shared' : '@/components', utils: `@/${libDir}/utils`, ui: `@/${uiDir}`, lib: `@/${libDir}`, hooks: fsd ? '@/shared/hooks' : '@/hooks' }, iconLibrary: 'lucide' });
    files[`src/${libDir}/utils.${ts ? 'ts' : 'js'}`] = `import { clsx${ts ? ', type ClassValue' : ''} } from 'clsx';\nimport { twMerge } from 'tailwind-merge';\n\nexport function cn(...inputs${ts ? ': ClassValue[]' : ''}) { return twMerge(clsx(inputs)); }\n`;
    files[`src/${uiDir}/button.${ext}`] = `import * as React from 'react';\nimport { Slot } from '@radix-ui/react-slot';\nimport { cva${ts ? ', type VariantProps' : ''} } from 'class-variance-authority';\nimport { cn } from '@/${libDir}/utils';\n\nconst buttonVariants = cva('inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50', { variants: { variant: { default: 'bg-blue-600 text-white hover:bg-blue-700', outline: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100' }, size: { default: 'h-10 px-4 py-2', sm: 'h-9 px-3' } }, defaultVariants: { variant: 'default', size: 'default' } });\n${ts ? "type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean };\n" : ''}function Button({ className, variant, size, asChild = false, ...props }${ts ? ': ButtonProps' : ''}) {\n  const Comp = asChild ? Slot : 'button';\n  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;\n}\nexport { Button, buttonVariants };\n`;
    addShadcnComponents(files, { uiDir, libDir, ext, ts });
  }
  files['README.md'] += `\n## UI sources\n\n- The starter layout and CSS are original to React ArchKit and use system fonts; no external fonts or image assets are loaded.\n- Built with [React](https://react.dev/) and [Vite](https://vite.dev/).\n${shadcn ? '- Components are adapted from shadcn/ui: [Button](https://ui.shadcn.com/docs/components/radix/button), [Input](https://ui.shadcn.com/docs/components/radix/input) and [Card](https://ui.shadcn.com/docs/components/radix/card). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the MIT copyright and license.\n' : ''}`;
  return files;
}

export async function generateProject(options) {
  options = { pwa: false, pwaStrategy: 'generateSW', pwaUpdate: 'prompt', formatter: 'Prettier', esbuild: false, axios: false, graphify: false, tanstack: [], ...options };
  options.pwaStrategy ??= 'generateSW';
  options.pwaUpdate ??= 'prompt';
  const { projectName, targetDir, architecture, naming, language, tailwind, shadcn } = options;
  validateProjectName(projectName);
  if (!targetDir || !architectures.includes(architecture) || !namings.includes(naming) || !['TypeScript', 'JavaScript'].includes(language) || typeof tailwind !== 'boolean' || typeof shadcn !== 'boolean' || (shadcn && !tailwind)) throw new Error('Invalid project options.');
  if (typeof options.pwa !== 'boolean' || !['generateSW', 'injectManifest'].includes(options.pwaStrategy) || !['prompt', 'autoUpdate'].includes(options.pwaUpdate) || !['Biome', 'Prettier', 'None'].includes(options.formatter) || typeof options.esbuild !== 'boolean' || typeof options.axios !== 'boolean' || typeof options.graphify !== 'boolean' || (options.formatter !== 'Prettier' && options.esbuild)) throw new Error('Invalid integration options.');
  const validTanstack = new Set(tanstackTools.map(({ value }) => value));
  if (!Array.isArray(options.tanstack) || options.tanstack.some(tool => !validTanstack.has(tool)) || new Set(options.tanstack).size !== options.tanstack.length) throw new Error('Invalid TanStack tools selection.');
  const target = path.resolve(targetDir);
  if (options.useExistingDirectory !== undefined && typeof options.useExistingDirectory !== 'boolean') throw new Error('Invalid project options.');
  const { files: architectureSources, appPath } = architectureFiles(options);
  const files = { ...sharedFiles(options, appPath), ...architectureSources };
  applyOptions(files, options);
  const createdFiles = [];
  const createdDirs = [];
  try {
    if (options.useExistingDirectory) {
      const stat = await lstat(target);
      if (!stat.isDirectory() || (await readdir(target)).length > 0) {
        throw new Error(`Destination must be an empty directory: ${target}`);
      }
    } else {
      await mkdir(target); // Exclusive: never adopt an existing directory by default.
      createdDirs.push(target);
    }
    for (const [relative, content] of Object.entries(files)) {
      const destination = path.resolve(target, relative);
      if (!destination.startsWith(target + path.sep)) throw new Error('Unsafe template path.');
      const parts = path.relative(target, path.dirname(destination)).split(path.sep).filter(Boolean);
      let current = target;
      for (const part of parts) {
        current = path.join(current, part);
        if (!createdDirs.includes(current)) { await mkdir(current); createdDirs.push(current); }
      }
      const handle = await open(destination, 'wx');
      createdFiles.push(destination);
      try { await handle.writeFile(content); } finally { await handle.close(); }
    }
  } catch (error) {
    for (const file of createdFiles.reverse()) await unlink(file).catch(() => {});
    for (const dir of createdDirs.reverse()) await rmdir(dir).catch(() => {});
    if (error.code === 'EEXIST' && createdDirs.length === 0) throw new Error(`Destination already exists: ${target}`);
    throw error;
  }
  return target;
}
