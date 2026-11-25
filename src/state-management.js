import { starterFooter } from './architectures.js';

/** Add one state library, a shared counter and a small, removable UI example. */
export function applyStateManagement(files, pkg, options) {
  const { stateManagement, language, shadcn, architecture } = options;
  if (stateManagement === 'none') return;

  const ts = language === 'TypeScript';
  const mod = ts ? 'ts' : 'js';
  const ext = ts ? 'tsx' : 'jsx';
  const storePath = `src/state/store.${mod}`;
  const demoPath = `src/state/state-example.${ext}`;
  const ui = architecture === 'Feature-Sliced Design (FSD)' ? 'shared' : 'components';
  let imports;
  let hook;
  let label;

  if (stateManagement === 'zustand') {
    pkg.dependencies.zustand = '5.1.0';
    files[storePath] = `import { create } from 'zustand';\n\n${ts ? 'type CounterState = { count: number; increment: () => void };\n\n' : ''}export const useCounterStore = create${ts ? '<CounterState>()' : ''}((set) => ({\n  count: 0,\n  increment: () => set((state) => ({ count: state.count + 1 })),\n}));\n`;
    imports = "import { useCounterStore } from './store';";
    hook = `  const count = useCounterStore((state) => state.count);\n  const increment = useCounterStore((state) => state.increment);`;
    label = 'Zustand';
  } else if (stateManagement === 'redux-toolkit') {
    pkg.dependencies['@reduxjs/toolkit'] = '2.15.0';
    pkg.dependencies['react-redux'] = '9.3.1';
    files[storePath] = `import { configureStore, createSlice } from '@reduxjs/toolkit';\n${ts ? "import { useDispatch, useSelector } from 'react-redux';\n" : ''}\nconst counterSlice = createSlice({\n  name: 'counter',\n  initialState: { count: 0 },\n  reducers: { increment: (state) => { state.count += 1; } },\n});\n\nexport const { increment } = counterSlice.actions;\nexport const store = configureStore({ reducer: { counter: counterSlice.reducer } });\n${ts ? "\nexport type RootState = ReturnType<typeof store.getState>;\nexport type AppDispatch = typeof store.dispatch;\nexport const useAppDispatch = useDispatch.withTypes<AppDispatch>();\nexport const useAppSelector = useSelector.withTypes<RootState>();\n" : ''}`;
    const mainPath = `src/main.${ext}`;
    const original = files[mainPath];
    const open = '<React.StrictMode>';
    const close = '</React.StrictMode>';
    if (!original?.includes(open) || !original.includes(close)) throw new Error('Cannot attach the Redux provider to the generated entry point.');
    files[mainPath] = `import { Provider } from 'react-redux';\nimport { store } from './state/store';\n${original}`
      .replace(open, `${open}<Provider store={store}>`)
      .replace(close, `</Provider>${close}`);
    imports = ts ? "import { increment, useAppDispatch, useAppSelector } from './store';" : "import { useDispatch, useSelector } from 'react-redux';\nimport { increment } from './store';";
    hook = ts ? `  const count = useAppSelector((state) => state.counter.count);\n  const dispatch = useAppDispatch();` : `  const count = useSelector((state) => state.counter.count);\n  const dispatch = useDispatch();`;
    label = 'Redux Toolkit';
  } else if (stateManagement === 'rosma') {
    pkg.dependencies.rosma = '1.6.1';
    files[storePath] = `import { Observer, useObserver } from 'rosma';\n\n${ts ? 'type CounterState = { count: number };\n\n' : ''}export const counterObserver = new Observer${ts ? '<CounterState>' : ''}({ count: 0 });\n\nexport function useCounterObserver() {\n  return useObserver${ts ? '<CounterState>' : ''}(counterObserver);\n}\n`;
    imports = "import { useCounterObserver } from './store';";
    hook = `  const { count, setCount } = useCounterObserver();`;
    label = 'Rosma';
  } else throw new Error('Invalid state management selection.');

  const update = stateManagement === 'redux-toolkit' ? '() => dispatch(increment())' : stateManagement === 'rosma' ? '() => setCount((previous) => previous + 1)' : 'increment';
  const button = shadcn ? 'Button' : 'button';
  const container = shadcn ? 'Card' : 'section';
  const uiImports = shadcn ? `import { Button } from '@/${ui}/ui/button';\nimport { Card } from '@/${ui}/ui/card';\n` : '';
  files[demoPath] = `${uiImports}${imports}\n\nexport function StateExample() {\n${hook}\n  return (\n    <${container} className="state-example" aria-label="${label} state example">\n      <div>\n        <p className="state-example-kicker">STATE MANAGEMENT</p>\n        <h2>Shared state with ${label}</h2>\n        <p>A small shared counter to help you get started.</p>\n      </div>\n      <div className="state-example-controls">\n        <p aria-live="polite">Shared count: <strong>{count}</strong></p>\n        <${button} type="button" className="state-example-button" onClick={${update}} aria-label="Increase shared count">Add one <span aria-hidden="true">↗</span></${button}>\n      </div>\n    </${container}>\n  );\n}\n`;
  const candidates = Object.keys(files).filter((file) => file.startsWith('src/') && !file.startsWith('src/routes/') && /\.[jt]sx$/.test(file) && files[file].includes(starterFooter));
  if (candidates.length !== 1) throw new Error('Cannot find the generated application footer for the state example.');
  const appFile = candidates[0];
  files[appFile] = `import { StateExample } from '@/state/state-example';\n${files[appFile].replace(starterFooter, `<StateExample />\n      ${starterFooter}`)}`;
  files['src/index.css'] += `\n/* Optional state management example */\n.state-example { width: min(1080px, calc(100% - 80px)); margin: 0 auto 72px; padding: 26px; border: 1px solid #dfe8da; border-radius: 18px; background: #f8fbf6; color: #294d39; display: flex; align-items: center; justify-content: space-between; gap: 24px; }\n.state-example h2 { margin: 4px 0 8px; font-size: 22px; color: #20382c; }\n.state-example p { margin: 0; }\n.state-example-kicker { color: #648568; font-size: 10px; font-weight: 700; letter-spacing: .14em; }\n.state-example-controls { display: flex; align-items: center; gap: 16px; }\n.state-example-button { border: 0; border-radius: 10px; background: #294d39; color: white; padding: 12px 16px; cursor: pointer; }\n.state-example-button:hover { background: #36634a; }\n.state-example-button:focus-visible { outline: 3px solid #526e50; outline-offset: 3px; }\n@media (max-width: 600px) { .state-example { width: calc(100% - 36px); flex-direction: column; align-items: flex-start; } .state-example-controls { width: 100%; justify-content: space-between; } }\n`;
  files['README.md'] += `\n## State management\n\nThis project uses ${label}. The configured store is in \`${storePath}\` and the working shared-counter example is in \`${demoPath}\`. The task-list starter uses its own local React state; adapt it or replace the example as needed.${stateManagement === 'redux-toolkit' ? ' Redux Provider is configured in the application entry point.' : ''}\n`;
}
