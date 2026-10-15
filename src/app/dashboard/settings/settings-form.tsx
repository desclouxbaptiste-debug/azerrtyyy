"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettingsAction, type SettingsFormState } from "./actions";
import { TIMEZONES } from "@/lib/timezones";

type Business = {
  name: string;
  phone: string | null;
  timezone: string;
  slotDurationMinutes: number;
  bufferMinutes: number;
  reminderHoursBefore: number;
  bookingWindowDays: number;
};

const initialState: SettingsFormState = undefined;

export function SettingsForm({ business }: { business: Business }) {
  const [state, action, pending] = useActionState(updateSettingsAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nom de l&apos;activité</Label>
          <Input id="name" name="name" defaultValue={business.name} required />
          {state?.fieldErrors?.name && (
            <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Téléphone (optionnel)</Label>
          <Input id="phone" name="phone" defaultValue={business.phone ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="timezone">Fuseau horaire</Label>
          <select
            id="timezone"
            name="timezone"
            defaultValue={business.timezone}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bookingWindowDays">Fenêtre de réservation (jours)</Label>
          <Input
            id="bookingWindowDays"
            name="bookingWindowDays"
            type="number"
            min={1}
            max={180}
            defaultValue={business.bookingWindowDays}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bufferMinutes">Battement entre rendez-vous (minutes)</Label>
          <Input
            id="bufferMinutes"
            name="bufferMinutes"
            type="number"
            min={0}
            max={240}
            defaultValue={business.bufferMinutes}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reminderHoursBefore">Rappel envoyé avant le RDV (heures)</Label>
          <Input
            id="reminderHoursBefore"
            name="reminderHoursBefore"
            type="number"
            min={1}
            max={168}
            defaultValue={business.reminderHoursBefore}
            required
          />
        </div>
        <input type="hidden" name="slotDurationMinutes" value={business.slotDurationMinutes} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-primary">Paramètres enregistrés.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
