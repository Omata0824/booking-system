"use client";

import type { ReactNode } from "react";

type ConfirmSubmitButtonProps = {
  children: ReactNode;
  className?: string;
  confirmMessage: string;
  formAction?: string;
  formMethod?: "post";
  disabled?: boolean;
};

export function ConfirmSubmitButton({
  children,
  className,
  confirmMessage,
  formAction,
  formMethod,
  disabled,
}: ConfirmSubmitButtonProps) {
  return (
    <button
      className={className}
      disabled={disabled}
      formAction={formAction}
      formMethod={formMethod}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {children}
    </button>
  );
}
