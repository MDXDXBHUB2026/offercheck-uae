import type { ButtonHTMLAttributes, ReactNode } from "react";
import { CheckIcon, InfoIcon } from "@/components/icons";

// Shared building blocks. Styling comes from the tokens in src/app/globals.css
// (docs/step5-premium-ui.md); these components only pick class names and accessibility attributes.

function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("card", className)}>{children}</div>;
}

export type ChipTone = "neutral" | "success" | "medium" | "high" | "not-built";

export function Chip({ tone = "neutral", className, children }: { tone?: ChipTone; className?: string; children: ReactNode }) {
  return <span className={cx("chip", `chip-${tone}`, className)}>{children}</span>;
}

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> & {
  variant?: "primary" | "secondary" | "text";
  // When set, the button is blocked: it stays focusable (aria-disabled, never the native
  // disabled), points at the element that explains why, and ignores clicks.
  blocked?: boolean;
  reasonId?: string;
  busy?: boolean;
};

export function Button({
  variant = "primary",
  blocked = false,
  reasonId,
  busy = false,
  type = "button",
  className,
  onClick,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(variant, className)}
      aria-disabled={blocked || busy ? true : undefined}
      aria-describedby={blocked && reasonId ? reasonId : undefined}
      aria-busy={busy || undefined}
      onClick={(event) => {
        if (blocked || busy) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    >
      {busy && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

// The line under a blocked button that says why. Kept in the DOM while empty so the layout and
// any live region stay in place.
export function HelperText({ id, children }: { id: string; children?: ReactNode }) {
  return (
    <p id={id} className="helper">
      {children && (
        <>
          <InfoIcon />
          <span>{children}</span>
        </>
      )}
    </p>
  );
}

export type CalloutTone = "info" | "success" | "neutral" | "high";

export function Callout({
  tone = "info",
  title,
  role,
  className,
  children,
}: {
  tone?: CalloutTone;
  title?: string;
  role?: "status" | "alert" | "note";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cx("callout", `callout-${tone}`, className)} role={role}>
      {tone === "success" ? <CheckIcon size={20} /> : <InfoIcon size={20} />}
      <div className="callout-body">
        {title && <p className="callout-title">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function SectionHeader({
  id,
  title,
  level = 2,
  description,
}: {
  id: string;
  title: string;
  level?: 1 | 2;
  description?: ReactNode;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className="section-header">
      <Heading id={id} className={level === 1 ? "page-title" : "section-title"}>
        {title}
      </Heading>
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}

export type Column = { key: string; header: string; numeric?: boolean };

// A real table: a caption, column headers with scope, and numbers right-aligned in tabular figures.
export function DataTable({
  caption,
  captionHidden = false,
  columns,
  rows,
  rowKey,
}: {
  caption: string;
  captionHidden?: boolean;
  columns: Column[];
  rows: Record<string, ReactNode>[];
  rowKey: (row: Record<string, ReactNode>, index: number) => string;
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption className={captionHidden ? "visually-hidden" : undefined}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.numeric ? "numeric" : undefined}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {columns.map((column) => (
                <td key={column.key} className={column.numeric ? "numeric" : undefined}>
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type TimelineStatus = "completed" | "not_implemented";

export type TimelineItem = {
  id: string;
  title: string;
  status: TimelineStatus;
  statusLabel: string;
  detail: string;
  meta: string;
};

// A vertical list of steps. A completed step gets a filled node with a check; a step that is not
// built gets a dashed outline and muted text, so it never reads as done. The status is also text.
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="card timeline">
      {items.map((item) => (
        <li key={item.id} className={`trace-${item.status}`}>
          <span className="trace-icon" role="img" aria-label={item.statusLabel}>
            {item.status === "completed" && <CheckIcon size={14} />}
          </span>
          <span className="trace-agent">{item.title}</span>
          <span className="trace-summary">{item.detail}</span>
          <span className="trace-time">{item.meta}</span>
        </li>
      ))}
    </ol>
  );
}

// A native details/summary disclosure, so it works with a keyboard and without JavaScript.
export function Disclosure({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  return (
    <details className="card disclosure">
      <summary>{summary}</summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}
