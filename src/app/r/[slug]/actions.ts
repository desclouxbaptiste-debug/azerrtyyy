"use server";

import { prisma } from "@/lib/prisma";
import { getSlotsForDate, isSlotStillAvailable } from "@/lib/availability";
import { BookingSchema } from "@/lib/validation";
import { sendBookingConfirmationEmail, sendNewBookingNotificationEmail } from "@/lib/email";

export async function fetchSlotsAction(businessId: string, dateKey: string) {
  const slots = await getSlotsForDate(businessId, dateKey);
  return slots.map((slot) => ({
    startAt: slot.startAt.toISOString(),
    endAt: slot.endAt.toISOString(),
  }));
}

export type BookingFormState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
      success?: boolean;
      confirmedAt?: string;
    }
  | undefined;

export async function createBookingAction(
  _prevState: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const businessId = String(formData.get("businessId") ?? "");
  const startAtRaw = String(formData.get("startAt") ?? "");

  const parsed = BookingSchema.safeParse({
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone"),
    notes: formData.get("notes"),
    startAt: startAtRaw,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) {
    return { error: "Ce professionnel est introuvable." };
  }

  const startAt = new Date(parsed.data.startAt);
  if (Number.isNaN(startAt.getTime())) {
    return { error: "Créneau invalide, merci de réessayer." };
  }

  const available = await isSlotStillAvailable(businessId, startAt);
  if (!available) {
    return { error: "Ce créneau vient d'être réservé. Merci d'en choisir un autre." };
  }

  const endAt = new Date(startAt.getTime() + business.slotDurationMinutes * 60000);

  const appointment = await prisma.appointment.create({
    data: {
      businessId,
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone || null,
      notes: parsed.data.notes || null,
      startAt,
      endAt,
    },
  });

  await Promise.all([
    sendBookingConfirmationEmail(business, appointment),
    sendNewBookingNotificationEmail(business, appointment),
  ]);

  return { success: true, confirmedAt: startAt.toISOString() };
}
