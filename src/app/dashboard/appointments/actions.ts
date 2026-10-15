"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function cancelAppointmentAction(formData: FormData) {
  const business = await requireBusiness();
  const appointmentId = String(formData.get("appointmentId") ?? "");
  if (!appointmentId) return;

  await prisma.appointment.updateMany({
    where: { id: appointmentId, businessId: business.id },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard");
}
