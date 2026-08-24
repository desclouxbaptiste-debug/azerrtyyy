import { prisma } from "./prisma";
import type { Group, GroupSummary, Item, Member } from "./types";
import type {
  Group as DbGroup,
  Item as DbItem,
  Member as DbMember,
} from "@/generated/prisma/client";

const groupInclude = {
  members: { orderBy: { joinedAt: "asc" as const } },
  items: { orderBy: { createdAt: "desc" as const } },
};

type DbGroupWithRelations = DbGroup & {
  members: DbMember[];
  items: DbItem[];
};

function toMember(m: DbMember): Member {
  return {
    clientId: m.clientId,
    name: m.name,
    color: m.color,
    joinedAt: m.joinedAt.getTime(),
  };
}

function toItem(i: DbItem): Item {
  return {
    id: i.id,
    name: i.name,
    quantity: i.quantity,
    note: i.note,
    checked: i.checked,
    addedBy: i.addedByClientId,
    addedByName: i.addedByName,
    checkedBy: i.checkedByClientId,
    checkedByName: i.checkedByName,
    createdAt: i.createdAt.getTime(),
  };
}

function toGroup(g: DbGroupWithRelations): Group {
  return {
    id: g.id,
    name: g.name,
    inviteCode: g.inviteCode,
    createdAt: g.createdAt.getTime(),
    members: g.members.map(toMember),
    items: g.items.map(toItem),
  };
}

function toSummary(g: DbGroupWithRelations): GroupSummary {
  return {
    id: g.id,
    name: g.name,
    inviteCode: g.inviteCode,
    memberCount: g.members.length,
    itemCount: g.items.length,
    uncheckedCount: g.items.filter((i) => !i.checked).length,
  };
}

// Excludes visually ambiguous characters (0/O, 1/I) from invite codes.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  return Array.from(
    { length: 6 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  ).join("");
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

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}

export async function createGroup(
  name: string,
  creator: { clientId: string; name: string }
): Promise<Group> {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const group = await prisma.group.create({
        data: {
          name,
          inviteCode: generateInviteCode(),
          members: {
            create: {
              clientId: creator.clientId,
              name: creator.name,
              color: colorForIndex(0),
            },
          },
        },
        include: groupInclude,
      });
      return toGroup(group);
    } catch (err) {
      if (isUniqueConstraintError(err)) continue;
      throw err;
    }
  }
  throw new Error("Impossible de générer un code d'invitation unique");
}

export async function joinGroupByCode(
  code: string,
  member: { clientId: string; name: string }
): Promise<Group | null> {
  const normalized = code.trim().toUpperCase();
  const group = await prisma.group.findUnique({
    where: { inviteCode: normalized },
    include: groupInclude,
  });
  if (!group) return null;

  const already = group.members.find((m) => m.clientId === member.clientId);
  if (already) {
    if (already.name !== member.name) {
      await prisma.member.update({
        where: { id: already.id },
        data: { name: member.name },
      });
    }
  } else {
    await prisma.member.create({
      data: {
        groupId: group.id,
        clientId: member.clientId,
        name: member.name,
        color: colorForIndex(group.members.length),
      },
    });
  }

  const updated = await prisma.group.findUnique({
    where: { id: group.id },
    include: groupInclude,
  });
  return updated ? toGroup(updated) : null;
}

export async function getGroupsForClient(
  clientId: string
): Promise<GroupSummary[]> {
  const groups = await prisma.group.findMany({
    where: { members: { some: { clientId } } },
    include: groupInclude,
    orderBy: { createdAt: "desc" },
  });
  return groups.map(toSummary);
}

export async function getGroupForClient(
  groupId: string,
  clientId: string
): Promise<Group | null> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: groupInclude,
  });
  if (!group) return null;
  if (!group.members.some((m) => m.clientId === clientId)) return null;
  return toGroup(group);
}

export async function addItem(
  groupId: string,
  clientId: string,
  input: { name: string; quantity: string; note: string }
): Promise<Item | null> {
  const member = await prisma.member.findFirst({
    where: { groupId, clientId },
  });
  if (!member) return null;

  const item = await prisma.item.create({
    data: {
      groupId,
      name: input.name.trim(),
      quantity: input.quantity.trim(),
      note: input.note.trim(),
      addedByClientId: clientId,
      addedByName: member.name,
    },
  });
  return toItem(item);
}

export async function setItemChecked(
  groupId: string,
  clientId: string,
  itemId: string,
  checked: boolean
): Promise<Group | null> {
  const member = await prisma.member.findFirst({
    where: { groupId, clientId },
  });
  if (!member) return null;

  const { count } = await prisma.item.updateMany({
    where: { id: itemId, groupId },
    data: {
      checked,
      checkedByClientId: checked ? clientId : null,
      checkedByName: checked ? member.name : null,
    },
  });
  if (count === 0) return null;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: groupInclude,
  });
  return group ? toGroup(group) : null;
}

export async function deleteItem(
  groupId: string,
  clientId: string,
  itemId: string
): Promise<boolean> {
  const member = await prisma.member.findFirst({
    where: { groupId, clientId },
  });
  if (!member) return false;

  const { count } = await prisma.item.deleteMany({
    where: { id: itemId, groupId },
  });
  return count > 0;
}

export async function leaveGroup(
  groupId: string,
  clientId: string
): Promise<boolean> {
  const member = await prisma.member.findFirst({
    where: { groupId, clientId },
  });
  if (!member) return false;

  await prisma.member.delete({ where: { id: member.id } });

  const remaining = await prisma.member.count({ where: { groupId } });
  if (remaining === 0) {
    await prisma.group.delete({ where: { id: groupId } });
  }
  return true;
}
