import { starterFooter } from './architectures.js';

/** Configure TanStack Router's file-based routing for the generated Vite project. */
export function applyTanstackRouter(files, pkg, options) {
  const ts = options.language === 'TypeScript';
  const ext = ts ? 'tsx' : 'jsx';
  const entry = `src/main.${ext}`;
  const appImport = files[entry].match(/import App from '([^']+)';/);
  if (!appImport || !appImport[1].startsWith('./')) {
    throw new Error('Could not locate the generated application entry for TanStack Router.');
  }

  pkg.dependencies['@tanstack/react-router'] = '1.170.46';
  pkg.devDependencies['@tanstack/router-plugin'] = '1.169.0';
  files['.gitignore'] += '.tanstack/\n';
  // The Vite plugin generates the route tree, including TS route types, before tsc runs.
  if (ts) pkg.scripts.build = 'vite build && tsc --noEmit';

  files['vite.config.js'] = files['vite.config.js']
    .replace("import react from '@vitejs/plugin-react';", "import react from '@vitejs/plugin-react';\nimport { tanstackRouter } from '@tanstack/router-plugin/vite';")
    .replace('plugins: [react()', `plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true${ts ? '' : ', disableTypes: true'} }), react()`);

  files[entry] = files[entry]
    .replace(appImport[0], "import { RouterProvider } from '@tanstack/react-router';\nimport { router } from './router';")
    .replace('<App />', '<RouterProvider router={router} />');

  files[`src/router.${ext}`] = `import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export const router = createRouter({ routeTree });
${ts ? `
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
` : ''}`;

  files[`src/routes/__root.${ext}`] = `import { createRootRoute, Link, Outlet } from '@tanstack/react-router';

function RootLayout() {
  return (
    <div className="router-layout">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Daymark home">
          <span className="brand-mark" aria-hidden="true">✳</span>
          <span className="brand-copy"><span className="brand-name">daymark<span>.</span></span><span className="brand-caption">A LITTLE SPACE FOR YOU</span></span>
        </Link>
        <nav className="topbar-nav" aria-label="Main navigation">
          <Link className="topbar-nav-link" to="/" activeOptions={{ exact: true }}>Home</Link>
          <Link className="topbar-nav-link" to="/about">About</Link>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

export const Route = createRootRoute({ component: RootLayout });
`;
  files[`src/routes/index.${ext}`] = `import { createFileRoute } from '@tanstack/react-router';
import App from '../${appImport[1].slice(2)}';

export const Route = createFileRoute('/')({ component: App });
`;
  files[`src/routes/about.${ext}`] = `import { createFileRoute, Link } from '@tanstack/react-router';

function About() {
  return (
    <div className="page-shell">
      <main className="router-about">
        <h1>About this starter</h1>
        <p>This project uses TanStack Router for file-based routing. Edit the files in <code>src/routes</code> to add pages.</p>
        <Link to="/">Back to tasks</Link>
      </main>
      ${starterFooter}
    </div>
  );
}

export const Route = createFileRoute('/about')({ component: About });
`;
  files['src/index.css'] += `
/* Shared shell for file-based routes. */
.router-layout { min-height: 100vh; display: flex; flex-direction: column; }
.router-layout > .page-shell { flex: 1; min-height: 0; }
.router-about { width: min(52rem, calc(100% - 48px)); flex: 1; margin: 4rem auto; }
.router-about h1 { margin: 0 0 16px; color: #20382c; font-size: clamp(32px, 5vw, 48px); font-weight: 740; letter-spacing: -.045em; line-height: 1.1; }
.router-about p { max-width: 58ch; margin: 0 0 24px; color: #526b58; font-size: 15px; line-height: 1.7; }
.router-about code { padding: 2px 5px; border-radius: 5px; background: #eef5e9; font-size: .9em; }
.router-about a { color: #294d39; font-size: 13px; font-weight: 700; text-decoration: underline; text-underline-offset: 4px; }
`;
}
