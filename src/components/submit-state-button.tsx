"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitStateButtonProps = {
  children: ReactNode;
  className?: string;
  pendingText: string;
};

export function SubmitStateButton({
  children,
  className,
  pendingText,
}: SubmitStateButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? pendingText : children}
    </button>
  );
}
