"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAvailabilityAction, type AvailabilityFormState } from "./actions";

const WEEKDAYS = [
  { key: 1, label: "Lundi" },
  { key: 2, label: "Mardi" },
  { key: 3, label: "Mercredi" },
  { key: 4, label: "Jeudi" },
  { key: 5, label: "Vendredi" },
  { key: 6, label: "Samedi" },
  { key: 0, label: "Dimanche" },
];

type WorkingHour = { weekday: number; startMinute: number; endMinute: number };

function toTimeString(minutes: number) {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

const initialState: AvailabilityFormState = undefined;

export function AvailabilityForm({
  workingHours,
  slotDurationMinutes,
}: {
  workingHours: WorkingHour[];
  slotDurationMinutes: number;
}) {
  const [state, action, pending] = useActionState(saveAvailabilityAction, initialState);
  const [enabledDays, setEnabledDays] = useState<Set<number>>(
    new Set(workingHours.map((wh) => wh.weekday))
  );

  const byWeekday = new Map(workingHours.map((wh) => [wh.weekday, wh]));

  return (
    <form action={action} className="space-y-6">
      <div className="max-w-40 space-y-1.5">
        <Label htmlFor="slotDurationMinutes">Durée d&apos;un créneau (minutes)</Label>
        <Input
          id="slotDurationMinutes"
          name="slotDurationMinutes"
          type="number"
          min={5}
          max={480}
          step={5}
          defaultValue={slotDurationMinutes}
          required
        />
      </div>

      <div className="space-y-3">
        {WEEKDAYS.map(({ key, label }) => {
          const existing = byWeekday.get(key);
          const isEnabled = enabledDays.has(key);
          return (
            <div key={key} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
              <label className="flex w-32 items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name={`enabled-${key}`}
                  defaultChecked={isEnabled}
                  onChange={(e) => {
                    setEnabledDays((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(key);
                      else next.delete(key);
                      return next;
                    });
                  }}
                />
                {label}
              </label>
              <Input
                type="time"
                name={`start-${key}`}
                defaultValue={existing ? toTimeString(existing.startMinute) : "09:00"}
                disabled={!isEnabled}
                className="w-32"
              />
              <span className="text-muted-foreground">à</span>
              <Input
                type="time"
                name={`end-${key}`}
                defaultValue={existing ? toTimeString(existing.endMinute) : "18:00"}
                disabled={!isEnabled}
                className="w-32"
              />
            </div>
          );
        })}
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-primary">Disponibilités enregistrées.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
