"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";
import type { ComponentProps } from "react";

export function SubmitButton({
  children,
  pendingText = "Please wait…",
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
