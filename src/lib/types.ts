export type Member = {
  clientId: string;
  name: string;
  color: string;
  joinedAt: number;
};

export type Item = {
  id: string;
  name: string;
  quantity: string;
  note: string;
  checked: boolean;
  addedBy: string;
  addedByName: string;
  checkedBy: string | null;
  checkedByName: string | null;
  createdAt: number;
};

export type Group = {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: number;
  members: Member[];
  items: Item[];
};

export type GroupSummary = {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
  itemCount: number;
  uncheckedCount: number;
};
