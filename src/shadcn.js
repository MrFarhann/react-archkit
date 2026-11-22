import { readFileSync } from 'node:fs';

// Adapted from shadcn/ui's New York components, MIT license; see licenses/shadcn-ui.txt.
const shadcnLicense = readFileSync(new URL('./licenses/shadcn-ui.txt', import.meta.url), 'utf8');

/** Add project-owned UI components and preserve upstream attribution. */
export function addShadcnComponents(files, { uiDir, libDir, ext, ts }) {
  const reactImport = ts ? "import * as React from 'react';\n" : '';
  files[`src/${uiDir}/input.${ext}`] = `${reactImport}import { cn } from '@/${libDir}/utils';

function Input({ className, type, ...props }${ts ? ": React.ComponentProps<'input'>" : ''}) {
  return <input type={type} data-slot="input" className={cn('h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm', className)} {...props} />;
}
export { Input };
`;
  files[`src/${uiDir}/card.${ext}`] = `${reactImport}import { cn } from '@/${libDir}/utils';

function Card({ className, ...props }${ts ? ": React.ComponentProps<'div'>" : ''}) {
  return <div data-slot="card" className={cn('flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm', className)} {...props} />;
}
export { Card };
`;
  files['THIRD_PARTY_NOTICES.md'] = `# Third-party notices\n\nThe Button, Input and Card components are adapted from [shadcn/ui](https://github.com/shadcn-ui/ui), licensed under the MIT license:\n\n\`\`\`text\n${shadcnLicense}\`\`\`\n`;
}
