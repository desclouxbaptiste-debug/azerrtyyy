import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";

export const getCurrentBusiness = cache(async () => {
  const session = await readSession();
  if (!session) return null;

  const business = await prisma.business.findUnique({
    where: { id: session.businessId },
  });

  return business;
});

export async function requireBusiness() {
  const business = await getCurrentBusiness();
  if (!business) {
    redirect("/login");
  }
  return business;
}
