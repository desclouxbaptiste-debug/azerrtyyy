"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  LogOut,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useProfile } from "@/lib/use-profile";
import type { Group } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type GroupFetchResult = { kind: "ok"; group: Group } | { kind: "not-found" };

async function fetchGroup(
  groupId: string,
  clientId: string
): Promise<GroupFetchResult> {
  const res = await fetch(
    `/api/groups/${groupId}?clientId=${encodeURIComponent(clientId)}`
  );
  if (res.status === 404) return { kind: "not-found" };
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Erreur");
  return { kind: "ok", group: data.group as Group };
}

export default function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const { profile } = useProfile();
  const [group, setGroup] = useState<Group | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!profile) {
      router.replace("/");
    }
  }, [profile, router]);

  async function loadGroup(clientId: string) {
    const result = await fetchGroup(groupId, clientId);
    if (result.kind === "not-found") setNotFound(true);
    else setGroup(result.group);
  }

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    const poll = () => {
      fetchGroup(groupId, profile.clientId).then(
        (result) => {
          if (cancelled) return;
          if (result.kind === "not-found") setNotFound(true);
          else setGroup(result.group);
        },
        () => {}
      );
    };
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [profile, groupId]);

  if (!profile) return null;

  if (notFound) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-medium">Ce groupe est introuvable.</p>
        <p className="text-sm text-muted-foreground">
          Vous n&apos;en faites peut-être pas partie, ou le code a expiré.
        </p>
        <Link href="/">
          <Button variant="secondary">Retour à l&apos;accueil</Button>
        </Link>
      </div>
    );
  }

  if (!group) {
    return null;
  }

  const clientId = profile.clientId;
  const unchecked = group.items.filter((i) => !i.checked);
  const checked = group.items.filter((i) => i.checked);

  async function handleAddItem(e: FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          name: itemName,
          quantity: itemQty,
          note: "",
        }),
      });
      if (res.ok) {
        setItemName("");
        setItemQty("");
        nameInputRef.current?.focus();
        await loadGroup(clientId);
      }
    } finally {
      setAdding(false);
    }
  }

  async function toggleItem(itemId: string, next: boolean) {
    setGroup((g) =>
      g
        ? {
            ...g,
            items: g.items.map((i) =>
              i.id === itemId ? { ...i, checked: next } : i
            ),
          }
        : g
    );
    await fetch(`/api/groups/${groupId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, checked: next }),
    });
  }

  async function removeItem(itemId: string) {
    setGroup((g) =>
      g ? { ...g, items: g.items.filter((i) => i.id !== itemId) } : g
    );
    await fetch(
      `/api/groups/${groupId}/items/${itemId}?clientId=${encodeURIComponent(clientId)}`,
      { method: "DELETE" }
    );
  }

  async function copyInviteCode() {
    try {
      await navigator.clipboard.writeText(group!.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable, ignore silently
    }
  }

  async function handleLeave() {
    if (!window.confirm("Quitter ce groupe ?")) return;
    await fetch(`/api/groups/${groupId}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    router.push("/");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold leading-tight">{group.name}</h1>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3.5" /> {group.members.length} membre
            {group.members.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={copyInviteCode}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
          title="Copier le code d'invitation"
        >
          <Copy className="size-3.5" />
          {copied ? "Copié !" : group.inviteCode}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {group.members.map((m) => (
          <span
            key={m.clientId}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-xs"
          >
            <span
              className="flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: m.color }}
            >
              {m.name.charAt(0).toUpperCase()}
            </span>
            {m.name}
          </span>
        ))}
      </div>

      <form onSubmit={handleAddItem} className="flex gap-2">
        <Input
          ref={nameInputRef}
          placeholder="Ajouter un article…"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          maxLength={80}
          className="flex-1"
          autoFocus
        />
        <Input
          placeholder="Qté"
          value={itemQty}
          onChange={(e) => setItemQty(e.target.value)}
          maxLength={20}
          className="w-20"
        />
        <Button type="submit" size="icon" disabled={adding || !itemName.trim()}>
          <Plus className="size-4" />
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        {unchecked.length === 0 && checked.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            La liste est vide. Ajoutez le premier article !
          </p>
        )}

        {unchecked.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onToggle={() => toggleItem(item.id, true)}
            onDelete={() => removeItem(item.id)}
          />
        ))}

        {checked.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Acheté ({checked.length})
            </p>
            {checked.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onToggle={() => toggleItem(item.id, false)}
                onDelete={() => removeItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleLeave}
        className="mt-4 flex items-center justify-center gap-1.5 self-center text-xs text-muted-foreground hover:text-destructive"
      >
        <LogOut className="size-3.5" /> Quitter le groupe
      </button>
    </div>
  );
}

function ItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: Group["items"][number];
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 ${
        item.checked ? "opacity-60" : ""
      }`}
    >
      <button
        onClick={onToggle}
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition ${
          item.checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input"
        }`}
        aria-label={item.checked ? "Marquer comme non acheté" : "Marquer comme acheté"}
      >
        {item.checked && <Check className="size-3.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${item.checked ? "line-through" : ""}`}>
          {item.name}
          {item.quantity && (
            <span className="ml-1.5 text-xs text-muted-foreground">
              × {item.quantity}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          ajouté par {item.addedByName}
        </p>
      </div>

      <button
        onClick={onDelete}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Supprimer"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
