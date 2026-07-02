import React, { useMemo, useState } from "react";
import { Button, Checkbox, Input, Popconfirm, Select, Table, Tag, Typography, message } from "antd";
import { DownOutlined, DeleteOutlined, EditOutlined, PlusOutlined, PrinterOutlined, SaveOutlined } from "@ant-design/icons";
import { useParams } from "next/navigation";
import { Card } from "@myTypes/card";
import { User } from "@myTypes/user";
import { CardNote } from "@myTypes/card_note";
import { useRoles } from "@hooks/useRoles";
import { useCardNotes } from "@hooks/card_notes";

interface NotesProps {
  card: Card;
  currentUser: User | null;
  isSuperAdmin: boolean;
}

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const noteCreatedBy = (note: CardNote) => note.createdBy ?? note.created_by;
const noteDivisionRoleId = (note: CardNote) => note.divisionRoleId ?? note.division_role_id;
const noteDivisionName = (note: CardNote) => note.divisionName ?? note.division_name ?? "PIC";
const noteDoneByName = (note: CardNote) => note.doneByName ?? note.done_by_name;
const noteDoneAt = (note: CardNote) => note.doneAt ?? note.done_at;
const noteCreatedByName = (note: CardNote) => note.createdByName ?? note.created_by_name;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const Notes: React.FC<NotesProps> = ({ card, currentUser, isSuperAdmin }) => {
  const params = useParams();
  const workspaceId = typeof params.workspaceId === "string" ? params.workspaceId : "";
  const { roles, loading: rolesLoading } = useRoles(workspaceId);
  const {
    notes,
    isLoading,
    createNote,
    updateNote,
    setDone,
    deleteNote,
    isCreating,
    isSettingDone,
  } = useCardNotes(card.id);

  const [collapsed, setCollapsed] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [divisionRoleId, setDivisionRoleId] = useState<string>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState("");
  const [editingDivisionRoleId, setEditingDivisionRoleId] = useState<string>();

  const roleOptions = useMemo(
    () => roles.map((role) => ({ label: role.name, value: role.id })),
    [roles],
  );
  const sortedNotes = useMemo(
    () =>
      [...notes].sort((a, b) => {
        const aTime = new Date(a.createdAt ?? a.created_at ?? 0).getTime();
        const bTime = new Date(b.createdAt ?? b.created_at ?? 0).getTime();
        return aTime - bTime;
      }),
    [notes],
  );
  const doneNotesCount = useMemo(
    () => notes.filter((note) => note.done).length,
    [notes],
  );

  const canToggleDone = (note: CardNote) =>
    isSuperAdmin || currentUser?.role?.id === noteDivisionRoleId(note);

  const canEditNote = (note: CardNote) =>
    isSuperAdmin || currentUser?.id === noteCreatedBy(note);

  const handleCreate = async () => {
    const trimmed = noteText.trim();
    if (!trimmed || !divisionRoleId) {
      message.warning("Isi note dan PIC dulu.");
      return;
    }

    await createNote({ note: trimmed, divisionRoleId });
    setNoteText("");
    setDivisionRoleId(undefined);
    setShowComposer(false);
  };

  const startEdit = (note: CardNote) => {
    setEditingId(note.id);
    setEditingNote(note.note);
    setEditingDivisionRoleId(noteDivisionRoleId(note));
  };

  const handleUpdate = async (noteId: string) => {
    const trimmed = editingNote.trim();
    if (!trimmed || !editingDivisionRoleId) {
      message.warning("Isi note dan PIC dulu.");
      return;
    }

    await updateNote({
      noteId,
      payload: { note: trimmed, divisionRoleId: editingDivisionRoleId },
    });
    setEditingId(null);
    setEditingNote("");
    setEditingDivisionRoleId(undefined);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) {
      message.error("Pop-up print diblokir browser.");
      return;
    }

    const printedAt = new Date().toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const rows = sortedNotes.map((note, index) => {
      return `
        <tr>
          <td class="number">${index + 1}</td>
          <td>${escapeHtml(note.note).replace(/\n/g, "<br />")}</td>
          <td>${escapeHtml(noteDivisionName(note))}</td>
          <td>${note.done ? "Done" : "Belum"}</td>
          <td></td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Notes Produksi</title>
          <style>
            @page { size: 148mm 210mm; margin: 8mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #111827; font-size: 10px; margin: 0; }
            h1 { font-size: 16px; margin: 0 0 4px; }
            .meta { color: #4b5563; margin-bottom: 10px; }
            .summary { font-weight: 700; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 4px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; font-weight: 700; }
            tbody td { height: 44px; }
            .number { width: 18px; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Notes Produksi</h1>
          <div class="meta">${escapeHtml(card.name)} · Dicetak ${escapeHtml(printedAt)}</div>
          <div class="summary">Selesai: ${doneNotesCount}/${notes.length}</div>
          <table>
            <thead>
              <tr>
                <th class="number">#</th>
                <th>Note</th>
                <th>PIC</th>
                <th>Status</th>
                <th>Done By</th>
              </tr>
            </thead>
            <tbody>${rows || `<tr><td colspan="5">No notes</td></tr>`}</tbody>
          </table>
          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const columns = [
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      width: 220,
      render: (_: unknown, note: CardNote) => {
        const editing = editingId === note.id;
        if (editing) {
          return (
            <Input.TextArea
              value={editingNote}
              onChange={(event) => setEditingNote(event.target.value)}
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          );
        }

        return <Typography.Text className="whitespace-pre-wrap">{note.note}</Typography.Text>;
      },
    },
    {
      title: "PIC",
      key: "division",
      width: 130,
      render: (_: unknown, note: CardNote) => {
        const editing = editingId === note.id;
        if (editing) {
          return (
            <Select
              className="w-full"
              options={roleOptions}
              value={editingDivisionRoleId}
              onChange={setEditingDivisionRoleId}
              showSearch
              optionFilterProp="label"
            />
          );
        }

        return <Tag color={note.done ? "green" : "blue"}>{noteDivisionName(note)}</Tag>;
      },
    },
    {
      title: "Done",
      key: "done",
      width: 150,
      render: (_: unknown, note: CardNote) => (
        <div className="space-y-1">
          <Checkbox
            checked={note.done}
            disabled={!canToggleDone(note) || isSettingDone}
            onChange={(event) => setDone({ noteId: note.id, done: event.target.checked })}
          />
          {note.done && (
            <div className="text-xs leading-tight text-gray-500">
              <div>{noteDoneByName(note) || "-"}</div>
              <div>{formatDate(noteDoneAt(note))}</div>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 92,
      align: "right" as const,
      render: (_: unknown, note: CardNote) => {
        const editing = editingId === note.id;
        if (editing) {
          return (
            <div className="flex justify-end gap-1">
              <Button size="small" onClick={() => setEditingId(null)}>Cancel</Button>
              <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => handleUpdate(note.id)} />
            </div>
          );
        }

        if (!canEditNote(note)) return null;

        return (
          <div className="flex justify-end gap-1">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => startEdit(note)} />
            <Popconfirm title="Delete note?" onConfirm={() => deleteNote(note.id)}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  return (
    <div className="mb-4 rounded-lg border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          className="flex items-center gap-2 rounded-md px-1 py-1 text-left font-semibold text-gray-700 hover:bg-gray-50"
          onClick={() => setCollapsed((value) => !value)}
        >
          <DownOutlined className={`text-xs text-gray-500 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
          <span>Notes Produksi</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {doneNotesCount}/{notes.length}
          </span>
        </button>
        <Button size="small" icon={<PrinterOutlined />} onClick={handlePrint}>
          Print
        </Button>
      </div>

      {!collapsed && (
        <div className="space-y-3 border-t border-gray-100 p-3">
          <Table
            size="small"
            rowKey="id"
            columns={columns}
            dataSource={sortedNotes}
            loading={isLoading}
            pagination={false}
            scroll={{ x: 520 }}
            locale={{ emptyText: "No notes" }}
          />

          {showComposer ? <div className="space-y-2 rounded-md bg-gray-50 p-2">
            <Input.TextArea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Add note..."
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
            <div className="flex gap-2">
              <Select
                className="flex-1"
                loading={rolesLoading}
                options={roleOptions}
                placeholder="PIC"
                value={divisionRoleId}
                onChange={setDivisionRoleId}
                showSearch
                optionFilterProp="label"
              />
              <Button type="primary" loading={isCreating} onClick={handleCreate}>
                Add
              </Button>
            </div>
          </div> : (
            <Button
              size="small"
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => setShowComposer(true)}
              block
            >
              Add note
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Notes;
