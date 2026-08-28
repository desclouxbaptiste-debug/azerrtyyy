import type { Metadata } from "next";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AvailabilityForm } from "./availability-form";

export const metadata: Metadata = { title: "Disponibilités — Rendezo" };

export default async function AvailabilityPage() {
  const business = await requireBusiness();
  const workingHours = await prisma.workingHour.findMany({
    where: { businessId: business.id },
    orderBy: { weekday: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Disponibilités</h1>
        <p className="text-muted-foreground">
          Définissez vos horaires d&apos;ouverture et la durée de vos créneaux.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Horaires hebdomadaires</CardTitle>
          <CardDescription>
            Cochez les jours travaillés et indiquez vos heures d&apos;ouverture.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvailabilityForm
            workingHours={workingHours}
            slotDurationMinutes={business.slotDurationMinutes}
          />
        </CardContent>
      </Card>
    </div>
  );
}
