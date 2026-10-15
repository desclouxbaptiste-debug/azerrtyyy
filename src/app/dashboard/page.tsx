import type { Metadata } from "next";
import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateInZone, formatTimeInZone } from "@/lib/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingLink } from "./booking-link";

export const metadata: Metadata = { title: "Tableau de bord — Rendezo" };

export default async function DashboardPage() {
  const business = await requireBusiness();
  const now = new Date();
  const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [upcoming, todayCount, weekCount] = await Promise.all([
    prisma.appointment.findMany({
      where: { businessId: business.id, status: "CONFIRMED", startAt: { gte: now } },
      orderBy: { startAt: "asc" },
      take: 5,
    }),
    prisma.appointment.count({
      where: {
        businessId: business.id,
        status: "CONFIRMED",
        startAt: {
          gte: now,
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
      },
    }),
    prisma.appointment.count({
      where: {
        businessId: business.id,
        status: "CONFIRMED",
        startAt: { gte: now, lt: endOfWeek },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bonjour {business.name}</h1>
          <p className="text-muted-foreground">Voici l&apos;activité de vos rendez-vous.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/availability">Configurer mes disponibilités</Link>
        </Button>
      </div>

      <BookingLink slug={business.slug} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rendez-vous aujourd&apos;hui
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{todayCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rendez-vous cette semaine
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{weekCount}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prochains rendez-vous</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun rendez-vous à venir.</p>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((appt) => (
                <li key={appt.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{appt.customerName}</p>
                    <p className="text-muted-foreground">{appt.customerEmail}</p>
                  </div>
                  <p className="text-right text-muted-foreground">
                    <span className="capitalize">{formatDateInZone(appt.startAt, business.timezone)}</span>
                    <br />
                    {formatTimeInZone(appt.startAt, business.timezone)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
