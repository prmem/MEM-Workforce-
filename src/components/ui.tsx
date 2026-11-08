import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark disabled:bg-brand/60",
  secondary: "bg-white text-ink border border-line hover:bg-gray-50 disabled:text-muted",
  danger: "bg-white text-red-700 border border-red-300 hover:bg-red-50 disabled:text-red-300",
  ghost: "text-ink hover:bg-gray-100",
};

export const buttonClass = (variant: Variant = "primary", extra?: string) =>
  cx(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
    VARIANTS[variant],
    extra,
  );

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-xl border border-line bg-white p-4 sm:p-5", className)} {...props} />;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: ReactNode }) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-green-200 bg-green-50 text-green-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-lg border px-3 py-2 text-sm", tones[tone])}>
      {children}
    </div>
  );
}

const inputBase =
  "block w-full min-h-11 rounded-lg border border-line bg-white px-3 py-2 text-base text-ink placeholder:text-gray-400 focus:border-brand focus:outline-none aria-[invalid=true]:border-red-500";

export function Field({
  label,
  name,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-brand"> *</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${name}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${name}-error`} className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, invalid, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      id={props.id ?? props.name}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${props.id ?? props.name}-error` : undefined}
      className={cx(inputBase, className)}
      {...props}
    />
  );
}

export function Select({ className, invalid, ...props }: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select
      id={props.id ?? props.name}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${props.id ?? props.name}-error` : undefined}
      className={cx(inputBase, className)}
      {...props}
    />
  );
}

export function Textarea({ className, invalid, ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      id={props.id ?? props.name}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${props.id ?? props.name}-error` : undefined}
      className={cx(inputBase, "min-h-24", className)}
      {...props}
    />
  );
}

export function Badge({ tone = "gray", children }: { tone?: "gray" | "red" | "amber" | "green" | "blue"; children: ReactNode }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    red: "bg-red-100 text-red-800",
    amber: "bg-amber-100 text-amber-800",
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
  };
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", tones[tone])}>
      {children}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white px-4 py-10 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {children ? <div className="mt-1 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="text-sm text-muted sm:w-44 sm:shrink-0">{label}</dt>
      <dd className="text-sm text-ink break-words">{children}</dd>
    </div>
  );
}
