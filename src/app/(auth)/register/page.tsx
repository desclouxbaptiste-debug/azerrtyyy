import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Créer un compte — Rendezo",
};

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer votre espace</CardTitle>
        <CardDescription>
          Gérez vos rendez-vous et envoyez des rappels automatiques à vos clients.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
