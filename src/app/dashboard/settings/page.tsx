import type { Metadata } from "next";
import { requireBusiness } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";
import { SendRemindersButton } from "./send-reminders-button";

export const metadata: Metadata = { title: "Paramètres — Rendezo" };

export default async function SettingsPage() {
  const business = await requireBusiness();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">
          Informations de votre activité et réglages des rappels.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            business={{
              name: business.name,
              phone: business.phone,
              timezone: business.timezone,
              slotDurationMinutes: business.slotDurationMinutes,
              bufferMinutes: business.bufferMinutes,
              reminderHoursBefore: business.reminderHoursBefore,
              bookingWindowDays: business.bookingWindowDays,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rappels par email</CardTitle>
          <CardDescription>
            Les rappels sont envoyés automatiquement {business.reminderHoursBefore}h avant
            chaque rendez-vous via une tâche planifiée (voir README pour configurer le cron).
            Vous pouvez aussi déclencher l&apos;envoi manuellement, utile en développement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SendRemindersButton />
        </CardContent>
      </Card>
    </div>
  );
}
