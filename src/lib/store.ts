import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { Group, GroupSummary, Item } from "./types";

// Kept outside the project directory so writes never trigger the dev
// file watcher (which would otherwise fast-refresh the app on every edit).
const DATA_DIR = path.join(os.tmpdir(), "panier-commun-data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

type StoreShape = {
  groups: Record<string, Group>;
};

// Serializes all reads+writes through a single queue so concurrent
// requests never clobber each other's changes to the JSON file.
let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn, fn);
  queue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as StoreShape;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { groups: {} };
    }
    throw err;
  }
}

async function writeStore(store: StoreShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmpFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(store, null, 2), "utf-8");
  await fs.rename(tmpFile, DATA_FILE);
}

// Excludes visually ambiguous characters (0/O, 1/I) from invite codes.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(existing: Set<string>): string {
  let code: string;
  do {
    code = Array.from(
      { length: 6 },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    ).join("");
  } while (existing.has(code));
  return code;
}

const MEMBER_COLORS = [
  "#16a34a",
  "#f59e0b",
  "#0ea5e9",
  "#ec4899",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#f97316",
];

function colorForIndex(i: number): string {
  return MEMBER_COLORS[i % MEMBER_COLORS.length];
}

function toSummary(group: Group): GroupSummary {
  return {
    id: group.id,
    name: group.name,
    inviteCode: group.inviteCode,
    memberCount: group.members.length,
    itemCount: group.items.length,
    uncheckedCount: group.items.filter((i) => !i.checked).length,
  };
}

export async function createGroup(
  name: string,
  creator: { clientId: string; name: string }
): Promise<Group> {
  return withLock(async () => {
    const store = await readStore();
    const existingCodes = new Set(
      Object.values(store.groups).map((g) => g.inviteCode)
    );
    const group: Group = {
      id: randomUUID(),
      name,
      inviteCode: generateInviteCode(existingCodes),
      createdAt: Date.now(),
      members: [
        {
          clientId: creator.clientId,
          name: creator.name,
          color: colorForIndex(0),
          joinedAt: Date.now(),
        },
      ],
      items: [],
    };
    store.groups[group.id] = group;
    await writeStore(store);
    return group;
  });
}

export async function joinGroupByCode(
  code: string,
  member: { clientId: string; name: string }
): Promise<Group | null> {
  return withLock(async () => {
    const store = await readStore();
    const normalized = code.trim().toUpperCase();
    const group = Object.values(store.groups).find(
      (g) => g.inviteCode === normalized
    );
    if (!group) return null;
    const already = group.members.find((m) => m.clientId === member.clientId);
    if (already) {
      already.name = member.name;
    } else {
      group.members.push({
        clientId: member.clientId,
        name: member.name,
        color: colorForIndex(group.members.length),
        joinedAt: Date.now(),
      });
    }
    await writeStore(store);
    return group;
  });
}

export async function getGroupsForClient(
  clientId: string
): Promise<GroupSummary[]> {
  const store = await readStore();
  return Object.values(store.groups)
    .filter((g) => g.members.some((m) => m.clientId === clientId))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(toSummary);
}

export async function getGroupForClient(
  groupId: string,
  clientId: string
): Promise<Group | null> {
  const store = await readStore();
  const group = store.groups[groupId];
  if (!group) return null;
  if (!group.members.some((m) => m.clientId === clientId)) return null;
  return group;
}

export async function addItem(
  groupId: string,
  clientId: string,
  input: { name: string; quantity: string; note: string }
): Promise<Item | null> {
  return withLock(async () => {
    const store = await readStore();
    const group = store.groups[groupId];
    if (!group) return null;
    const member = group.members.find((m) => m.clientId === clientId);
    if (!member) return null;
    const item: Item = {
      id: randomUUID(),
      name: input.name.trim(),
      quantity: input.quantity.trim(),
      note: input.note.trim(),
      checked: false,
      addedBy: clientId,
      addedByName: member.name,
      checkedBy: null,
      checkedByName: null,
      createdAt: Date.now(),
    };
    group.items.unshift(item);
    await writeStore(store);
    return item;
  });
}

export async function setItemChecked(
  groupId: string,
  clientId: string,
  itemId: string,
  checked: boolean
): Promise<Group | null> {
  return withLock(async () => {
    const store = await readStore();
    const group = store.groups[groupId];
    if (!group) return null;
    const member = group.members.find((m) => m.clientId === clientId);
    if (!member) return null;
    const item = group.items.find((i) => i.id === itemId);
    if (!item) return null;
    item.checked = checked;
    item.checkedBy = checked ? clientId : null;
    item.checkedByName = checked ? member.name : null;
    await writeStore(store);
    return group;
  });
}

export async function deleteItem(
  groupId: string,
  clientId: string,
  itemId: string
): Promise<boolean> {
  return withLock(async () => {
    const store = await readStore();
    const group = store.groups[groupId];
    if (!group) return false;
    if (!group.members.some((m) => m.clientId === clientId)) return false;
    const before = group.items.length;
    group.items = group.items.filter((i) => i.id !== itemId);
    if (group.items.length === before) return false;
    await writeStore(store);
    return true;
  });
}

export async function leaveGroup(
  groupId: string,
  clientId: string
): Promise<boolean> {
  return withLock(async () => {
    const store = await readStore();
    const group = store.groups[groupId];
    if (!group) return false;
    const before = group.members.length;
    group.members = group.members.filter((m) => m.clientId !== clientId);
    if (group.members.length === before) return false;
    if (group.members.length === 0) {
      delete store.groups[groupId];
    }
    await writeStore(store);
    return true;
  });
}
