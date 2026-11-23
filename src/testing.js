/** Add a runnable component test using the same Vite plugins and aliases as the app. */
export function applyTesting(files, pkg, options, appPath) {
  const ts = options.language === 'TypeScript';
  const ext = ts ? 'tsx' : 'jsx';
  const setupExt = ts ? 'ts' : 'js';
  const hasExamples = options.tanstack.some(tool => tool !== 'router');

  // Vitest 4 excludes Node 23; retain Vite's minimums for supported versions.
  pkg.engines.node = '^20.19.0 || ^22.12.0 || >=24.0.0';
  const vitestVersion = '4.1.12';
  Object.assign(pkg.devDependencies, {
    vitest: vitestVersion,
    jsdom: '26.1.0',
    '@testing-library/react': '16.3.0',
    '@testing-library/dom': '10.4.1',
    '@testing-library/user-event': '14.6.1',
    '@testing-library/jest-dom': '6.6.4',
  });
  // Avoid npm 10/11 resolving this optional peer to an incompatible Vitest major.
  pkg.overrides = { ...pkg.overrides, '@vitejs/devtools-vitest': { vitest: vitestVersion } };
  pkg.scripts.test = 'vitest';
  pkg.scripts['test:run'] = 'vitest run';
  files['vitest.config.js'] = `import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.${setupExt}'],
  },
}));
`;
  files[`src/test/setup.${setupExt}`] = `import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);
`;
  const appImport = `@/${appPath.replace(/\.(?:tsx|jsx)$/, '')}`;
  files[`src/test/app.test.${ext}`] = `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it${hasExamples ? ', vi' : ''} } from 'vitest';
import App from '${appImport}';
${hasExamples ? `
// Keep this test focused on the task app; test the optional examples separately.
vi.mock('@/tanstack-examples', () => ({ TanStackExamples: () => null }));
` : ''}
describe('task list', () => {
  it('adds and completes a task', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByRole('textbox', { name: /new task/i }), 'Read a book');
    await user.click(screen.getByRole('button', { name: /add task/i }));
    expect(screen.getByText('Read a book')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /mark complete: read a book/i }));
    expect(screen.getByRole('button', { name: /mark incomplete: read a book/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('1 of 1 done')).toBeInTheDocument();
  });
});
`;
  files['README.md'] += `\n## Testing\n\nTesting requires Node.js 20.19 or newer in the 20.x line, 22.12 or newer in the 22.x line, or 24 or newer. Node.js 23 is not supported by Vitest.\n\nRun \`npm test\` for Vitest's watch mode or \`npm run test:run\` for a single run (for example, in CI). The starter component test uses React Testing Library and jsdom to add and complete a task. It renders the task app independently of routing${hasExamples ? ' and mocks the optional TanStack examples; test those examples separately' : ''}. jsdom simulates the DOM and does not replace testing in a real browser. Extend the test in \`src/test/app.test.${ext}\` or add your own tests as the application grows.\n\nThe npm override for \`@vitejs/devtools-vitest\` keeps its optional Vitest peer aligned for npm 10/11. When upgrading Vitest, update the override to the same version. pnpm does not use npm's \`overrides\` field.\n`;
}
