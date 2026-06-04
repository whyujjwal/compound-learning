import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type LabelHTMLAttributes, type ReactNode } from "react";

/* ─── Input ─────────────────────────────────────────────── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ error = false, style, onFocus, onBlur, ...rest }, ref) {
    const base: React.CSSProperties = {
      width: "100%",
      height: 34,
      padding: "0 10px",
      fontSize: 14,
      color: "var(--text)",
      background: "var(--canvas)",
      border: error
        ? "1px solid var(--bad)"
        : "1px solid var(--hairline)",
      borderRadius: 4,
      outline: "none",
      transition: "border-color 100ms, box-shadow 100ms",
      ...style,
    };

    return (
      <input
        ref={ref}
        style={base}
        onFocus={(e) => {
          (e.currentTarget as HTMLInputElement).style.borderColor = "var(--accent)";
          (e.currentTarget as HTMLInputElement).style.boxShadow = "0 0 0 2px var(--accent-soft)";
          onFocus?.(e);
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLInputElement).style.borderColor = error ? "var(--bad)" : "var(--hairline)";
          (e.currentTarget as HTMLInputElement).style.boxShadow = "none";
          onBlur?.(e);
        }}
        {...rest}
      />
    );
  }
);

/* ─── Textarea ───────────────────────────────────────────── */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  resize?: "none" | "vertical" | "horizontal" | "both";
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ error = false, resize = "vertical", style, onFocus, onBlur, ...rest }, ref) {
    const base: React.CSSProperties = {
      width: "100%",
      minHeight: 80,
      padding: "8px 10px",
      fontSize: 14,
      color: "var(--text)",
      background: "var(--canvas)",
      border: error ? "1px solid var(--bad)" : "1px solid var(--hairline)",
      borderRadius: 4,
      outline: "none",
      resize,
      lineHeight: 1.5,
      transition: "border-color 100ms, box-shadow 100ms",
      ...style,
    };

    return (
      <textarea
        ref={ref}
        style={base}
        onFocus={(e) => {
          (e.currentTarget as HTMLTextAreaElement).style.borderColor = "var(--accent)";
          (e.currentTarget as HTMLTextAreaElement).style.boxShadow = "0 0 0 2px var(--accent-soft)";
          onFocus?.(e);
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLTextAreaElement).style.borderColor = error ? "var(--bad)" : "var(--hairline)";
          (e.currentTarget as HTMLTextAreaElement).style.boxShadow = "none";
          onBlur?.(e);
        }}
        {...rest}
      />
    );
  }
);

/* ─── Label ──────────────────────────────────────────────── */
interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ required, children, style, ...rest }: LabelProps) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: 5,
        fontSize: 13,
        fontWeight: 500,
        color: "var(--text)",
        ...style,
      }}
      {...rest}
    >
      {children}
      {required && (
        <span style={{ color: "var(--bad)", marginLeft: 2 }} aria-hidden>
          *
        </span>
      )}
    </label>
  );
}

/* ─── Field (Label + Input + error message) ──────────────── */
interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, required, children }: FieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {hint && !error && (
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{hint}</p>
      )}
      {error && (
        <p style={{ fontSize: 12, color: "var(--bad)", marginTop: 2 }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ─── Select ─────────────────────────────────────────────── */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ error = false, style, onFocus, onBlur, ...rest }, ref) {
    return (
      <select
        ref={ref}
        style={{
          width: "100%",
          height: 34,
          padding: "0 10px",
          fontSize: 14,
          color: "var(--text)",
          background: "var(--canvas)",
          border: error ? "1px solid var(--bad)" : "1px solid var(--hairline)",
          borderRadius: 4,
          outline: "none",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%23787774' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
          paddingRight: 32,
          cursor: "pointer",
          transition: "border-color 100ms",
          ...style,
        }}
        onFocus={(e) => {
          (e.currentTarget as HTMLSelectElement).style.borderColor = "var(--accent)";
          onFocus?.(e);
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLSelectElement).style.borderColor = error ? "var(--bad)" : "var(--hairline)";
          onBlur?.(e);
        }}
        {...rest}
      />
    );
  }
);
