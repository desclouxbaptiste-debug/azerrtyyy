import "server-only";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";

/**
 * Finds confirmed appointments whose reminder window has opened and haven't
 * been reminded yet, sends the reminder email, and stamps `reminderSentAt`.
 */
export async function runReminderSweep() {
  const now = new Date();

  const businesses = await prisma.business.findMany({
    select: { id: true, reminderHoursBefore: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const business of businesses) {
    const windowEnd = new Date(now.getTime() + business.reminderHoursBefore * 60 * 60 * 1000);

    const dueAppointments = await prisma.appointment.findMany({
      where: {
        businessId: business.id,
        status: "CONFIRMED",
        reminderSentAt: null,
        startAt: { gte: now, lte: windowEnd },
      },
      include: { business: true },
    });

    for (const appointment of dueAppointments) {
      const result = await sendReminderEmail(appointment.business, appointment);
      if (result.sent) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { reminderSentAt: new Date() },
        });
        sent += 1;
      } else {
        skipped += 1;
      }
    }
  }

  return { sent, skipped };
}
