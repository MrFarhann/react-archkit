import path from 'node:path';

/** Generate architecture-specific source files. Paths returned by this module are package independent. */
export function architectureFiles({ architecture, language, naming, shadcn }) {
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
  // Keep the page shell consistent while leaving each architecture's feature wiring intact.
  const topbar = `<header className="topbar"><a className="brand" href="/" aria-label="Daymark home"><span className="brand-mark" aria-hidden="true">✦</span><span className="brand-name">daymark<span>.</span></span></a><span className="topbar-badge"><span aria-hidden="true">✳</span> A little more focus</span></header>`;
  const hero = `<section className="hero"><p className="eyebrow"><span aria-hidden="true">✦</span> MAKE ROOM FOR WHAT MATTERS</p><h1 className="hero-title">A little progress,<br /><em>every day.</em></h1><p className="hero-copy">Clear your mind, find your focus, and make space for the things that matter most.</p></section>`;
  const workspaceHeading = `<div className="section-heading"><div><p className="section-kicker">YOUR SPACE</p><h2>Things to do<span>.</span></h2></div><span className="task-count">Your list</span></div>`;
  const listHeading = `<div className="list-heading"><p className="list-label">YOUR TASKS</p><span className="list-count">A little at a time</span></div>`;
  const empty = `<div className="empty"><span className="empty-icon" aria-hidden="true">✓</span><p className="empty-title">A fresh start awaits.</p><p className="empty-copy">Add your first task and make today count.</p></div>`;
  const footer = `<footer className="footer"><p className="footer-copy">Made for a little more clarity <span aria-hidden="true">✦</span></p><nav className="footer-links" aria-label="Project links"><a href="https://github.com/MrFarhann" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a><a href="https://vite.dev/" target="_blank" rel="noopener noreferrer">Vite <span aria-hidden="true">↗</span></a></nav></footer>`;
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
${shadcn ? `import { Button } from '@/${architecture === 'Feature-Sliced Design (FSD)' ? 'shared' : 'components'}/ui/button';\n` : ''}
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
      <div className="input-wrap"><span aria-hidden="true">+</span><input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task to your list..." /></div>
      ${shadcn ? '<Button className="add-button" type="submit">Add task <span aria-hidden="true">↗</span></Button>' : '<button className="add-button" type="submit">Add task <span aria-hidden="true">↗</span></button>'}
    </form>
  );
}
`);
  const toggle = (p) => put(p, `export function ToggleTaskButton({ title, completed, onToggle }${ts ? ': { title: string; completed: boolean; onToggle: () => void }' : ''}) {
  return <button type="button" className="toggle" aria-pressed={completed} aria-label={(completed ? 'Mark incomplete: ' : 'Mark complete: ') + title} onClick={onToggle}>{completed ? 'Completed' : 'Mark complete'}</button>;
}
`);
  const list = (p, modelPath, togglePath) => put(p, `${ts ? `import type { Task } from '${rel(p, modelPath)}';\n` : ''}${togglePath ? `import { ToggleTaskButton } from '${rel(p, togglePath)}';\n` : ''}
export function TaskList({ tasks, onToggle }${ts ? ': { tasks: Task[]; onToggle: (id: string) => void }' : ''}) {
  if (tasks.length === 0) return ${empty};
  return <ul className="task-list">{tasks.map((task) => <li key={task.id} className="task-row">
    <span className={task.completed ? 'task-title completed' : 'task-title'}>{task.title}</span>
    ${togglePath ? '<ToggleTaskButton title={task.title} completed={task.completed} onToggle={() => onToggle(task.id)} />' : '<button type="button" className="toggle" aria-pressed={task.completed} aria-label={(task.completed ? \'Mark incomplete: \' : \'Mark complete: \') + task.title} onClick={() => onToggle(task.id)}>{task.completed ? \'Completed\' : \'Mark complete\'}</button>'}
  </li>)}</ul>;
}
`);
  const basicApp = (p, hookPath, formPath, listPath) => put(p, `import { useTasks } from '${rel(p, hookPath)}';
import { AddTaskForm } from '${rel(p, formPath)}';
import { TaskList } from '${rel(p, listPath)}';

export default function App() {
  const { tasks, addTask, changeTask } = useTasks();
  return <div className="page-shell">${topbar}<main className="app">${hero}<section className="workspace" aria-label="Task list">${workspaceHeading}
    <AddTaskForm onAdd={addTask} />${listHeading}<TaskList tasks={tasks} onToggle={changeTask} />
  </section></main>${footer}</div>;
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
    put(card, `${ts ? "import type { ReactNode } from 'react';\n" : ''}export function TaskShell({ children }${ts ? ': { children: ReactNode }' : ''}) { return <div className="page-shell">${topbar}<main className="app">{children}</main>${footer}</div>; }\n`);
    put(p, `import { useState } from 'react';
import { createTask, toggleTask, TaskItem${ts ? ', type Task' : ''} } from '${rel(p, entityIndex)}';
import { AddTaskForm } from '${rel(p, fi)}';
import { ToggleTaskButton } from '${rel(p, ti)}';
import { TaskShell } from '${rel(p, card)}';

export function TaskPage() {
  const [tasks, setTasks] = useState${ts ? '<Task[]>' : ''}([]);
  function addTask(title${ts ? ': string' : ''}) { setTasks((current) => [...current, createTask(title)]); }
  function changeTask(id${ts ? ': string' : ''}) { setTasks((current) => current.map((task) => task.id === id ? toggleTask(task) : task)); }
  return <TaskShell>${hero}<section className="workspace" aria-label="Task list">${workspaceHeading}
    <AddTaskForm onAdd={addTask} />${listHeading}
    {tasks.length === 0 ? ${empty} : <ul className="task-list">{tasks.map((task) => <TaskItem key={task.id} task={task} action={<ToggleTaskButton title={task.title} completed={task.completed} onToggle={() => changeTask(task.id)} />} />)}</ul>}
  </section>
  </TaskShell>;
}
`);
    put(pi, `export { TaskPage } from '${rel(pi, p)}';\n`);
    put(appPath, `import { TaskPage } from '${rel(appPath, pi)}';\nexport default function App() { return <TaskPage />; }\n`);
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
    put(template, `${ts ? "import type { ReactNode } from 'react';\n" : ''}export function TaskTemplate({ form, list }${ts ? ': { form: ReactNode; list: ReactNode }' : ''}) {
  return <div className="page-shell">${topbar}<main className="app">${hero}<section className="workspace" aria-label="Task list">${workspaceHeading}{form}${listHeading}{list}</section></main>${footer}</div>;
}
`);
    put(page, `import { useTasks } from '${rel(page, h)}';
import { AddTaskForm } from '${rel(page, f)}';
import { TaskList } from '${rel(page, l)}';
import { TaskTemplate } from '${rel(page, template)}';
export function TaskPage() {
  const { tasks, addTask, changeTask } = useTasks();
  return <TaskTemplate form={<AddTaskForm onAdd={addTask} />} list={<TaskList tasks={tasks} onToggle={changeTask} />} />;
}
`);
    put(appPath, `import { TaskPage } from '${rel(appPath, page)}';\nexport default function App() { return <TaskPage />; }\n`);
  } else throw new Error(`Unknown architecture: ${architecture}`);
  return { files, appPath: appPath.slice(4) };
}
