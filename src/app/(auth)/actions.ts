"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { LoginSchema, RegisterSchema } from "@/lib/validation";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | undefined;

async function uniqueSlug(base: string) {
  const root = slugify(base) || "entreprise";
  let candidate = root;
  let suffix = 1;
  while (await prisma.business.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
  return candidate;
}

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = RegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);
  const slug = await uniqueSlug(name);

  let businessId: string;
  try {
    const business = await prisma.business.create({
      data: { name, email, passwordHash, slug },
    });
    businessId = business.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Un compte existe déjà avec cet email." };
    }
    throw error;
  }

  await createSession(businessId);
  redirect("/dashboard");
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;
  const business = await prisma.business.findUnique({ where: { email } });

  if (!business) {
    return { error: "Email ou mot de passe incorrect." };
  }

  const passwordMatches = await bcrypt.compare(password, business.passwordHash);
  if (!passwordMatches) {
    return { error: "Email ou mot de passe incorrect." };
  }

  await createSession(business.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
