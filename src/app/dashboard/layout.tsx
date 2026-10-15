import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Vue d'ensemble" },
  { href: "/dashboard/appointments", label: "Rendez-vous" },
  { href: "/dashboard/availability", label: "Disponibilités" },
  { href: "/dashboard/settings", label: "Paramètres" },
];

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const business = await requireBusiness();

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                R
              </span>
              Rendezo
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{business.name}</span>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
        <nav className="flex gap-4 overflow-x-auto border-t border-border px-4 py-2 text-sm text-muted-foreground sm:hidden">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="shrink-0 hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
