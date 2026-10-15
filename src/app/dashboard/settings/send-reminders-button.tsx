"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { triggerRemindersAction } from "./actions";

export function SendRemindersButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ sent: number; skipped: number } | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const outcome = await triggerRemindersAction();
            setResult(outcome);
          });
        }}
      >
        {isPending ? "Envoi..." : "Envoyer les rappels maintenant"}
      </Button>
      {result && (
        <p className="text-sm text-muted-foreground">
          {result.sent} rappel(s) envoyé(s)
          {result.skipped > 0 ? `, ${result.skipped} non envoyé(s) (clé email absente)` : ""}.
        </p>
      )}
    </div>
  );
}
