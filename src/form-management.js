import { starterFooter } from './architectures.js';

/** Configure a form library and/or a reusable Zod schema for generated projects. */
export function applyFormManagement(files, pkg, options) {
  const { formManagement, zod, language, shadcn, architecture } = options;
  const ts = language === 'TypeScript';
  const mod = ts ? 'ts' : 'js';
  const ext = ts ? 'tsx' : 'jsx';
  if (zod) {
    pkg.dependencies.zod = '4.6.7';
    files[`src/forms/schema.${mod}`] = `import { z } from 'zod';\n\nexport const nameSchema = z.string().trim().min(1, 'Please enter a name.');\nexport const formSchema = z.object({ name: nameSchema });\n${ts ? '\nexport type FormValues = z.input<typeof formSchema>;\n' : ''}`;
  }
  if (formManagement === 'none') {
    if (zod) files['README.md'] += `\n## Zod validation\n\nA reusable name schema is available in \`src/forms/schema.${mod}\`.${options.tanstack.includes('form') ? ' The TanStack Form example uses the name schema for field validation.' : ' Import and adapt it to validate data in your app.'}\n`;
    return;
  }

  const ui = architecture === 'Feature-Sliced Design (FSD)' ? 'shared' : 'components';
  const input = shadcn ? 'Input' : 'input';
  const button = shadcn ? 'Button' : 'button';
  const container = shadcn ? 'Card' : 'section';
  const uiImports = shadcn ? `import { Button } from '@/${ui}/ui/button';\nimport { Input } from '@/${ui}/ui/input';\nimport { Card } from '@/${ui}/ui/card';\n` : '';
  const schemaImports = zod ? `import { formSchema${ts && formManagement === 'react-hook-form' ? ', type FormValues' : ''} } from './schema';\n` : '';
  let setup;
  let fieldProps;
  let error;
  let submit;
  let label;
  let imports;
  if (formManagement === 'react-hook-form') {
    label = 'React Hook Form';
    pkg.dependencies['react-hook-form'] = '7.92.0';
    if (zod) pkg.dependencies['@hookform/resolvers'] = '7.0.8';
    imports = `import { useForm } from 'react-hook-form';\n${zod ? "import { zodResolver } from '@hookform/resolvers/zod';\n" : ''}`;
    setup = `  const { register, handleSubmit, formState: { errors } } = useForm${ts ? `<${zod ? 'FormValues' : '{ name: string }'}>` : ''}({ defaultValues: { name: '' }${zod ? ', resolver: zodResolver(formSchema)' : ''} });`;
    fieldProps = `{...register('name'${zod ? '' : ", { validate: (value) => value.trim() ? true : 'Please enter a name.' }"})}`;
    error = 'errors.name?.message';
    submit = `handleSubmit(({ name }) => setMessage('Hello, ' + name.trim() + '!'))`;
  } else {
    label = 'Formik';
    pkg.dependencies.formik = '2.4.9';
    imports = "import { useFormik } from 'formik';\n";
    setup = `  const form = useFormik({
    initialValues: { name: '' },
    validate: (values) => {
      ${zod ? `const result = formSchema.safeParse(values);
      return result.success ? {} : { name: result.error.issues[0]?.message ?? 'Please enter a name.' };` : `return values.name.trim() ? {} : { name: 'Please enter a name.' };`}
    },
    onSubmit: ({ name }) => setMessage('Hello, ' + name.trim() + '!'),
  });`;
    fieldProps = `name="name" value={form.values.name} onChange={form.handleChange} onBlur={form.handleBlur}`;
    error = 'form.touched.name ? form.errors.name : undefined';
    submit = 'form.handleSubmit';
  }
  const formPath = `src/forms/form-example.${ext}`;
  files[formPath] = `import { useState } from 'react';\n${imports}${schemaImports}${uiImports}
export function FormExample() {
  const [message, setMessage] = useState('');
${setup}
  const error = ${error};
  return <${container} className="form-example" aria-label="${label} example">
    <div className="form-example-heading"><p className="form-example-kicker">FORM MANAGEMENT</p><h2>Say hello with ${label}</h2><p>A small form with accessible validation.</p></div>
    <form className="form-example-form" noValidate onSubmit={${submit}} onChange={() => setMessage('')}>
      <div className="form-example-field">
        <label htmlFor="starter-form-name">Your name</label>
        <${input} id="starter-form-name" className="form-example-input" placeholder="Enter your name" ${fieldProps} aria-invalid={Boolean(error)} aria-describedby={error ? 'starter-form-name-error' : undefined} />
      </div>
      <${button} className="form-example-action" type="submit">Say hello <span aria-hidden="true">↗</span></${button}>
      {error && <span className="form-example-error" id="starter-form-name-error" role="alert">{error}</span>}
      {message && <p className="form-example-message" role="status">{message}</p>}
    </form>
  </${container}>;
}
`;
  const candidates = Object.keys(files).filter(file => file.startsWith('src/') && !file.startsWith('src/routes/') && /\.[jt]sx$/.test(file) && files[file].includes(starterFooter));
  if (candidates.length !== 1) throw new Error('Cannot find the generated application footer for the form example.');
  const appFile = candidates[0];
  files[appFile] = `import { FormExample } from '@/forms/form-example';\n${files[appFile].replace(starterFooter, `<FormExample />\n      ${starterFooter}`)}`;
  files['src/index.css'] += `\n/* Optional form example */\n.form-example { width: min(1080px, calc(100% - 80px)); margin: 0 auto 72px; padding: 26px; border: 1px solid #dfe8da; border-radius: 18px; background: #f8fbf6; color: #294d39; }\n.form-example-heading h2 { margin: 4px 0 8px; font-size: 22px; color: #20382c; }\n.form-example-heading p { margin: 0; }\n.form-example-kicker { color: #648568; font-size: 10px; font-weight: 700; letter-spacing: .14em; }\n.form-example-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 10px; align-items: end; max-width: 520px; margin-top: 20px; }\n.form-example-field { display: grid; gap: 7px; min-width: 0; }\n.form-example-field label { font-size: 12px; font-weight: 700; }\n.form-example-input { min-width: 0; width: 100%; height: 44px; padding: 0 12px; border: 1px solid #dce7d9; border-radius: 10px; background: #fff; color: #253d30; }\n.form-example-input[aria-invalid='true'] { border-color: #ad554d; }\n.form-example-action { height: 44px; border: 0; border-radius: 10px; background: #294d39; color: white; padding: 0 16px; cursor: pointer; }\n.form-example-action:hover { background: #36634a; }\n.form-example-action:focus-visible, .form-example-input:focus-visible { outline: 3px solid #526e50; outline-offset: 3px; }\n.form-example-error, .form-example-message { grid-column: 1 / -1; margin: 0; font-size: 12px; }\n.form-example-error { color: #a33c31; }\n@media (max-width: 600px) { .form-example { width: calc(100% - 36px); } }\n@media (max-width: 420px) { .form-example-form { grid-template-columns: minmax(0, 1fr); } }\n`;
  files['README.md'] += `\n## Forms\n\nThis project uses ${label}. A runnable, accessible example is in \`${formPath}\`.${zod ? ` Its validation uses the reusable Zod schema in \`src/forms/schema.${mod}\`.${formManagement === 'react-hook-form' ? ' The Zod resolver connects the schema to React Hook Form.' : ' Formik maps Zod issues into its validation errors.'}` : ' The example validates its name field without a schema library.'} Adapt or remove the example as needed.\n`;
}
