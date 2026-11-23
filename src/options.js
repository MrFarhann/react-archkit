import { deflateSync } from 'node:zlib';
import { applyPwa } from './pwa.js';
import { applyTanstackRouter } from './tanstack-router.js';
import { applyTanstackExamples } from './tanstack-examples.js';
import { applyTesting } from './testing.js';

const versions = { pwa: '1.2.0', biome: '2.3.8', prettier: '3.6.2', esbuild: '0.25.12', axios: '1.13.2' };
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

// Produce real PNG icons without a platform-specific image dependency.
function pngIcon(size) {
  const crc = (buffer) => {
    let value = 0xffffffff;
    for (const byte of buffer) {
      value ^= byte;
      for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
    }
    return (value ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const name = Buffer.from(type), length = Buffer.alloc(4), checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length); checksum.writeUInt32BE(crc(Buffer.concat([name, data])));
    return Buffer.concat([length, name, data, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 6;
  const pixels = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x / size - .5, dy = y / size - .5;
    const circle = dx * dx + dy * dy < .105;
    const tick = circle && ((dx > -.21 && dx < -.02 && Math.abs(dy - (dx + .11)) < .026) || (dx >= -.025 && dx < .23 && Math.abs(dy - (-dx + .06)) < .026));
    const rgb = tick ? [36, 65, 48] : circle ? [213, 242, 193] : [36, 65, 48];
    const i = y * (size * 4 + 1) + 1 + x * 4;
    pixels[i] = rgb[0]; pixels[i + 1] = rgb[1]; pixels[i + 2] = rgb[2]; pixels[i + 3] = 255;
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}

function sampleName(value, convention) {
  const words = value.split(' ');
  const cap = word => word[0].toUpperCase() + word.slice(1);
  switch (convention) {
    case 'camelCase': return words[0] + words.slice(1).map(cap).join('');
    case 'PascalCase': return words.map(cap).join('');
    case 'snake_case': return words.join('_');
    case 'UPPER_CASE': return words.join('_').toUpperCase();
    default: return words.join('-');
  }
}

/** Apply optional integrations to the common project and document its actual files. */
export function applyOptions(files, options, appPath) {
  const { projectName, language, architecture, naming, pwa, formatter, esbuild, axios, graphify } = options;
  const pkg = JSON.parse(files['package.json']);
  if (formatter === 'Biome') {
    pkg.devDependencies['@biomejs/biome'] = versions.biome;
    pkg.scripts.format = 'biome format --write .';
    pkg.scripts.lint = 'biome lint .';
    files['biome.json'] = json({ '$schema': `https://biomejs.dev/schemas/${versions.biome}/schema.json`, vcs: { enabled: true, clientKind: 'git', useIgnoreFile: true }, files: { ignoreUnknown: true }, formatter: { enabled: true, indentStyle: 'space' }, linter: { enabled: true, rules: { recommended: true } } });
  } else if (formatter === 'Prettier') {
    pkg.devDependencies.prettier = versions.prettier;
    pkg.scripts.format = 'prettier --write .';
    pkg.scripts['format:check'] = 'prettier --check .';
    files['.prettierrc.json'] = '{}\n';
    files['.prettierignore'] = 'node_modules\ndist\ngraphify-out\n';
  }
  if (esbuild) {
    pkg.devDependencies.esbuild = versions.esbuild;
    files['vite.config.js'] = files['vite.config.js'].replace('  resolve:', "  build: { minify: 'esbuild' },\n  resolve:");
  }
  if (pwa) applyPwa(files, pkg, options, pngIcon, sampleName);
  let clientPath;
  if (axios) {
    pkg.dependencies.axios = versions.axios;
    const folder = architecture === 'Feature-Sliced Design (FSD)' ? 'shared/lib' : 'lib';
    clientPath = `src/${folder}/${sampleName('http client', naming)}.${language === 'TypeScript' ? 'ts' : 'js'}`;
    files[clientPath] = "import axios from 'axios';\n\n// Configure this client for your own API before making requests.\nexport const httpClient = axios.create({ baseURL: '/api', timeout: 10000 });\n";
  }
  if (graphify) {
    files['.graphifyrc'] = 'viz_node_limit=5000\n';
    files['.graphifyignore'] = 'node_modules/\ndist/\ncoverage/\ngraphify-out/\n';
    files['.gitignore'] += 'graphify-out/\n';
    files['scripts/graphify.mjs'] = `import { spawnSync } from 'node:child_process';\n\nconst result = spawnSync('graphify', ['extract', '.', '--code-only'], {\n  stdio: 'inherit',\n  shell: process.platform === 'win32',\n  env: { ...process.env, GRAPHIFY_NO_AUTO_REFRESH: '1' },\n});\nif (result.error) {\n  console.error('Could not run graphify. Install graphifyy as described in README.md.', result.error.message);\n  process.exitCode = 1;\n} else {\n  process.exitCode = result.status ?? 1;\n}\n`;
    pkg.scripts['graphify:build'] = 'node scripts/graphify.mjs';
  }
  const tanstack = options.tanstack ?? [];
  if (tanstack.includes('router')) applyTanstackRouter(files, pkg, options);
  if (tanstack.some(tool => tool !== 'router')) applyTanstackExamples(files, pkg, options);
  if (options.testing === 'Vitest') applyTesting(files, pkg, options, appPath);
  files['package.json'] = json(pkg);
  const formatterDocs = formatter === 'None' ? '- Formatting: none selected. No formatter or formatter scripts are configured.\n' : `- Formatting: ${formatter}; run \`npm run format\`${formatter === 'Biome' ? ' and `npm run lint`' : ' or `npm run format:check`'}.\n`;
  files['README.md'] += `\n## Optional integrations\n\n${pwa ? `- PWA: \`${options.pwaStrategy ?? 'generateSW'}\` strategy; update mode: \`${options.pwaUpdate ?? 'prompt'}\`. The production build generates a manifest and service worker. Test with \`npm run build\` and \`npm run preview\` on localhost or HTTPS. ${options.pwaStrategy === 'injectManifest' ? 'Customize \`src/sw.' + (language === 'TypeScript' ? 'ts' : 'js') + '\` for additional cache rules. ' : ''}${options.pwaUpdate === 'autoUpdate' ? 'Automatic reload can discard unsaved form data. ' : 'When an update is ready, the user can choose Update now or Later. '}Only application assets are precached by default; configure runtime caching explicitly for other resources.\n` : ''}${formatterDocs}${esbuild ? '- esbuild is installed directly and configured as the Vite production minifier. Vite also uses esbuild internally regardless of this option.\n' : ''}${axios ? `- Axios: configure and import the client in \`${clientPath}\` when connecting an API. The task sample itself works offline.\n` : ''}${graphify ? '- Graphify uses Python, not npm. Install Python 3.10+ and `pipx install graphifyy==0.9.88` (or `uv tool install graphifyy==0.9.88`), then run `npm run graphify:build`. This extracts a code-only graph into `graphify-out/`; it does not generate a report. The generated launcher disables Graphify’s automatic global skill refresh.\n' : ''}\nSee [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for the generated files, packages, and architecture.\n`;
  if (tanstack.length) {
    files['README.md'] += `\n## TanStack\n\nSelected tools: ${tanstack.map(tool => `\`${tool}\``).join(', ')}.\n\n${tanstack.includes('router') ? '- Router provides file-based home and about routes in `src/routes/`. The Vite plugin generates the route tree when the dev server or production build runs; route filenames are fixed by the router. The task example uses in-memory state, so navigating away from home and back clears its tasks.\n' : ''}${tanstack.some(tool => tool !== 'router') ? `- The selected non-router tools have small runnable examples in \`src/tanstack-examples.${language === 'TypeScript' ? 'tsx' : 'jsx'}\`. Remove or adapt the examples as you build your app.\n` : ''}${tanstack.includes('query') ? '- Query provides a QueryClientProvider around the app.\n' : ''}${tanstack.includes('store') ? '- TanStack Store is a 0.x package; its API can change between releases.\n' : ''}`;
  }
  const paths = [...Object.keys(files), 'PROJECT_STRUCTURE.md'].sort();
  const purpose = {
    react: 'Builds the user interface.', 'react-dom': 'Renders React in the browser.',
    axios: 'HTTP client for connecting to an API.', '@radix-ui/react-slot': 'Supports composition in the shadcn Button.',
    'class-variance-authority': 'Defines UI component variants.', clsx: 'Combines conditional CSS classes.',
    'tailwind-merge': 'Resolves conflicting Tailwind utilities.', 'lucide-react': 'Provides icons for shadcn components.',
    vite: 'Runs the development server and production bundler.', '@vitejs/plugin-react': 'Enables React and JSX in Vite.',
    typescript: 'Checks TypeScript source.', '@types/react': 'React TypeScript declarations.', '@types/react-dom': 'React DOM TypeScript declarations.',
    tailwindcss: 'Generates utility CSS.', '@tailwindcss/vite': 'Integrates Tailwind CSS with Vite.',
    'vite-plugin-pwa': 'Generates the manifest and service worker.', 'workbox-window': 'Registers the service worker in the browser.', 'workbox-core': 'Provides service worker lifecycle helpers.', 'workbox-precaching': 'Precaches versioned application assets.', 'workbox-routing': 'Routes offline navigation requests.', '@biomejs/biome': 'Formats and lints source code.',
    prettier: 'Formats project files.', esbuild: 'Provides the explicitly selected Vite minifier.',
    vitest: 'Runs unit and component tests.', jsdom: 'Provides a browser-like DOM for tests.',
    '@testing-library/react': 'Renders React components for behavior tests.', '@testing-library/dom': 'Finds DOM elements by accessible roles and labels.',
    '@testing-library/user-event': 'Simulates user interaction in tests.', '@testing-library/jest-dom': 'Adds DOM-specific assertions.',
    '@tanstack/react-router': 'Client-side routing.', '@tanstack/router-plugin': 'Generates the file-based route tree.',
    '@tanstack/react-query': 'Asynchronous state and caching.', '@tanstack/react-table': 'Headless tables.', '@tanstack/charts': 'Composable chart visualizations.',
    '@tanstack/react-form': 'Form state and validation.', '@tanstack/react-virtual': 'Virtualized lists.', '@tanstack/react-store': 'Reactive shared state.'
  };
  const describe = ([name, version]) => `- \`${name}@${version}\` — ${purpose[name] || 'Project dependency.'}`;
  const deps = Object.entries(pkg.dependencies).map(describe).join('\n');
  const devDeps = Object.entries(pkg.devDependencies).map(describe).join('\n');
  files['PROJECT_STRUCTURE.md'] = `# Project structure and packages\n\n## Architecture\n\nThis project uses **${architecture}** and **${language}**. See README.md for guidance on extending this architecture. Names in the sample follow **${naming}**; fixed tool and integration paths are documented there.\n\n## Generated files\n\n${paths.map(file => `- \`${file}\``).join('\n')}\n\n## Runtime dependencies\n\n${deps}\n\n## Development dependencies\n\n${devDeps}\n\n## Integrations\n\n- PWA: ${pwa ? `enabled; strategy: ${options.pwaStrategy ?? 'generateSW'}; update mode: ${options.pwaUpdate ?? 'prompt'}` : 'disabled'}\n- Formatter: ${formatter}\n- Testing: ${options.testing === 'Vitest' ? 'Vitest and React Testing Library' : 'none'}\n- Direct esbuild: ${esbuild ? 'enabled' : 'disabled'} (Vite uses esbuild internally regardless)\n- Axios: ${axios ? `enabled; client at \`${clientPath}\`` : 'disabled'}\n- Graphify: ${graphify ? 'configured; separate Python installation required' : 'disabled'}\n- TanStack: ${tanstack.length ? tanstack.join(', ') : 'none'}\n\n## Commands\n\n${Object.entries(pkg.scripts).map(([key, value]) => `- \`npm run ${key}\` — \`${value}\``).join('\n')}\n`;
}
