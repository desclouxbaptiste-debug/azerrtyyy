"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createBookingAction, fetchSlotsAction, type BookingFormState } from "./actions";

type BusinessSummary = {
  id: string;
  name: string;
  timezone: string;
  bookingWindowDays: number;
  slotDurationMinutes: number;
};

type SlotDto = { startAt: string; endAt: string };

function addDaysToKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day) + days * 86_400_000);
  return next.toISOString().slice(0, 10);
}

function weekdayOfKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function formatDayLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return {
    weekday: new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" }).format(date),
    day: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(
      date
    ),
  };
}

function formatTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone }).format(
    new Date(iso)
  );
}

function formatFullDate(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

const initialBookingState: BookingFormState = undefined;

export function BookingWidget({
  business,
  workingWeekdays,
  initialDateKey,
}: {
  business: BusinessSummary;
  workingWeekdays: number[];
  initialDateKey: string;
}) {
  const availableDateKeys = useMemo(() => {
    const keys: string[] = [];
    for (let i = 0; i < business.bookingWindowDays; i++) {
      const key = addDaysToKey(initialDateKey, i);
      if (workingWeekdays.includes(weekdayOfKey(key))) keys.push(key);
    }
    return keys;
  }, [initialDateKey, business.bookingWindowDays, workingWeekdays]);

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    availableDateKeys[0] ?? null
  );
  const [slots, setSlots] = useState<SlotDto[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotDto | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedDateKey) return;
    startTransition(async () => {
      setSlots(null);
      setSelectedSlot(null);
      const result = await fetchSlotsAction(business.id, selectedDateKey);
      setSlots(result);
    });
  }, [selectedDateKey, business.id]);

  const [state, formAction, formPending] = useActionState(
    createBookingAction,
    initialBookingState
  );

  if (state?.success && state.confirmedAt) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            ✓
          </div>
          <h2 className="text-lg font-semibold">Rendez-vous confirmé</h2>
          <p className="text-muted-foreground">
            {formatFullDate(state.confirmedAt, business.timezone)}
          </p>
          <p className="text-sm text-muted-foreground">
            Un email de confirmation vous a été envoyé.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (availableDateKeys.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Aucun créneau disponible pour le moment. Merci de contacter directement{" "}
          {business.name}.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-6">
          <div>
            <p className="mb-2 text-sm font-medium">Choisissez une date</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {availableDateKeys.map((key) => {
                const { weekday, day } = formatDayLabel(key);
                const isSelected = key === selectedDateKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDateKey(key)}
                    className={cn(
                      "flex min-w-16 shrink-0 flex-col items-center rounded-lg border px-3 py-2 text-sm capitalize transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input hover:bg-accent"
                    )}
                  >
                    <span className="text-xs opacity-80">{weekday}</span>
                    <span className="font-medium">{day}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Choisissez un horaire</p>
            {isPending && <p className="text-sm text-muted-foreground">Chargement...</p>}
            {!isPending && slots && slots.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun créneau disponible ce jour-là.
              </p>
            )}
            {!isPending && slots && slots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.startAt === slot.startAt;
                  return (
                    <button
                      key={slot.startAt}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-sm transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input hover:bg-accent"
                      )}
                    >
                      {formatTime(slot.startAt, business.timezone)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedSlot && (
        <Card>
          <CardContent className="py-6">
            <p className="mb-4 text-sm font-medium">
              Vos coordonnées —{" "}
              <span className="text-muted-foreground">
                {formatFullDate(selectedSlot.startAt, business.timezone)}
              </span>
            </p>
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="businessId" value={business.id} />
              <input type="hidden" name="startAt" value={selectedSlot.startAt} />

              <div className="space-y-1.5">
                <Label htmlFor="customerName">Nom complet</Label>
                <Input id="customerName" name="customerName" required />
                {state?.fieldErrors?.customerName && (
                  <p className="text-xs text-destructive">{state.fieldErrors.customerName[0]}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customerEmail">Email</Label>
                <Input id="customerEmail" name="customerEmail" type="email" required />
                {state?.fieldErrors?.customerEmail && (
                  <p className="text-xs text-destructive">{state.fieldErrors.customerEmail[0]}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customerPhone">Téléphone (optionnel)</Label>
                <Input id="customerPhone" name="customerPhone" type="tel" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea id="notes" name="notes" rows={3} />
              </div>

              {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

              <Button type="submit" disabled={formPending} className="w-full">
                {formPending ? "Confirmation..." : "Confirmer le rendez-vous"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
