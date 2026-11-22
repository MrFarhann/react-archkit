import path from 'node:path';

/** Shared footer for every generated page, including Router routes. */
export const starterFooter = `<footer className="footer">
        <div className="footer-attribution">
          <p className="footer-copy">A little progress goes a long way <span aria-hidden="true">✳</span></p>
          <p className="footer-credit">Developed by <a href="https://github.com/MrFarhann" target="_blank" rel="noopener noreferrer">Farhan (@MrFarhann)</a></p>
        </div>
        <nav className="footer-links" aria-label="Project links">
          <a href="https://github.com/MrFarhann/react-archkit" target="_blank" rel="noopener noreferrer">React ArchKit <span aria-hidden="true">↗</span></a>
          <a href="https://vite.dev/" target="_blank" rel="noopener noreferrer">Vite <span aria-hidden="true">↗</span></a>
        </nav>
      </footer>`;

/** Generate architecture-specific source files. Paths returned by this module are package independent. */
export function architectureFiles({ architecture, language, naming, shadcn, tanstack = [] }) {
  const ts = language === 'TypeScript';
  const ext = ts ? 'tsx' : 'jsx';
  const mod = ts ? 'ts' : 'js';
  const files = {};
  const name = (value) => {
    const words = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[\s_-]+/).filter(Boolean).map((word) => word.toLowerCase());
    const cap = (word) => word[0].toUpperCase() + word.slice(1);
    switch (naming) {
      case 'camelCase': return words[0] + words.slice(1).map(cap).join('');
      case 'PascalCase': return words.map(cap).join('');
      case 'snake_case': return words.join('_');
      case 'UPPER_CASE': return words.join('_').toUpperCase();
      default: return words.join('-');
    }
  };
  const file = (dirs, basename, extension = ext) => `src/${dirs.map((part) => part.startsWith('!') ? part.slice(1) : name(part)).join('/')}${dirs.length ? '/' : ''}${name(basename)}.${extension}`;
  const fixedIndex = (dirs) => `src/${dirs.map((part) => part.startsWith('!') ? part.slice(1) : name(part)).join('/')}/index.${mod}`;
  const rel = (from, to) => {
    let result = path.posix.relative(path.posix.dirname(from), to).replace(/\.(tsx|jsx|ts|js)$/, '');
    if (!result.startsWith('.')) result = `./${result}`;
    return result;
  };
  const put = (p, s) => { files[p] = s.trimStart(); };
  const hasExamples = tanstack.some((tool) => tool !== 'router');
  const examplesImport = hasExamples ? "import { TanStackExamples } from '@/tanstack-examples';\n" : '';
  // Keep one coherent shell while leaving each architecture's feature wiring intact.
  const uiBase = architecture === 'Feature-Sliced Design (FSD)' ? 'shared' : 'components';
  const cardImport = shadcn ? `import { Card } from '@/${uiBase}/ui/card';\n` : '';
  const workspaceOpen = shadcn ? '<Card className="workspace" role="region" aria-label="Task list">' : '<section className="workspace" aria-label="Task list">';
  const workspaceClose = shadcn ? '</Card>' : '</section>';
  // The Router root renders the shared header on every route when enabled.
  const topbar = tanstack.includes('router') ? '' : `<header className="topbar">
        <a className="brand" href="/" aria-label="Daymark home">
          <span className="brand-mark" aria-hidden="true">✳</span>
          <span className="brand-copy">
            <span className="brand-name">daymark<span>.</span></span>
            <span className="brand-caption">A LITTLE SPACE FOR YOU</span>
          </span>
        </a>
        <span className="topbar-badge"><span className="topbar-status-dot" aria-hidden="true"></span> YOUR DAILY SPACE</span>
      </header>`;
  const hero = `<section className="hero">
          <p className="eyebrow"><span aria-hidden="true">✳</span> MAKE SPACE FOR WHAT MATTERS</p>
          <h1 className="hero-title">A little less noise.<br /><em>A little more focus.</em></h1>
          <p className="hero-copy">A quiet place for the things on your mind. Write them down, take a breath, and start wherever you are.</p>
          <p className="hero-meta"><span className="hero-meta-dot" aria-hidden="true"></span> SMALL STEPS, EVERY DAY</p>
        </section>`;
  const workspaceHeading = `<div className="section-heading">
            <div className="workspace-intro">
              <p className="section-kicker">YOUR WORKSPACE</p>
              <h2>Today’s list<span>.</span></h2>
              <p className="workspace-helper">One thing at a time. You’ve got this.</p>
            </div>
            <span className="task-count">{taskCount} {taskCount === 1 ? 'task' : 'tasks'}</span>
          </div>`;
  const listHeading = `<div className="list-heading">
            <p className="list-label">YOUR TASKS</p>
            <span className="list-count" aria-live="polite" aria-atomic="true">{completedCount} of {taskCount} done</span>
          </div>`;
  const empty = `<div className="empty">
      <span className="empty-icon" aria-hidden="true">✳</span>
      <p className="empty-title">A clear space to begin.</p>
      <p className="empty-copy">Add a task above and make room for what matters.</p>
    </div>`;
  const footer = starterFooter;
  const model = (p) => put(p, `${ts ? 'export type Task = { id: string; title: string; completed: boolean };\n\n' : ''}export function createTask(title${ts ? ': string' : ''})${ts ? ': Task' : ''} {
  return { id: crypto.randomUUID(), title, completed: false };
}

export function toggleTask(task${ts ? ': Task' : ''})${ts ? ': Task' : ''} {
  return { ...task, completed: !task.completed };
}
`);
  const hook = (p, modelPath) => put(p, `import { useState } from 'react';
import { createTask, toggleTask${ts ? ', type Task' : ''} } from '${rel(p, modelPath)}';

export function useTasks() {
  const [tasks, setTasks] = useState${ts ? '<Task[]>' : ''}([]);
  function addTask(title${ts ? ': string' : ''}) {
    setTasks((current) => [...current, createTask(title)]);
  }
  function changeTask(id${ts ? ': string' : ''}) {
    setTasks((current) => current.map((task) => task.id === id ? toggleTask(task) : task));
  }
  return { tasks, addTask, changeTask };
}
`);
  const form = (p) => put(p, `import { useState${ts ? ', type FormEvent' : ''} } from 'react';
${shadcn ? `import { Button } from '@/${uiBase}/ui/button';\nimport { Input } from '@/${uiBase}/ui/input';\n` : ''}
export function AddTaskForm({ onAdd }${ts ? ': { onAdd: (title: string) => void }' : ''}) {
  const [title, setTitle] = useState('');
  function submit(event${ts ? ': FormEvent<HTMLFormElement>' : ''}) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    onAdd(value);
    setTitle('');
  }
  return (
    <form className="task-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="task-title">New task</label>
      <div className="input-wrap"><span aria-hidden="true">+</span>${shadcn ? '<Input' : '<input'} className="task-input" id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What would you like to do?" /></div>
      ${shadcn ? '<Button className="add-button" type="submit">Add task <span aria-hidden="true">↗</span></Button>' : '<button className="add-button" type="submit">Add task <span aria-hidden="true">↗</span></button>'}
    </form>
  );
}
`);
  const toggle = (p) => put(p, `${shadcn ? `import { Button } from '@/${uiBase}/ui/button';\n` : ''}export function ToggleTaskButton({ title, completed, onToggle }${ts ? ': { title: string; completed: boolean; onToggle: () => void }' : ''}) {
  return ${shadcn ? '<Button variant="outline" size="sm"' : '<button'} type="button" className="toggle" aria-pressed={completed} aria-label={(completed ? 'Mark incomplete: ' : 'Mark complete: ') + title} onClick={onToggle}>{completed ? 'Completed' : 'Mark complete'}${shadcn ? '</Button>' : '</button>'};
}
`);
  const list = (p, modelPath, togglePath) => put(p, `${ts ? `import type { Task } from '${rel(p, modelPath)}';\n` : ''}${togglePath ? `import { ToggleTaskButton } from '${rel(p, togglePath)}';\n` : ''}
${shadcn && !togglePath ? `import { Button } from '@/${uiBase}/ui/button';\n` : ''}
export function TaskList({ tasks, onToggle }${ts ? ': { tasks: Task[]; onToggle: (id: string) => void }' : ''}) {
  if (tasks.length === 0) return ${empty};
  return <ul className="task-list">{tasks.map((task) => <li key={task.id} className="task-row">
    <span className={task.completed ? 'task-title completed' : 'task-title'}>{task.title}</span>
    ${togglePath ? '<ToggleTaskButton title={task.title} completed={task.completed} onToggle={() => onToggle(task.id)} />' : `${shadcn ? '<Button variant="outline" size="sm"' : '<button'} type="button" className="toggle" aria-pressed={task.completed} aria-label={(task.completed ? 'Mark incomplete: ' : 'Mark complete: ') + task.title} onClick={() => onToggle(task.id)}>{task.completed ? 'Completed' : 'Mark complete'}${shadcn ? '</Button>' : '</button>'}`}
  </li>)}</ul>;
}
`);
  const basicApp = (p, hookPath, formPath, listPath) => put(p, `${cardImport}${examplesImport}import { useTasks } from '${rel(p, hookPath)}';
import { AddTaskForm } from '${rel(p, formPath)}';
import { TaskList } from '${rel(p, listPath)}';

export default function App() {
  const { tasks, addTask, changeTask } = useTasks();
  const taskCount = tasks.length;
  const completedCount = tasks.filter((task) => task.completed).length;
  return (
    <div className="page-shell">
      ${topbar}
      <main className="app">
        ${hero}
        ${workspaceOpen}
          ${workspaceHeading}
          <AddTaskForm onAdd={addTask} />
          <p className="task-form-hint">Add what’s on your mind. The rest can wait.</p>
          ${listHeading}
          <TaskList tasks={tasks} onToggle={changeTask} />
        ${workspaceClose}
      </main>
      ${hasExamples ? '<TanStackExamples />' : ''}
      ${footer}
    </div>
  );
}
`);

  let appPath;
  if (architecture === 'Type-Based') {
    const m = file(['!utils'], 'task', mod), h = file(['!hooks'], 'use tasks', mod);
    const f = file(['!components'], 'add task form'), l = file(['!components'], 'task list');
    appPath = file([], 'app');
    model(m); hook(h, m); form(f); list(l, m); basicApp(appPath, h, f, l);
  } else if (architecture === 'Feature-Based') {
    const m = file(['!tasks'], 'task', mod), h = file(['!tasks'], 'use tasks', mod);
    const f = file(['!features', 'add task'], 'add task form');
    const t = file(['!features', 'toggle task'], 'toggle task button');
    const l = file(['!features', 'task list'], 'task list');
    appPath = file([], 'app');
    model(m); hook(h, m); form(f); toggle(t); list(l, m, t); basicApp(appPath, h, f, l);
  } else if (architecture === 'Domain-Based') {
    const base = ['!domains', 'tasks'];
    const m = file([...base, '!model'], 'task', mod), h = file([...base, '!application'], 'use tasks', mod);
    const f = file([...base, '!ui'], 'add task form'), l = file([...base, '!ui'], 'task list');
    appPath = file(['!app'], 'app');
    model(m); hook(h, m); form(f); list(l, m); basicApp(appPath, h, f, l);
  } else if (architecture === 'Feature-Sliced Design (FSD)') {
    const entity = ['!entities', 'task'];
    const m = file([...entity, '!model'], 'task', mod), item = file([...entity, '!ui'], 'task item');
    const entityIndex = fixedIndex(entity);
    const add = ['!features', 'add task'], tog = ['!features', 'toggle task'];
    const f = file([...add, '!ui'], 'add task form'), t = file([...tog, '!ui'], 'toggle task button');
    const fi = fixedIndex(add), ti = fixedIndex(tog);
    const page = ['!pages', 'tasks'], p = file([...page, '!ui'], 'task page'), pi = fixedIndex(page);
    const card = file(['!shared', '!ui'], 'task shell');
    appPath = file(['!app'], 'app');
    model(m); form(f); toggle(t);
    put(item, `${ts ? `import type { ReactNode } from 'react';\nimport type { Task } from '${rel(item, m)}';\n` : ''}
export function TaskItem({ task, action }${ts ? ': { task: Task; action: ReactNode }' : ''}) {
  return <li className="task-row"><span className={task.completed ? 'task-title completed' : 'task-title'}>{task.title}</span>{action}</li>;
}
`);
    put(entityIndex, `export { createTask, toggleTask${ts ? ', type Task' : ''} } from '${rel(entityIndex, m)}';\nexport { TaskItem } from '${rel(entityIndex, item)}';\n`);
    put(fi, `export { AddTaskForm } from '${rel(fi, f)}';\n`);
    put(ti, `export { ToggleTaskButton } from '${rel(ti, t)}';\n`);
    put(card, `${ts ? "import type { ReactNode } from 'react';\n" : ''}export function TaskShell({ children${hasExamples ? ', examples' : ''} }${ts ? `: { children: ReactNode${hasExamples ? '; examples: ReactNode' : ''} }` : ''}) { return <div className="page-shell">${topbar}<main className="app">{children}</main>${hasExamples ? '{examples}' : ''}${footer}</div>; }\n`);
    put(p, `${cardImport}import { useState${ts && hasExamples ? ', type ReactNode' : ''} } from 'react';
import { createTask, toggleTask, TaskItem${ts ? ', type Task' : ''} } from '${rel(p, entityIndex)}';
import { AddTaskForm } from '${rel(p, fi)}';
import { ToggleTaskButton } from '${rel(p, ti)}';
import { TaskShell } from '${rel(p, card)}';

export function TaskPage(${hasExamples ? `{ examples }${ts ? ': { examples: ReactNode }' : ''}` : ''}) {
  const [tasks, setTasks] = useState${ts ? '<Task[]>' : ''}([]);
  const taskCount = tasks.length;
  const completedCount = tasks.filter((task) => task.completed).length;
  function addTask(title${ts ? ': string' : ''}) { setTasks((current) => [...current, createTask(title)]); }
  function changeTask(id${ts ? ': string' : ''}) { setTasks((current) => current.map((task) => task.id === id ? toggleTask(task) : task)); }
  return (
    <TaskShell${hasExamples ? ' examples={examples}' : ''}>
      ${hero}
      ${workspaceOpen}
        ${workspaceHeading}
        <AddTaskForm onAdd={addTask} />
        <p className="task-form-hint">Add what’s on your mind. The rest can wait.</p>
        ${listHeading}
        {tasks.length === 0 ? ${empty} : <ul className="task-list">{tasks.map((task) => <TaskItem key={task.id} task={task} action={<ToggleTaskButton title={task.title} completed={task.completed} onToggle={() => changeTask(task.id)} />} />)}</ul>}
      ${workspaceClose}
    </TaskShell>
  );
}
`);
    put(pi, `export { TaskPage } from '${rel(pi, p)}';\n`);
    put(appPath, `${examplesImport}import { TaskPage } from '${rel(appPath, pi)}';\nexport default function App() { return <TaskPage${hasExamples ? ' examples={<TanStackExamples />}' : ''} />; }\n`);
  } else if (architecture === 'Atomic Design') {
    const m = file(['!tasks'], 'task', mod), h = file(['!tasks'], 'use tasks', mod);
    const atom = file(['!components', '!atoms'], 'task toggle');
    const f = file(['!components', '!molecules'], 'add task form');
    const item = file(['!components', '!molecules'], 'task item');
    const l = file(['!components', '!organisms'], 'task list');
    const template = file(['!components', '!templates'], 'task template');
    const page = file(['!pages'], 'task page');
    appPath = file([], 'app');
    model(m); hook(h, m); form(f); toggle(atom);
    put(item, `${ts ? `import type { Task } from '${rel(item, m)}';\n` : ''}import { ToggleTaskButton } from '${rel(item, atom)}';
export function TaskItem({ task, onToggle }${ts ? ': { task: Task; onToggle: (id: string) => void }' : ''}) {
  return <li className="task-row"><span className={task.completed ? 'task-title completed' : 'task-title'}>{task.title}</span><ToggleTaskButton title={task.title} completed={task.completed} onToggle={() => onToggle(task.id)} /></li>;
}
`);
    put(l, `${ts ? `import type { Task } from '${rel(l, m)}';\n` : ''}import { TaskItem } from '${rel(l, item)}';
export function TaskList({ tasks, onToggle }${ts ? ': { tasks: Task[]; onToggle: (id: string) => void }' : ''}) {
  if (!tasks.length) return ${empty};
  return <ul className="task-list">{tasks.map((task) => <TaskItem key={task.id} task={task} onToggle={onToggle} />)}</ul>;
}
`);
    put(template, `${cardImport}${ts ? "import type { ReactNode } from 'react';\n" : ''}export function TaskTemplate({ form, list, taskCount, completedCount${hasExamples ? ', examples' : ''} }${ts ? `: { form: ReactNode; list: ReactNode; taskCount: number; completedCount: number${hasExamples ? '; examples: ReactNode' : ''} }` : ''}) {
  return (
    <div className="page-shell">
      ${topbar}
      <main className="app">
        ${hero}
        ${workspaceOpen}
          ${workspaceHeading}
          {form}
          <p className="task-form-hint">Add what’s on your mind. The rest can wait.</p>
          ${listHeading}
          {list}
        ${workspaceClose}
      </main>
      ${hasExamples ? '{examples}' : ''}
      ${footer}
    </div>
  );
}
`);
    put(page, `${hasExamples && ts ? "import type { ReactNode } from 'react';\n" : ''}import { useTasks } from '${rel(page, h)}';
import { AddTaskForm } from '${rel(page, f)}';
import { TaskList } from '${rel(page, l)}';
import { TaskTemplate } from '${rel(page, template)}';
export function TaskPage(${hasExamples ? `{ examples }${ts ? ': { examples: ReactNode }' : ''}` : ''}) {
  const { tasks, addTask, changeTask } = useTasks();
  return <TaskTemplate form={<AddTaskForm onAdd={addTask} />} list={<TaskList tasks={tasks} onToggle={changeTask} />} taskCount={tasks.length} completedCount={tasks.filter((task) => task.completed).length}${hasExamples ? ' examples={examples}' : ''} />;
}
`);
    put(appPath, `${examplesImport}import { TaskPage } from '${rel(appPath, page)}';\nexport default function App() { return <TaskPage${hasExamples ? ' examples={<TanStackExamples />}' : ''} />; }\n`);
  } else throw new Error(`Unknown architecture: ${architecture}`);
  return { files, appPath: appPath.slice(4) };
}
