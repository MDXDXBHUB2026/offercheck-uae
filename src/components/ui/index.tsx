import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { CheckCircle2, Info } from "lucide-react";

// Shared building blocks. Styling comes from the tokens in src/app/globals.css; these components
// only pick class names and accessibility attributes. Every action button in the app is <Button>.

export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

export type Tone = "high" | "medium" | "low" | "green" | "neutral";

export function Card({
  as: Element = "div",
  tone,
  className,
  children,
  ...rest
}: {
  as?: "div" | "section" | "article" | "li" | "form";
  tone?: Tone;
  className?: string;
  children: ReactNode;
  id?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}) {
  return (
    <Element className={cx("card", tone && `tone-${tone}`, className)} {...rest}>
      {children}
    </Element>
  );
}

export type ChipTone = "neutral" | "high" | "medium" | "low" | "green" | "caution";

export function Chip({
  tone = "neutral",
  pill = false,
  upper = false,
  className,
  children,
}: {
  tone?: ChipTone;
  pill?: boolean;
  upper?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return <span className={cx("chip", `chip-${tone}`, pill && "chip-pill", upper && "chip-upper", className)}>{children}</span>;
}

export type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> & {
  variant?: ButtonVariant;
  // Full width (layout, not a variant).
  block?: boolean;
  // The one big call to action (layout, not a variant).
  large?: boolean;
  // When set, the button is blocked: it stays focusable (aria-disabled, never the native
  // disabled), points at the element that explains why, and ignores clicks.
  blocked?: boolean;
  reasonId?: string;
  busy?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  variant = "primary",
  block = false,
  large = false,
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
      className={cx("btn", `btn-${variant}`, block && "btn-block", large && "btn-lg", className)}
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

// A link that looks like a Button (the same three variants), for a destination rather than an
// action: the official portals and the Gov Portals Hub. External links open in a new tab.
export function ButtonLink({
  variant = "secondary",
  block = false,
  className,
  href,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant; block?: boolean; href: string }) {
  const external = /^https?:/.test(href);
  return (
    <a
      href={href}
      className={cx("btn", `btn-${variant}`, block && "btn-block", className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...rest}
    >
      {children}
    </a>
  );
}

// The line under a blocked button that says why. Kept in the DOM while empty so the layout and
// any live region stay in place.
export function HelperText({ id, children }: { id: string; children?: ReactNode }) {
  return (
    <p id={id} className="helper">
      {children && (
        <>
          <Info className="icon" aria-hidden="true" />
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
      {tone === "success" ? (
        <CheckCircle2 className="icon" aria-hidden="true" />
      ) : (
        <Info className="icon" aria-hidden="true" />
      )}
      <div className="callout-body">
        {title && <p className="callout-title">{title}</p>}
        {children}
      </div>
    </div>
  );
}

// A native details/summary disclosure, so it works with a keyboard and without JavaScript.
export function Disclosure({
  summary,
  id,
  className,
  children,
}: {
  summary: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details id={id} className={cx("card", "accordion", className)}>
      <summary>{summary}</summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}
