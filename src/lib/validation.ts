import * as z from "zod";

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.email("Adresse email invalide.").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

export const LoginSchema = z.object({
  email: z.email("Adresse email invalide.").trim().toLowerCase(),
  password: z.string().min(1, "Mot de passe requis."),
});

export const BusinessSettingsSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères."),
  phone: z.string().trim().optional().or(z.literal("")),
  timezone: z.string().trim().min(1),
  slotDurationMinutes: z.coerce.number().int().min(5).max(480),
  bufferMinutes: z.coerce.number().int().min(0).max(240),
  reminderHoursBefore: z.coerce.number().int().min(1).max(168),
  bookingWindowDays: z.coerce.number().int().min(1).max(180),
});

export const BookingSchema = z.object({
  customerName: z.string().trim().min(2, "Nom requis."),
  customerEmail: z.email("Adresse email invalide.").trim().toLowerCase(),
  customerPhone: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  startAt: z.iso.datetime({ offset: true }).or(z.iso.datetime()),
});
