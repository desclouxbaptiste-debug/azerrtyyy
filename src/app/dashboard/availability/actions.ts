"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AvailabilityFormState = { error?: string; success?: boolean } | undefined;

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export async function saveAvailabilityAction(
  _prevState: AvailabilityFormState,
  formData: FormData
): Promise<AvailabilityFormState> {
  const business = await requireBusiness();

  const slotDurationMinutes = Number(formData.get("slotDurationMinutes"));
  if (!slotDurationMinutes || slotDurationMinutes < 5 || slotDurationMinutes > 480) {
    return { error: "Durée de créneau invalide." };
  }

  const entries: { weekday: number; startMinute: number; endMinute: number }[] = [];

  for (let weekday = 0; weekday <= 6; weekday++) {
    const enabled = formData.get(`enabled-${weekday}`) === "on";
    if (!enabled) continue;

    const start = String(formData.get(`start-${weekday}`) ?? "");
    const end = String(formData.get(`end-${weekday}`) ?? "");
    if (!start || !end) continue;

    const startMinute = toMinutes(start);
    const endMinute = toMinutes(end);

    if (endMinute - startMinute < slotDurationMinutes) {
      return {
        error: `Le créneau du jour ${weekday} est trop court pour la durée choisie.`,
      };
    }

    entries.push({ weekday, startMinute, endMinute });
  }

  await prisma.$transaction([
    prisma.business.update({
      where: { id: business.id },
      data: { slotDurationMinutes },
    }),
    prisma.workingHour.deleteMany({ where: { businessId: business.id } }),
    ...(entries.length > 0
      ? [
          prisma.workingHour.createMany({
            data: entries.map((entry) => ({ ...entry, businessId: business.id })),
          }),
        ]
      : []),
  ]);

  revalidatePath("/dashboard/availability");
  revalidatePath("/dashboard");

  return { success: true };
}
