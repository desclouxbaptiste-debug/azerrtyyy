import "server-only";
import { prisma } from "@/lib/prisma";
import { zonedTimeToUtc } from "@/lib/timezone";

export type Slot = {
  startAt: Date;
  endAt: Date;
};

const MIN_LEAD_TIME_MINUTES = 30;

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

function weekdayForDateKey(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isDateKeyWithinWindow(dateKey: string, bookingWindowDays: number) {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const max = new Date(today.getTime() + bookingWindowDays * 24 * 60 * 60 * 1000);
  const maxKey = max.toISOString().slice(0, 10);
  return dateKey >= todayKey && dateKey <= maxKey;
}

export async function getSlotsForDate(businessId: string, dateKey: string): Promise<Slot[]> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { workingHours: true },
  });
  if (!business) return [];
  if (!isDateKeyWithinWindow(dateKey, business.bookingWindowDays)) return [];

  const weekday = weekdayForDateKey(dateKey);
  const hours = business.workingHours.find((wh) => wh.weekday === weekday);
  if (!hours) return [];

  const { year, month, day } = parseDateKey(dateKey);
  const dayStart = zonedTimeToUtc(year, month, day, 0, 0, business.timezone);
  const dayEnd = zonedTimeToUtc(year, month, day, 23, 59, business.timezone);

  const existing = await prisma.appointment.findMany({
    where: {
      businessId,
      status: "CONFIRMED",
      startAt: { lte: dayEnd },
      endAt: { gte: dayStart },
    },
    select: { startAt: true, endAt: true },
  });

  const bufferMs = business.bufferMinutes * 60000;
  const busyWindows = existing.map((appt) => ({
    start: appt.startAt.getTime() - bufferMs,
    end: appt.endAt.getTime() + bufferMs,
  }));

  const slotDurationMs = business.slotDurationMinutes * 60000;
  const now = Date.now();
  const earliestStart = now + MIN_LEAD_TIME_MINUTES * 60000;

  const slots: Slot[] = [];
  for (
    let minute = hours.startMinute;
    minute + business.slotDurationMinutes <= hours.endMinute;
    minute += business.slotDurationMinutes
  ) {
    const startAt = zonedTimeToUtc(
      year,
      month,
      day,
      Math.floor(minute / 60),
      minute % 60,
      business.timezone
    );
    const endAt = new Date(startAt.getTime() + slotDurationMs);

    if (startAt.getTime() < earliestStart) continue;

    const overlaps = busyWindows.some(
      (busy) => startAt.getTime() < busy.end && endAt.getTime() > busy.start
    );
    if (overlaps) continue;

    slots.push({ startAt, endAt });
  }

  return slots;
}

export async function isSlotStillAvailable(businessId: string, startAt: Date) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return false;

  const endAt = new Date(startAt.getTime() + business.slotDurationMinutes * 60000);
  const bufferMs = business.bufferMinutes * 60000;

  const conflict = await prisma.appointment.findFirst({
    where: {
      businessId,
      status: "CONFIRMED",
      startAt: { lt: new Date(endAt.getTime() + bufferMs) },
      endAt: { gt: new Date(startAt.getTime() - bufferMs) },
    },
  });

  return !conflict && startAt.getTime() > Date.now();
}
