import type { Metadata } from "next";
import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateInZone, formatTimeInZone } from "@/lib/timezone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { cancelAppointmentAction } from "./actions";

export const metadata: Metadata = { title: "Rendez-vous — Rendezo" };

const TABS = [
  { key: "upcoming", label: "À venir" },
  { key: "past", label: "Passés" },
  { key: "cancelled", label: "Annulés" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function AppointmentsPage({
  searchParams,
}: PageProps<"/dashboard/appointments">) {
  const business = await requireBusiness();
  const params = await searchParams;
  const tabParam = Array.isArray(params?.tab) ? params.tab[0] : params?.tab;
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : "upcoming";

  const now = new Date();
  const where =
    tab === "upcoming"
      ? { businessId: business.id, status: "CONFIRMED" as const, startAt: { gte: now } }
      : tab === "past"
        ? { businessId: business.id, status: "CONFIRMED" as const, startAt: { lt: now } }
        : { businessId: business.id, status: "CANCELLED" as const };

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { startAt: tab === "past" ? "desc" : "asc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rendez-vous</h1>
        <p className="text-muted-foreground">Gérez vos rendez-vous confirmés et annulés.</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/appointments?tab=${t.key}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="py-4">
          {appointments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun rendez-vous dans cette catégorie.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {appointments.map((appt) => (
                <li key={appt.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{appt.customerName}</p>
                    <p className="text-sm text-muted-foreground">{appt.customerEmail}</p>
                    {appt.customerPhone && (
                      <p className="text-sm text-muted-foreground">{appt.customerPhone}</p>
                    )}
                    {appt.notes && <p className="mt-1 text-sm text-muted-foreground">“{appt.notes}”</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="capitalize">{formatDateInZone(appt.startAt, business.timezone)}</p>
                      <p className="text-muted-foreground">
                        {formatTimeInZone(appt.startAt, business.timezone)}
                      </p>
                    </div>
                    {appt.status === "CANCELLED" ? (
                      <Badge variant="secondary">Annulé</Badge>
                    ) : tab === "upcoming" ? (
                      <form action={cancelAppointmentAction}>
                        <input type="hidden" name="appointmentId" value={appt.id} />
                        <Button type="submit" variant="outline" size="sm">
                          Annuler
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
