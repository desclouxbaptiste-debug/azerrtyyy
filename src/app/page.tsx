"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ShoppingBasket, Users, Plus, LogIn, ListChecks } from "lucide-react";
import { useProfile } from "@/lib/use-profile";
import type { GroupSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

async function fetchGroups(clientId: string): Promise<GroupSummary[]> {
  const res = await fetch(`/api/groups?clientId=${encodeURIComponent(clientId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Erreur");
  return data.groups as GroupSummary[];
}

export default function Home() {
  const { profile, setName } = useProfile();

  if (!profile) {
    return <ProfileSetup onSubmit={setName} />;
  }

  return <Dashboard clientId={profile.clientId} name={profile.name} onRename={setName} />;
}

function ProfileSetup({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setLocalName] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(name);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="fade-in w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShoppingBasket className="size-7" />
        </div>
        <h1 className="text-xl font-semibold">Panier Commun</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gérez vos listes de courses à plusieurs, en famille ou entre amis.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 text-left">
          <label className="text-sm font-medium" htmlFor="display-name">
            Comment on vous appelle ?
          </label>
          <Input
            id="display-name"
            placeholder="Votre prénom"
            value={name}
            onChange={(e) => setLocalName(e.target.value)}
            autoFocus
            maxLength={40}
          />
          <Button type="submit" disabled={!name.trim()}>
            Continuer
          </Button>
        </form>
      </div>
    </div>
  );
}

function Dashboard({
  clientId,
  name,
  onRename,
}: {
  clientId: string;
  name: string;
  onRename: (name: string) => void;
}) {
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [error, setError] = useState("");

  async function loadGroups() {
    try {
      setGroups(await fetchGroups(clientId));
      setError("");
    } catch {
      setError("Impossible de charger vos groupes.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      fetchGroups(clientId).then(
        (result) => {
          if (!cancelled) setGroups(result);
        },
        () => {
          if (!cancelled) setError("Impossible de charger vos groupes.");
        }
      );
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [clientId]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShoppingBasket className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Panier Commun</h1>
            <p className="text-xs text-muted-foreground">
              Bonjour {name} ·{" "}
              <button
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => {
                  const next = window.prompt("Votre prénom", name);
                  if (next) onRename(next);
                }}
              >
                changer
              </button>
            </p>
          </div>
        </div>
      </header>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <CreateGroupCard clientId={clientId} name={name} onCreated={loadGroups} />
        <JoinGroupCard clientId={clientId} name={name} onJoined={loadGroups} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Users className="size-4" /> Vos groupes
        </h2>

        {groups === null && (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        )}

        {groups?.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Vous n&apos;avez pas encore de groupe. Créez-en un ou rejoignez celui
            d&apos;un proche avec son code d&apos;invitation.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {groups?.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-xs transition hover:border-primary/50 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{group.name}</h3>
                <ListChecks className="size-4 text-muted-foreground transition group-hover:text-primary" />
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" /> {group.memberCount}
                </span>
                <span>
                  {group.uncheckedCount} à acheter
                  {group.itemCount > 0 ? ` / ${group.itemCount}` : ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function CreateGroupCard({
  clientId,
  name,
  onCreated,
}: {
  clientId: string;
  name: string;
  onCreated: () => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!groupName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName, clientId, memberName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setGroupName("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <Plus className="size-4 text-primary" /> Créer un groupe
      </div>
      <Input
        placeholder="Ex. Famille Dupont"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        maxLength={60}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={loading || !groupName.trim()}>
        Créer
      </Button>
    </form>
  );
}

function JoinGroupCard({
  clientId,
  name,
  onJoined,
}: {
  clientId: string;
  name: string;
  onJoined: () => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, clientId, memberName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setCode("");
      onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <LogIn className="size-4 text-primary" /> Rejoindre un groupe
      </div>
      <Input
        placeholder="Code d'invitation"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={6}
        className="uppercase tracking-widest"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        disabled={loading || !code.trim()}
      >
        Rejoindre
      </Button>
    </form>
  );
}
