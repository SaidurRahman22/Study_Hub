import { Icon } from '@iconify/react';
import type { ReactNode } from 'react';
import CardBox from 'src/components/shared/CardBox';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { Textarea } from 'src/components/ui/textarea';
import { useContentStore } from './store';

/* Shared building blocks for the website content editor pages. Every page is
 * composed from these so the forms look and behave the same. They wrap the
 * template's own ui components. */

export function PageHead({
  title,
  subtitle,
  previewUrl,
}: {
  title: string;
  subtitle?: string;
  previewUrl?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {previewUrl && (
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          View on the site
          <Icon icon="solar:arrow-right-up-linear" width={16} />
        </a>
      )}
    </div>
  );
}

export function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <CardBox className="mb-6">
      <div className="p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {note && <p className="text-sm text-muted-foreground mt-1">{note}</p>}
        </div>
        <div className="flex flex-col gap-5">{children}</div>
      </div>
    </CardBox>
  );
}

export function TextField({
  label,
  path,
  placeholder,
  hint,
}: {
  label: string;
  path: string;
  placeholder?: string;
  hint?: string;
}) {
  const { read, update } = useContentStore();
  const value = (read(path) as string) ?? '';
  return (
    <div>
      <Label htmlFor={path}>{label}</Label>
      <Input
        id={path}
        type="text"
        className="mt-2"
        value={value}
        placeholder={placeholder}
        onChange={(e) => update(path, e.target.value)}
      />
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

export function TextAreaField({
  label,
  path,
  rows = 3,
  hint,
}: {
  label: string;
  path: string;
  rows?: number;
  hint?: string;
}) {
  const { read, update } = useContentStore();
  const value = (read(path) as string) ?? '';
  return (
    <div>
      <Label htmlFor={path}>{label}</Label>
      <Textarea
        id={path}
        rows={rows}
        className="mt-2"
        value={value}
        onChange={(e) => update(path, e.target.value)}
      />
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

/** Textarea bound to an array of strings: one line per item. */
export function TextAreaListField({
  label,
  path,
  rows,
  hint,
}: {
  label: string;
  path: string;
  rows?: number;
  hint?: string;
}) {
  const { read, update } = useContentStore();
  const list = (read(path) as string[]) ?? [];
  const value = Array.isArray(list) ? list.join('\n') : String(list ?? '');
  return (
    <div>
      <Label htmlFor={path}>{label}</Label>
      <Textarea
        id={path}
        rows={rows ?? Math.max(3, list.length)}
        className="mt-2"
        value={value}
        onChange={(e) =>
          update(
            path,
            e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)
          )
        }
      />
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

/** A bordered sub-card for one item in a repeating list. */
export function ItemCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-ld p-4 flex flex-col gap-4">{children}</div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

/** Amber notice naming content on the site that is not yet editable here. */
export function GapNotice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
      <Icon
        icon="solar:info-circle-linear"
        width={20}
        className="shrink-0 text-warning mt-0.5"
      />
      <div className="text-sm text-foreground/90">{children}</div>
    </div>
  );
}

/** Sticky save/reset bar, shown only when there are unsaved edits. */
export function SaveBar() {
  const { dirty, save, reset } = useContentStore();
  if (!dirty) return null;
  return (
    <div className="sticky bottom-0 z-20 mt-2 flex items-center justify-between gap-4 rounded-xl border border-ld bg-card px-5 py-3 shadow-md">
      <span className="text-sm text-muted-foreground">You have unsaved changes.</span>
      <div className="flex gap-2">
        <Button variant="outline" onClick={reset}>
          Discard
        </Button>
        <Button onClick={save}>Save changes</Button>
      </div>
    </div>
  );
}
