import "server-only";
import { Resend } from "resend";
import type { Appointment, Business } from "@prisma/client";
import { formatDateInZone, formatTimeInZone } from "@/lib/timezone";

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getFromAddress() {
  return process.env.REMINDER_FROM_EMAIL || "rappels@example.com";
}

type SendResult = { sent: boolean; reason?: string };

async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const client = getClient();
  if (!client) {
    console.info(`[email:skip] RESEND_API_KEY absent — email non envoyé à ${to}: "${subject}"`);
    return { sent: false, reason: "missing_api_key" };
  }

  try {
    await client.emails.send({
      from: getFromAddress(),
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (error) {
    console.error("[email:error]", error);
    return { sent: false, reason: "send_failed" };
  }
}

function appointmentSummary(business: Business, appointment: Appointment) {
  const date = formatDateInZone(appointment.startAt, business.timezone);
  const time = formatTimeInZone(appointment.startAt, business.timezone);
  return { date, time };
}

export async function sendBookingConfirmationEmail(business: Business, appointment: Appointment) {
  const { date, time } = appointmentSummary(business, appointment);
  return sendEmail(
    appointment.customerEmail,
    `Rendez-vous confirmé avec ${business.name}`,
    `<p>Bonjour ${appointment.customerName},</p>
     <p>Votre rendez-vous avec <strong>${business.name}</strong> est confirmé :</p>
     <p><strong>${date} à ${time}</strong></p>
     ${appointment.notes ? `<p>Notes : ${appointment.notes}</p>` : ""}
     <p>À bientôt !</p>`
  );
}

export async function sendNewBookingNotificationEmail(business: Business, appointment: Appointment) {
  const { date, time } = appointmentSummary(business, appointment);
  return sendEmail(
    business.email,
    `Nouveau rendez-vous : ${appointment.customerName}`,
    `<p>Nouveau rendez-vous réservé :</p>
     <p><strong>${date} à ${time}</strong></p>
     <p>Client : ${appointment.customerName} (${appointment.customerEmail}${
      appointment.customerPhone ? `, ${appointment.customerPhone}` : ""
    })</p>
     ${appointment.notes ? `<p>Notes : ${appointment.notes}</p>` : ""}`
  );
}

export async function sendReminderEmail(business: Business, appointment: Appointment) {
  const { date, time } = appointmentSummary(business, appointment);
  return sendEmail(
    appointment.customerEmail,
    `Rappel : rendez-vous avec ${business.name}`,
    `<p>Bonjour ${appointment.customerName},</p>
     <p>Petit rappel de votre rendez-vous avec <strong>${business.name}</strong> :</p>
     <p><strong>${date} à ${time}</strong></p>
     <p>À très vite !</p>`
  );
}
