#!/usr/bin/env node

import { lstat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { checkbox, confirm, input, select } from '@inquirer/prompts';
import { generateProject, validateProjectName } from '../src/generator.js';
import { tanstackTools } from '../src/tanstack-tools.js';

const architectures = [
  ['Type-Based', 'Group code by technical role'],
  ['Feature-Based', 'Group code by user-facing feature'],
  ['Domain-Based', 'Group code around the tasks domain'],
  ['Feature-Sliced Design (FSD)', 'Organize slices in dependency-ordered layers'],
  ['Atomic Design', 'Compose UI from atoms through pages'],
];

const namingConventions = [
  ['kebab-case', 'task-card'],
  ['camelCase', 'taskCard'],
  ['PascalCase', 'TaskCard'],
  ['snake_case', 'task_card'],
  ['UPPER_CASE', 'TASK_CARD'],
];

const help = `Usage: create-react-archkit [project-name]

Create a React + Vite project with your choice of architecture.

Options:
  -h, --help  Show this help

Examples:
  npm create react-archkit@latest my-app
  npx create-react-archkit@latest my-app
  npx create-react-archkit@latest .`;

async function exists(target) {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(help);
    return;
  }
  if (args.length > 1 || args[0]?.startsWith('-')) {
    throw new Error('Expected at most one project name. Use --help for usage.');
  }

  const useExistingDirectory = ['.', './', '.\\'].includes(args[0]);
  const projectName = useExistingDirectory ? path.basename(process.cwd()) : (args[0] ?? await input({
    message: 'What is your project name?',
    validate(value) {
      try {
        validateProjectName(value);
        return true;
      } catch (error) {
        return error.message;
      }
    },
  }));
  try {
    validateProjectName(projectName);
  } catch (error) {
    if (useExistingDirectory) throw new Error(`Current directory name "${projectName}" is not a valid project name. Rename the directory to a valid lowercase npm package name, or create a project in a new folder.`);
    throw error;
  }
  const targetDir = useExistingDirectory ? process.cwd() : path.resolve(process.cwd(), projectName);
  if (useExistingDirectory && (await readdir(targetDir)).length > 0) {
    throw new Error(`Current directory is not empty: ${targetDir}. Choose an empty directory.`);
  }
  if (!useExistingDirectory && await exists(targetDir)) {
    throw new Error(`Destination already exists: ${targetDir}. Choose a different project name.`);
  }

  const pwa = await select({
    message: 'Do you want a Progressive Web App (PWA)?',
    choices: [{ name: 'Yes', value: true }, { name: 'No', value: false }],
  });
  const pwaStrategy = pwa ? await select({
    message: 'Which service worker strategy do you want?',
    choices: [
      { name: 'generateSW (Recommended) — generate the service worker automatically', value: 'generateSW' },
      { name: 'injectManifest — use a custom service worker', value: 'injectManifest' },
    ],
  }) : 'generateSW';
  const pwaUpdate = pwa ? await select({
    message: 'How should the app update?',
    choices: [
      { name: 'Prompt (Recommended) — let users choose when to update', value: 'prompt' },
      { name: 'Auto update — reload automatically; unsaved changes may be lost', value: 'autoUpdate' },
    ],
  }) : 'prompt';
  const architecture = await select({
    message: 'Which architecture do you want?',
    choices: architectures.map(([value, description]) => ({ name: `${value} — ${description}`, value })),
  });
  const naming = await select({
    message: 'Which file and folder naming convention do you want?',
    choices: namingConventions.map(([value, example]) => ({ name: `${value} — task card → ${example}`, value })),
  });
  const language = await select({
    message: 'Which language do you want?',
    choices: ['TypeScript', 'JavaScript'].map((value) => ({ name: value, value })),
  });
  const tailwind = await select({
    message: 'Do you want Tailwind CSS?',
    choices: [{ name: 'Yes', value: true }, { name: 'No', value: false }],
  });
  const shadcn = tailwind ? await select({
    message: 'Do you want shadcn/ui?',
    choices: [{ name: 'Yes', value: true }, { name: 'No', value: false }],
  }) : false;

  const formatter = await select({
    message: 'Which formatter do you want?',
    choices: [
      { name: 'Biome', value: 'Biome' },
      { name: 'Prettier', value: 'Prettier' },
      { name: 'No formatter', value: 'None' },
    ],
  });
  // Vite itself uses esbuild; this option controls a separate, direct dependency.
  const esbuild = formatter === 'Prettier' ? await select({
    message: 'Do you want esbuild as a direct dependency? (Vite already uses esbuild)',
    choices: [{ name: 'Yes', value: true }, { name: 'No', value: false }],
  }) : false;
  const axios = await select({
    message: 'Do you want Axios?',
    choices: [{ name: 'Yes', value: true }, { name: 'No', value: false }],
  });
  const graphify = await select({
    message: 'Do you want Graphify?',
    choices: [{ name: 'Yes', value: true }, { name: 'No', value: false }],
  });
  const testing = await select({
    message: 'Which testing tools do you want?',
    choices: [
      { name: 'Vitest + React Testing Library (Recommended)', value: 'Vitest' },
      { name: 'No testing tools', value: 'None' },
    ],
  });
  const tanstack = await checkbox({
    message: 'Which TanStack tools do you want to use?',
    choices: tanstackTools,
    instructions: 'Use space to select, enter to continue.',
  });

  console.log(`\nProject: ${projectName}\nDestination: ${targetDir}\nPWA: ${pwa ? 'Yes' : 'No'}${pwa ? `\nService worker strategy: ${pwaStrategy}\nPWA updates: ${pwaUpdate}` : ''}\nArchitecture: ${architecture}\nNaming: ${naming}\nLanguage: ${language}\nTailwind CSS: ${tailwind ? 'Yes' : 'No'}\nshadcn/ui: ${shadcn ? 'Yes' : 'No'}\nFormatter: ${formatter}\nDirect esbuild dependency: ${esbuild ? 'Yes' : 'No'}\nAxios: ${axios ? 'Yes' : 'No'}\nGraphify: ${graphify ? 'Yes' : 'No'}\nTesting: ${testing === 'Vitest' ? 'Vitest + React Testing Library' : 'None'}\nTanStack: ${tanstack.length ? tanstack.join(', ') : 'None'}\n`);
  if (!await confirm({ message: 'Create this project?', default: true })) {
    console.log('Project creation cancelled.');
    return;
  }

  await generateProject({ projectName, targetDir, useExistingDirectory, pwa, pwaStrategy, pwaUpdate, architecture, naming, language, tailwind, shadcn, formatter, esbuild, axios, graphify, testing, tanstack });
  console.log(`\nProject created successfully. Next steps:\n\n${useExistingDirectory ? '' : `  cd ${projectName}\n`}  npm install\n  npm run dev\n`);
}

main().catch((error) => {
  if (error.name === 'ExitPromptError' || error.name === 'AbortError') {
    console.log('\nProject creation cancelled.');
    return;
  }
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
