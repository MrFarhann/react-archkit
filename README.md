# create-react-archkit

**React ArchKit** is an interactive CLI for scaffolding React + Vite projects with your choice of architecture, including Feature-Based, Domain-Based, Feature-Sliced Design, and Atomic Design.

[npm package](https://www.npmjs.com/package/create-react-archkit) · [GitHub repository](https://github.com/MrFarhann/react-archkit)

Pick your folder structure, language, styling, and integrations in one guided setup, then make the generated project your own.

## Quick start

**Requirements:** Node.js 20.19 or newer in the 20.x line, or Node.js 22.12 or newer, and npm. The generated project has the same Node.js requirement.

Run:

```sh
npm create react-archkit@latest my-app
```

Or use `npx`:

```sh
npx create-react-archkit@latest my-app
```

To create a project in the current directory, run `npx create-react-archkit@latest .` in an empty directory. The directory name must be a valid lowercase npm package name; it becomes the generated package name. Existing files are never overwritten.

Follow the prompts, review the summary, and confirm. Dependencies are not installed automatically; after generation, run:

```sh
cd my-app
npm install
npm run dev
```

If you created the project in the current directory with `.`, skip the `cd my-app` step.

Open the local URL printed by Vite. Run `npm run build` to create a production build and `npm run preview` to preview it locally. For TypeScript projects, the build also checks types.

The starter is a small task app: you can add tasks, view the list, and toggle completion. Its task state lives in memory, so it resets when the page reloads. The same example is organized differently for each architecture, making the trade-offs easy to explore.

## How it works

1. **Name your project.** Pass the name as an argument or omit it to be prompted. Use a lowercase npm-compatible name that is also a safe single folder name, such as `my-app`.
2. **Choose PWA support.** If enabled, choose a service worker strategy and update behavior.
3. **Choose your foundation.** Select an architecture, a file and folder naming convention, and TypeScript or JavaScript.
4. **Choose your tools.** Select plain CSS or Tailwind CSS, optionally add shadcn/ui, then choose a formatter and optional integrations.
5. **Review and create.** Confirm the printed choices and destination. React ArchKit creates the files; you install dependencies and start the dev server.

For a named project, the destination must not already exist. When using `.`, the current directory must be empty. Existing files are never overwritten. Press `Ctrl+C` to cancel. For command-line help, use `npx create-react-archkit@latest --help`, or `node bin/cli.js --help` from a local checkout.

## Choose an architecture

| Architecture | How the example is organized |
| --- | --- |
| **Type-Based** | Groups code by technical role, such as components, hooks, and utilities. |
| **Feature-Based** | Keeps the code for each user-facing capability together in a feature folder. |
| **Domain-Based** | Centers task behavior on a shared domain model, separate from UI and application wiring. |
| **Feature-Sliced Design (FSD)** | Uses layers and slices with public APIs and downward dependencies. |
| **Atomic Design** | Composes the UI from atoms, molecules, organisms, templates, and pages, with task logic kept separately. |

All five starters provide the same task interactions. Each generated README gives architecture-specific guidance for adding the next feature, while `PROJECT_STRUCTURE.md` lists the generated files, packages, and commands.

## Make it yours

| Choice | Options |
| --- | --- |
| **Language** | TypeScript or JavaScript |
| **Naming** | `kebab-case`, `camelCase`, `PascalCase`, `snake_case`, or `UPPER_CASE` |
| **Styling** | Plain CSS, Tailwind CSS v4, or Tailwind CSS with shadcn/ui |
| **Formatting** | Biome or Prettier |
| **PWA** | Optional service worker and web app manifest |
| **Integrations** | Optional Axios client and Graphify configuration |

The naming convention applies to changeable example files and folders. React component identifiers remain PascalCase; tooling files, entry points, fixed architecture paths, and required configuration paths keep their expected names. Generated imports follow the chosen paths.

The shadcn/ui option requires Tailwind and includes configuration and a working Button component. You can add further components with the shadcn CLI. Biome adds formatting and linting scripts; Prettier adds formatting and format-check scripts. If you choose Prettier, you can also select esbuild as an additional direct dependency and Vite production minifier; Vite already uses esbuild internally regardless of that choice.

Choosing Axios adds a starter HTTP client configured with `/api` and a timeout; configure it for your API before use. Choosing Graphify adds configuration and a `graphify:build` script. Graphify is a separate Python tool, not an npm dependency: the generated README provides installation instructions. The script extracts a code-only graph into `graphify-out/` and does not generate a report.

Generated projects also support `pnpm install` and `pnpm dev` with pnpm 10.25 or newer. Their pnpm configuration permits esbuild's install script; other dependencies requiring build scripts still need review.

## Progressive Web Apps

When PWA support is enabled, React ArchKit configures a manifest and service worker using [Vite PWA](https://vite-pwa-org.netlify.app/). Choose one option from each group:

- **Service worker:** `generateSW` generates it automatically; `injectManifest` gives you a custom source file to extend with Workbox.
- **Updates:** `Prompt` lets users choose when to reload; `Auto update` activates new versions automatically and can reload the page, potentially discarding unsaved work.

To test the production PWA, run `npm run build` and `npm run preview`, then open the preview on localhost. Deployed service workers require HTTPS outside localhost. Once installed, the worker can serve precached app assets offline; API responses are not cached automatically, and task data is not persisted.

## Developing React ArchKit

Clone this repository, install its dependencies, and run the CLI locally:

```sh
git clone git@github.com:MrFarhann/react-archkit.git
cd react-archkit
npm install
node bin/cli.js my-app
```

The target directory is relative to your current working directory. For a local-only test, run the CLI from another directory while pointing to the checkout's `bin/cli.js`.

```sh
npm test              # Full test suite
npm run test:matrix   # Generator and architecture matrix
npm pack --dry-run    # Inspect what would be included in the npm package
```

The suite generates projects across architectures, languages, and styling choices; it checks imports and builds, and installs the packed CLI in an isolated directory. The installation and build tests require network access. Some tests use pnpm when it is available. `npm pack` creates a tarball for inspection; publishing is a separate step.

## License

[MIT](LICENSE)
