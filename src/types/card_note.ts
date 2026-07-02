export interface CardNote {
  id: string;
  cardId: string;
  card_id?: string;
  note: string;
  divisionRoleId: string;
  division_role_id?: string;
  divisionName?: string | null;
  division_name?: string | null;
  done: boolean;
  doneBy?: string | null;
  done_by?: string | null;
  doneByName?: string | null;
  done_by_name?: string | null;
  doneAt?: string | null;
  done_at?: string | null;
  createdBy: string;
  created_by?: string;
  createdByName?: string | null;
  created_by_name?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface CreateCardNotePayload {
  note: string;
  divisionRoleId: string;
}

export interface UpdateCardNotePayload {
  note?: string;
  divisionRoleId?: string;
}
