/** Configure PWA generation, registration, and a real React update prompt. */
export function applyPwa(files, pkg, options, pngIcon, sampleName) {
  const { projectName, language, architecture, naming } = options;
  const strategy = options.pwaStrategy ?? 'generateSW';
  const update = options.pwaUpdate ?? 'prompt';
  const ts = language === 'TypeScript';
  const moduleExt = ts ? 'ts' : 'js';
  const componentExt = ts ? 'tsx' : 'jsx';
  pkg.devDependencies['vite-plugin-pwa'] = '1.2.0';
  // Imported virtual modules use workbox-window in the browser bundle.
  pkg.devDependencies['workbox-window'] = '7.4.0';
  files['vite.config.js'] = files['vite.config.js'].replace("import react from '@vitejs/plugin-react';", "import react from '@vitejs/plugin-react';\nimport { VitePWA } from 'vite-plugin-pwa';");
  const customWorkerOptions = strategy === 'injectManifest' ? `, srcDir: 'src', filename: 'sw.${moduleExt}'` : '';
  const pwaConfig = `VitePWA({ strategies: '${strategy}', registerType: '${update}'${customWorkerOptions}, manifest: { name: ${JSON.stringify(projectName)}, short_name: ${JSON.stringify(projectName)}, description: 'A focused task list', theme_color: '#244130', background_color: '#f5f6f2', display: 'standalone', start_url: '.', scope: './', icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }, { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }] } })`;
  files['vite.config.js'] = files['vite.config.js'].replace(/plugins: \[([^\]]*)\]/, (_, plugins) => `plugins: [${plugins}, ${pwaConfig}]`);
  files['index.html'] = files['index.html'].replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" /><meta name="theme-color" content="#244130" />');
  files['public/pwa-192x192.png'] = pngIcon(192);
  files['public/pwa-512x512.png'] = pngIcon(512);
  if (ts) {
    files['src/vite-env.d.ts'] = '/// <reference types="vite/client" />\n/// <reference types="vite-plugin-pwa/client" />\n/// <reference types="vite-plugin-pwa/react" />\n';
  }
  const main = `src/main.${componentExt}`;
  if (update === 'prompt') {
    const folder = architecture === 'Feature-Sliced Design (FSD)' ? 'shared/ui' : 'pwa';
    const name = sampleName('pwa update prompt', naming);
    const file = `src/${folder}/${name}.${componentExt}`;
    files[file] = `import { useRegisterSW } from 'virtual:pwa-register/react';

/** Shows only when a newer service worker is waiting for user approval. */
export function PwaUpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({ immediate: true });
  if (!needRefresh) return null;
  return <aside className="pwa-update">
    <output aria-live="polite">A new version is available.</output>
    <div className="pwa-update-actions">
      <button type="button" className="pwa-update-accept" onClick={() => { void updateServiceWorker(true); }}>Update now</button>
      <button type="button" className="pwa-update-later" onClick={() => setNeedRefresh(false)}>Later</button>
    </div>
  </aside>;
}
`;
    files[main] = files[main].replace("import './index.css';", `import { PwaUpdatePrompt } from './${folder}/${name}';\nimport './index.css';`).replace('<App />', '<App /><PwaUpdatePrompt />');
    files['src/index.css'] += `\n.pwa-update { position: fixed; right: 1rem; bottom: 1rem; z-index: 1000; width: min(22rem, calc(100% - 2rem)); padding: 1rem; border: 1px solid #dce5d7; border-radius: 14px; color: #23382d; background: #fff; box-shadow: 0 12px 32px #20342b24; }\n.pwa-update output { display: block; margin: 0 0 .75rem; font-size: .875rem; font-weight: 700; }\n.pwa-update-actions { display: flex; gap: .5rem; }\n.pwa-update button { padding: .55rem .8rem; border: 1px solid #dce5d7; border-radius: 8px; font-size: .8rem; font-weight: 700; }\n.pwa-update-accept { color: white; background: #274a37; }\n.pwa-update-later { color: #274a37; background: white; }\n`;
  } else {
    files[main] = files[main].replace("import './index.css';", "import { registerSW } from 'virtual:pwa-register';\nimport './index.css';\n\nregisterSW({ immediate: true });");
  }
  if (strategy === 'injectManifest') {
    Object.assign(pkg.devDependencies, { 'workbox-core': '7.4.0', 'workbox-precaching': '7.4.0', 'workbox-routing': '7.4.0' });
    const types = ts ? `/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null } | string> };
` : '';
    const updateLogic = update === 'autoUpdate' ? 'self.skipWaiting();' : `self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});`;
    files[`src/sw.${moduleExt}`] = `${types}import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

// Vite PWA injects the precache list at build time. Add custom caching here.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL(\`\${import.meta.env.BASE_URL}index.html\`)));
${updateLogic}
clientsClaim();
`;
  }
}
