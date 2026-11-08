"use client";

import { useEffect } from "react";
import { Alert, Button } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="space-y-4">
      <Alert>Something went wrong while loading this page. Please try again. If it keeps happening, contact your admin.</Alert>
      {error.digest ? <p className="text-xs text-muted">Reference: {error.digest}</p> : null}
      <Button onClick={reset} variant="secondary">Try again</Button>
    </div>
  );
}
