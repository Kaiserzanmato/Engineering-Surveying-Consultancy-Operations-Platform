"use client";

import { useFormStatus } from "react-dom";

/**
 * Disables itself while its enclosing <form>'s Server Action is in flight.
 * Fixes a real class of bug: plain submit buttons stayed clickable during
 * the request, so a fast double-click (or an impatient re-click on a slow
 * request) could submit the same mutation twice — e.g. changing a lead's
 * status to the same value twice in a row, which the server correctly
 * rejected as an invalid transition, surfacing as an ugly crash instead of
 * nothing happening. Use this everywhere a form submits a mutation.
 */
export function SubmitButton({
  children,
  pendingChildren,
  className,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  pendingChildren?: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      aria-label={ariaLabel}
      className={className}
    >
      {pending ? (pendingChildren ?? "…") : children}
    </button>
  );
}
