import { Icon } from '@iconify/react';
import type { ReactNode } from 'react';

/* Shared app-screen primitives for the student/operations pages, matching the
 * template's own chip and table styling (see the Tickets view). */

export type Tone = 'info' | 'warn' | 'success' | 'bad' | 'primary' | 'mute' | 'plain';

const TONE: Record<Tone, string> = {
  info: 'bg-lightinfo text-info',
  warn: 'bg-lightwarning text-warning',
  success: 'bg-lightsuccess text-success',
  bad: 'bg-lighterror text-error',
  primary: 'bg-lightprimary text-primary',
  mute: 'bg-muted text-muted-foreground',
  plain: 'text-foreground',
};

/** A small status pill, coloured by tone. */
export function StatusTag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

/** Page header with an optional primary action on the right. */
export function ScreenHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** A search box + optional trailing controls, as the template's listings use. */
export function Toolbar({
  search,
  onSearch,
  placeholder = 'Search',
  children,
}: {
  search?: string;
  onSearch?: (v: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="relative sm:max-w-xs w-full">
        <Icon
          icon="solar:magnifer-linear"
          height={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch?.(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-ld bg-transparent py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

/** Centered empty / not-wired state inside a card. */
export function EmptyState({
  icon,
  title,
  note,
}: {
  icon: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-6">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lightprimary">
        <Icon icon={icon} width={26} className="text-primary" />
      </span>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {note && <p className="text-sm text-muted-foreground max-w-md">{note}</p>}
    </div>
  );
}

/** Amber caveat line (e.g. "needs a backend"). */
export function Caveat({ children }: { children: ReactNode }) {
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
