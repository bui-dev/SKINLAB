"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="p-page">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
