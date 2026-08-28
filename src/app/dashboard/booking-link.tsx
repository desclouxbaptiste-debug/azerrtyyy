import { Card, CardContent } from "@/components/ui/card";
import { CopyLinkButton } from "./copy-link-button";

export function BookingLink({ slug }: { slug: string }) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://votre-domaine.fr";
  const url = `${base}/r/${slug}`;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <p className="text-sm font-medium">Votre lien de réservation</p>
          <p className="break-all text-sm text-muted-foreground">{url}</p>
        </div>
        <CopyLinkButton url={url} />
      </CardContent>
    </Card>
  );
}
