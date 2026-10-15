"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BusinessSettingsSchema } from "@/lib/validation";
import { runReminderSweep } from "@/lib/reminders";
import { TIMEZONES } from "@/lib/timezones";

export type SettingsFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; success?: boolean }
  | undefined;

export async function updateSettingsAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const business = await requireBusiness();

  const parsed = BusinessSettingsSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    timezone: formData.get("timezone"),
    slotDurationMinutes: formData.get("slotDurationMinutes"),
    bufferMinutes: formData.get("bufferMinutes"),
    reminderHoursBefore: formData.get("reminderHoursBefore"),
    bookingWindowDays: formData.get("bookingWindowDays"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (!TIMEZONES.includes(parsed.data.timezone)) {
    return { error: "Fuseau horaire non supporté." };
  }

  await prisma.business.update({
    where: { id: business.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      timezone: parsed.data.timezone,
      slotDurationMinutes: parsed.data.slotDurationMinutes,
      bufferMinutes: parsed.data.bufferMinutes,
      reminderHoursBefore: parsed.data.reminderHoursBefore,
      bookingWindowDays: parsed.data.bookingWindowDays,
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function triggerRemindersAction() {
  await requireBusiness();
  const result = await runReminderSweep();
  revalidatePath("/dashboard/settings");
  return result;
}
