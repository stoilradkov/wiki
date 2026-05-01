import type { ReactNode } from "react";

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="field-error" id={id}>
      {children}
    </p>
  );
}
