import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { dateKeyInZone } from "@/lib/timezone";
import { BookingWidget } from "./booking-widget";

export async function generateMetadata({
  params,
}: PageProps<"/r/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const business = await prisma.business.findUnique({ where: { slug } });
  return { title: business ? `Réserver — ${business.name}` : "Réserver un rendez-vous" };
}

export default async function BookingPage({ params }: PageProps<"/r/[slug]">) {
  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug },
    include: { workingHours: true },
  });

  if (!business) notFound();

  const initialDateKey = dateKeyInZone(new Date(), business.timezone);

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col px-4 py-12">
      <div className="mb-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">Réserver un rendez-vous</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{business.name}</h1>
      </div>
      <BookingWidget
        business={{
          id: business.id,
          name: business.name,
          timezone: business.timezone,
          bookingWindowDays: business.bookingWindowDays,
          slotDurationMinutes: business.slotDurationMinutes,
        }}
        workingWeekdays={[...new Set(business.workingHours.map((wh) => wh.weekday))]}
        initialDateKey={initialDateKey}
      />
    </div>
  );
}
