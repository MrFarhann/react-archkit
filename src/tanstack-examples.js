// Each selected adapter has a small runnable example. Keep these integration
// paths stable across naming conventions so the entry point can import them.
const versions = {
  query: ['@tanstack/react-query', '5.108.2'],
  table: ['@tanstack/react-table', '8.21.3'],
  form: ['@tanstack/react-form', '1.33.5'],
  virtual: ['@tanstack/react-virtual', '3.14.26'],
  store: ['@tanstack/react-store', '0.11.2'],
  charts: ['@tanstack/charts', '1.5.0'],
};

/** Add selected React adapters, examples, and the shared Query provider. */
export function applyTanstackExamples(files, pkg, options) {
  const selected = options.tanstack || [];
  const tools = Object.keys(versions).filter((tool) => selected.includes(tool));
  if (!tools.length) return;

  const ts = options.language === 'TypeScript';
  const ext = ts ? 'tsx' : 'jsx';
  const uiBase = options.architecture === 'Feature-Sliced Design (FSD)' ? 'shared' : 'components';
  const inputTag = options.shadcn ? 'Input' : 'input';
  const buttonTag = options.shadcn ? 'Button' : 'button';
  const imports = [];
  const blocks = [];
  const examples = [];
  if (options.shadcn) {
    imports.push(`import { Card } from '@/${uiBase}/ui/card';`);
    if (selected.includes('form') || selected.includes('store')) imports.push(`import { Button } from '@/${uiBase}/ui/button';`);
    if (selected.includes('form')) imports.push(`import { Input } from '@/${uiBase}/ui/input';`);
  }
  for (const tool of tools) {
    const [dependency, version] = versions[tool];
    pkg.dependencies[dependency] = version;
  }

  if (selected.includes('query')) {
    imports.push("import { useQuery } from '@tanstack/react-query';");
    blocks.push(`function QueryExample() {
  // Replace this local async function with your API request.
  const query = useQuery({ queryKey: ['sample-greeting'], queryFn: async () => 'Ready to fetch and cache data.' });
  if (query.isPending) return <p className="tanstack-query-status" role="status">Loading query...</p>;
  if (query.isError) return <p role="alert">Could not load the query.</p>;
  return <div className="tanstack-query-result"><span className="tanstack-status-dot" aria-hidden="true" /><p>{query.data}</p></div>;
}`);
    examples.push(['Query', 'QueryExample', 'A local async example to connect to your API.']);
  }

  if (selected.includes('table')) {
    imports.push("import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';");
    blocks.push(`const tableData = [{ name: 'Plan the week', status: 'Ready' }, { name: 'Review progress', status: 'In progress' }];
const tableColumns = [{ accessorKey: 'name', header: 'Task' }, { accessorKey: 'status', header: 'Status' }];
function TableExample() {
  const table = useReactTable({ data: tableData, columns: tableColumns, getCoreRowModel: getCoreRowModel() });
  return <div className="tanstack-table-scroll"><table className="tanstack-table"><thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id} scope="col">{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div>;
}`);
    examples.push(['Table', 'TableExample', 'A simple view of sample tasks.']);
  }

  if (selected.includes('form')) {
    imports.push("import { useState } from 'react';", "import { useForm } from '@tanstack/react-form';");
    if (options.zod) imports.push("import { nameSchema } from '@/forms/schema';");
    blocks.push(`function FormExample() {
  const [message, setMessage] = useState('');
  const form = useForm({
    defaultValues: { name: '' },
    onSubmit: ({ value }) => { setMessage('Hello, ' + value.name.trim() + '!'); },
  });
  return <form className="tanstack-form" onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
    <form.Field name="name" validators={{ onChange: ${options.zod ? 'nameSchema' : "({ value }) => value.trim() ? undefined : 'Please enter a name.'"} }}>
      {(field) => <>
        <div className="tanstack-form-field"><label htmlFor="tanstack-example-name">Your name</label><${inputTag} className="tanstack-input" id="tanstack-example-name" name={field.name} placeholder="Enter your name" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => { field.handleChange(event.target.value); setMessage(''); }} aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0} aria-describedby={field.state.meta.isTouched && field.state.meta.errors.length > 0 ? 'tanstack-example-name-error' : undefined} /></div>
        <${buttonTag} className="tanstack-action" type="submit">Say hello <span aria-hidden="true">↗</span></${buttonTag}>
        {field.state.meta.isTouched && field.state.meta.errors.length > 0 && <span className="tanstack-field-error" id="tanstack-example-name-error" role="alert">{${options.zod ? "field.state.meta.errors.map((error) => typeof error === 'string' ? error : error?.message ?? '').join(', ')" : "field.state.meta.errors.join(', ')"}}</span>}
      </>}
    </form.Field>
    {message && <p className="tanstack-form-message" role="status">{message}</p>}
  </form>;
}`);
    examples.push(['Form', 'FormExample', 'Try a small form with field validation.']);
  }

  if (selected.includes('virtual')) {
    imports.push("import { useRef } from 'react';", "import { useVirtualizer } from '@tanstack/react-virtual';");
    blocks.push(`function VirtualExample() {
  const parentRef = useRef${ts ? '<HTMLDivElement>' : ''}(null);
  const virtualizer = useVirtualizer({ count: 1000, getScrollElement: () => parentRef.current, estimateSize: () => 32, overscan: 4 });
  return <div ref={parentRef} className="tanstack-virtual-list" role="region" aria-label="Virtualized example list" tabIndex={0}>
    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map((item) => <div className="tanstack-virtual-row" key={item.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: item.size, transform: \`translateY(\${item.start}px)\` }}><span aria-hidden="true">{String(item.index + 1).padStart(3, '0')}</span> Item {item.index + 1}</div>)}
    </div>
  </div>;
}`);
    examples.push(['Virtual', 'VirtualExample', 'A scrollable list of 1,000 sample items.']);
  }

  if (selected.includes('store')) {
    imports.push("import { createStore, useSelector } from '@tanstack/react-store';");
    blocks.push(`// Store currently uses a 0.x API. Pin and test upgrades before changing it.
const counterStore = createStore({ count: 0 });
function StoreExample() {
  const count = useSelector(counterStore, (state) => state.count);
  return <div className="tanstack-store"><div><p className="tanstack-store-label">Current count</p><p className="tanstack-store-count" aria-live="polite">{count}</p></div><${buttonTag} className="tanstack-action tanstack-action--outline" type="button" onClick={() => counterStore.setState((state) => ({ ...state, count: state.count + 1 }))}>Increment <span aria-hidden="true">+</span></${buttonTag}></div>;
}`);
    examples.push(['Store', 'StoreExample', 'A tiny shared state example.']);
  }

  if (selected.includes('charts')) {
    imports.push("import { defineChart, lineY } from '@tanstack/charts';", "import { Chart } from '@tanstack/charts/react';", "import { scaleLinear } from '@tanstack/charts/scales/linear';");
    blocks.push(`const weeklyTasks = [{ week: 1, completed: 3 }, { week: 2, completed: 5 }, { week: 3, completed: 4 }, { week: 4, completed: 7 }];
const weeklyTasksChart = defineChart({
  marks: [lineY(weeklyTasks, { x: 'week', y: 'completed', points: true, stroke: '#244130' })],
  scales: { x: { scale: scaleLinear, axis: { label: 'Week' } }, y: { scale: scaleLinear, nice: true, grid: true, axis: { label: 'Tasks completed' } } },
});
function ChartsExample() {
  return <div className="tanstack-chart"><Chart definition={weeklyTasksChart} initialWidth={560} height={220} ariaLabel="Tasks completed each week" /></div>;
}`);
    examples.push(['Charts', 'ChartsExample', 'A sample of completed tasks across four weeks.']);
  }

  const cardTag = options.shadcn ? 'Card' : 'section';
  const nonChartExamples = examples.filter(([name]) => name !== 'Charts');
  const wideExample = nonChartExamples.length % 2 === 1 ? nonChartExamples.at(-1)[0] : null;
  const cards = examples.map(([name, component, description], index) => `      <${cardTag} className="tanstack-example tanstack-example--${name.toLowerCase()}${name === wideExample ? ' tanstack-example--wide' : ''}"${options.shadcn ? ' role="region"' : ''} aria-labelledby="tanstack-${name.toLowerCase()}-title">
        <div className="tanstack-example-heading"><div><p className="tanstack-example-kicker">TANSTACK</p><h3 id="tanstack-${name.toLowerCase()}-title">${name}</h3></div><span className="tanstack-example-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span></div>
        <p className="tanstack-example-description">${description}</p>
        <div className="tanstack-example-body"><${component} /></div>
      </${cardTag}>`).join('\n');
  files[`src/tanstack-examples.${ext}`] = `${imports.join('\n')}\n\n${blocks.join('\n\n')}\n\nexport function TanStackExamples() {\n  return <aside className="tanstack-examples" aria-label="TanStack examples">\n    <header className="tanstack-examples-header"><div><p className="tanstack-examples-eyebrow">EXPLORE YOUR TOOLKIT</p><h2>Little examples, <em>big possibilities.</em></h2><p>A starting point for the TanStack tools you selected. Make them your own.</p></div><span className="tanstack-examples-count">${examples.length} ${examples.length === 1 ? 'example' : 'examples'}</span></header>\n    <div className="tanstack-examples-grid">\n${cards}\n    </div>\n  </aside>;\n}\n`;
  files['src/index.css'] += `
/* Optional TanStack starter examples */
.tanstack-examples { width: min(1080px, calc(100% - 80px)); margin: 0 auto; padding: 26px 0 90px; color: #253d30; }
.tanstack-examples-header { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 26px; }
.tanstack-examples-eyebrow, .tanstack-example-kicker { margin: 0 0 8px; color: #5e7565; font-size: 10px; font-weight: 750; letter-spacing: .14em; line-height: 1.4; }
.tanstack-examples-header h2 { margin: 0; color: #20382c; font-size: clamp(26px, 3vw, 36px); font-weight: 740; letter-spacing: -.045em; line-height: 1.15; }
.tanstack-examples-header h2 em { color: #638a61; font-family: Georgia, 'Times New Roman', serif; font-weight: 400; }
.tanstack-examples-header > div > p:last-child { margin: 10px 0 0; color: #5e7565; font-size: 14px; line-height: 1.6; }
.tanstack-examples-count { flex: none; padding: 7px 10px; border: 1px solid #dfe8da; border-radius: 999px; color: #526d59; background: #f7faf4; font-size: 11px; font-weight: 700; white-space: nowrap; }
.tanstack-examples-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: stretch; }
.tanstack-example { min-width: 0; display: block; padding: 24px; border: 1px solid #e1e8de; border-radius: 18px; color: #253d30; background: #fff; box-shadow: 0 14px 42px rgb(35 63 44 / 5%), 0 2px 8px rgb(35 63 44 / 2%); }
.tanstack-example--charts, .tanstack-example--wide { grid-column: 1 / -1; }
.tanstack-example-heading { display: flex; align-items: start; justify-content: space-between; gap: 12px; }
.tanstack-example-heading h3 { margin: 0; color: #243c2e; font-size: 20px; font-weight: 740; letter-spacing: -.035em; line-height: 1.2; }
.tanstack-example-kicker { margin-bottom: 6px; }
.tanstack-example-number { display: grid; width: 34px; height: 34px; flex: none; place-items: center; border: 1px solid #e5ece1; border-radius: 11px; color: #627d65; background: #f5f9f2; font-size: 11px; font-weight: 750; }
.tanstack-example-description { margin: 10px 0 0; color: #5e7565; font-size: 13px; line-height: 1.55; }
.tanstack-example-body { min-width: 0; margin-top: 22px; }
.tanstack-example-body > p { margin: 0; color: #405e49; font-size: 13px; line-height: 1.6; }
.tanstack-query-result { display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 12px 14px; border: 1px solid #e1ecdd; border-radius: 11px; background: #f5faf2; }
.tanstack-query-result p, .tanstack-query-status { margin: 0; color: #3f6448; font-size: 13px; line-height: 1.5; }
.tanstack-status-dot { width: 8px; height: 8px; flex: none; border-radius: 50%; background: #709f6d; box-shadow: 0 0 0 4px #e3f0dd; }
.tanstack-table-scroll { max-width: 100%; overflow-x: auto; border: 1px solid #e8eee5; border-radius: 11px; }
.tanstack-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.tanstack-table th, .tanstack-table td { padding: 12px 14px; text-align: left; vertical-align: top; }
.tanstack-table th { color: #5e7565; background: #f7faf5; font-size: 10px; font-weight: 750; letter-spacing: .09em; text-transform: uppercase; }
.tanstack-table td { color: #385542; border-top: 1px solid #edf1eb; }
.tanstack-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 10px; }
.tanstack-form-field { min-width: 0; display: grid; gap: 7px; }
.tanstack-form-field label, .tanstack-store-label { margin: 0; color: #526d59; font-size: 12px; font-weight: 700; }
.tanstack-examples .tanstack-input { width: 100%; min-width: 0; height: 44px; padding: 0 12px; border: 1px solid #dce7d9; border-radius: 10px; color: #253d30; background: #fafcf9; box-shadow: none; font-size: 13px; }
.tanstack-examples .tanstack-input::placeholder { color: #728779; opacity: 1; }
.tanstack-examples .tanstack-input[aria-invalid='true'] { border-color: #ad554d; }
.tanstack-field-error { grid-column: 1 / -1; margin-top: -4px; color: #a33c31; font-size: 12px; line-height: 1.4; }
.tanstack-examples .tanstack-action { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 15px; border: 1px solid #294d39; border-radius: 10px; color: #fff; background: #294d39; font-size: 12px; font-weight: 700; white-space: nowrap; box-shadow: none; }
.tanstack-examples .tanstack-action:hover { background: #36634a; }
.tanstack-examples .tanstack-action--outline { border-color: #d6e5d3; color: #3f6448; background: #f6faf4; }
.tanstack-examples .tanstack-action--outline:hover { background: #eaf4e6; }
.tanstack-examples .tanstack-input:focus-visible, .tanstack-examples .tanstack-action:focus-visible, .tanstack-virtual-list:focus-visible { outline: 3px solid #526e50; outline-offset: 3px; }
.tanstack-form-message { grid-column: 1 / -1; margin: 2px 0 0; color: #3f6448; font-size: 13px; }
.tanstack-virtual-list { height: 160px; overflow: auto; border: 1px solid #e7eee4; border-radius: 11px; background: #fafcf9; }
.tanstack-virtual-row { display: flex; align-items: center; gap: 12px; padding: 0 14px; border-bottom: 1px solid #edf2eb; color: #385542; font-size: 12px; }
.tanstack-virtual-row span { color: #6b826f; font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums; }
.tanstack-store { display: flex; align-items: center; justify-content: space-between; gap: 14px; min-height: 76px; padding: 14px; border: 1px solid #e7eee4; border-radius: 11px; background: #fafcf9; }
.tanstack-store-count { margin: 3px 0 0; color: #294d39; font-size: 26px; font-weight: 740; line-height: 1.2; font-variant-numeric: tabular-nums; }
.tanstack-chart { min-width: 0; max-width: 100%; overflow-x: auto; }
@media (max-width: 800px) { .tanstack-examples { width: min(600px, calc(100% - 48px)); padding: 14px 0 64px; } .tanstack-examples-grid { grid-template-columns: minmax(0, 1fr); } .tanstack-example--charts, .tanstack-example--wide { grid-column: auto; } }
@media (max-width: 460px) { .tanstack-examples { width: calc(100% - 36px); padding-bottom: 52px; } .tanstack-examples-header { align-items: start; flex-direction: column; gap: 14px; } .tanstack-example { padding: 20px 18px; } .tanstack-form { grid-template-columns: minmax(0, 1fr); } .tanstack-form-message { grid-column: auto; } }
`;

  const mainPath = `src/main.${ext}`;
  const openStrict = '<React.StrictMode>';
  const closeStrict = '</React.StrictMode>';
  if (!files[mainPath]?.includes(openStrict) || !files[mainPath].includes(closeStrict)) throw new Error('Cannot attach TanStack examples to the generated entry point.');
  if (selected.includes('query')) {
    files[mainPath] = `import { QueryClient, QueryClientProvider } from '@tanstack/react-query';\n${files[mainPath]}`
      .replace("const root = document.getElementById('root');", "const queryClient = new QueryClient();\nconst root = document.getElementById('root');")
      .replace(openStrict, `${openStrict}<QueryClientProvider client={queryClient}>`)
      .replace(closeStrict, `</QueryClientProvider>${closeStrict}`);
  }
}
