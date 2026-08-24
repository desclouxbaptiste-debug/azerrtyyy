"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "panier-commun:profile";

export type Profile = {
  clientId: string;
  name: string;
};

function createClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseProfile(raw: string | null): Profile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.clientId === "string" && typeof parsed?.name === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// Module-level cache so getSnapshot returns a stable reference between
// renders (required by useSyncExternalStore to avoid render loops).
let cached: Profile | null = null;
let cachedRaw: string | null | undefined = undefined;
const listeners = new Set<() => void>();

function getSnapshot(): Profile | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parseProfile(raw);
  }
  return cached;
}

function getServerSnapshot(): Profile | null {
  return null;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function writeProfile(next: Profile) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

export function useProfile() {
  const profile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setName = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, 40);
    if (!trimmed) return;
    writeProfile({ clientId: profile?.clientId ?? createClientId(), name: trimmed });
  }, [profile]);

  return { profile, setName };
}
