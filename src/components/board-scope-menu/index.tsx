import React, { useState, useEffect } from "react";
import { Drawer, message, Input, Spin, Empty, Button } from "antd";
import TouchAwareTooltip from "@components/touch-aware-tooltip";
import {
  InfoCircleOutlined,
  InboxOutlined,
  SettingOutlined,
  FormOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { Bot } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { selectCurrentBoard } from "@store/workspace_slice";
import { usePermissions } from "@hooks/account";
import BoardSettingsModal from "../board-settings-modal";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateBoard } from "../../hooks/board";
import { Board } from "../../types/board";
import { useArchivedCards } from "@hooks/archived_cards";
import RegularCard from "@app/workspace/[workspaceId]/board/[boardId]/draggable-card/regular";
import { Card } from "@myTypes/card";
import { useCardDetailContext } from "@providers/card-detail-context";
import UploadModal from "@components/modal-upload/modal-upload";
import { accountList, createAccount } from "@api/account";
import { lists } from "@api/list";
import { api } from "@api/index";
import { addMember as addCardMember } from "@api/card_member";
import {
  customFields as fetchCustomFields,
  createCustomField,
} from "@api/custom_field";
import { EnumCustomFieldType, CustomField } from "@myTypes/custom-field";

interface BoardMenuSidebarProps {
  visible: boolean;
  setIsVisible: any;
}

interface MenuItemProps {
  icon: React.ReactNode;
  text: string;
  badge?: number | null;
  onClick?: () => void;
  divider?: boolean;
  disabled?: boolean;
  tooltipTitle?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  text,
  badge,
  onClick,
  divider = false,
  disabled = false,
  tooltipTitle,
}) => {
  const menuItem = (
    <div
      className={`flex items-center py-3 px-4 ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-gray-100 cursor-pointer"
      }`}
      onClick={disabled ? undefined : onClick}
    >
      <div className="text-gray-700 mr-4">{icon}</div>
      <span className="text-gray-800 flex-grow">{text}</span>
      {badge && (
        <div className="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">
          {badge}
        </div>
      )}
    </div>
  );

  return (
    <>
      {disabled && tooltipTitle ? (
        <TouchAwareTooltip title={tooltipTitle}>{menuItem}</TouchAwareTooltip>
      ) : (
        menuItem
      )}
      {divider && <div className="h-px w-full bg-gray-200 my-2"></div>}
    </>
  );
};

const BoardScopeMenu: React.FC<BoardMenuSidebarProps> = ({
  visible,
  setIsVisible,
}) => {
  const { workspaceId, boardId } = useParams();
  const router = useRouter();
  const currentBoard = useSelector(selectCurrentBoard);
  const queryClient = useQueryClient();
  const resolvedWorkspaceId =
    typeof workspaceId === "string" ? workspaceId : workspaceId?.[0] || "";
  const { mutate: updateBoard } = useUpdateBoard(resolvedWorkspaceId);
  const { openCardDetail } = useCardDetailContext();

  // Get permissions
  const {
    canManageBoardSettings,
    canManageBoardAutomation,
    canManageBoardCustomFields,
    canManageBoardLabels,
    canViewArchivedItems,
    isObserver,
  } = usePermissions();

  // State for settings modal
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Archived drawer state
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [searchArchived, setSearchArchived] = useState("");
  const [importCsvOpen, setImportCsvOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const boardIdString =
    typeof boardId === "string" ? boardId : boardId?.[0] || "";
  const {
    data: archivedResp,
    isLoading: archivedLoading,
    refetch: refetchArchived,
  } = useArchivedCards(boardIdString, searchArchived, archivedOpen);
  const archivedCards: Card[] = archivedResp?.data || [];

  const onClose = () => {
    setIsVisible(false);
  };

  const handleSettingsClick = () => {
    setIsSettingsModalOpen(true);
  };

  const handleArchivedClick = () => {
    setArchivedOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsModalOpen(false);
  };

  const baseColumns = [
    "name",
    "task name",
    "members",
    "assignees",
    "assigned to",
    "description",
    "produk",
    "bahan",
    "warna",
    "status",
    "list",
    "due date",
    "start date",
    "parent",
    "parent task",
  ];

  const inferType = (values: any[]): EnumCustomFieldType => {
    const nonEmpty = values.filter(
      (v) => v !== undefined && v !== null && `${v}`.trim() !== ""
    );
    if (nonEmpty.length === 0) return EnumCustomFieldType.Text;
    const allNumbers = nonEmpty.every(
      (v) => !isNaN(Number(`${v}`.replace(/,/g, "")))
    );
    if (allNumbers) return EnumCustomFieldType.Number;
    const allDates = nonEmpty.every((v) => !isNaN(Date.parse(`${v}`)));
    if (allDates) return EnumCustomFieldType.Date;
    const normalized = nonEmpty.map((v) => `${v}`.toLowerCase().trim());
    const unique = Array.from(new Set(normalized));
    const boolSet = new Set(["true", "false", "yes", "no", "0", "1"]);
    if (unique.every((u) => boolSet.has(u)))
      return EnumCustomFieldType.Checkbox;
    if (unique.length <= 10) return EnumCustomFieldType.Dropdown;
    return EnumCustomFieldType.Text;
  };

  const handleClickupParseComplete = async (_file: File, rows: any[]) => {
    if (!Array.isArray(rows) || rows.length === 0) return;
    setIsImporting(true);
    try {
      const workspace = resolvedWorkspaceId;
      const board = boardIdString;
      if (!workspace || !board) return;

      const [listResp, accountResp, cfResp] = await Promise.all([
        lists(board),
        accountList(workspace, board),
        fetchCustomFields(workspace),
      ]);

      const availableLists = listResp?.data || [];
      const existingAccounts = accountResp?.data || [];
      const existingCustomFields = cfResp?.data || [];

      const accountByEmail = new Map<string, string>();
      const accountByUsername = new Map<string, string>();
      existingAccounts.forEach((acc: any) => {
        if (acc.email)
          accountByEmail.set(String(acc.email).toLowerCase().trim(), acc.id);
        if (acc.username)
          accountByUsername.set(
            String(acc.username).toLowerCase().trim(),
            acc.id
          );
      });

      const customFieldNames = new Set(
        existingCustomFields.map((f: CustomField) =>
          (f.name || "").toLowerCase().trim()
        )
      );

      const firstRow = rows[0] || {};
      const candidateColumns = Object.keys(firstRow).filter(
        (k) => !baseColumns.includes(k.toLowerCase())
      );

      for (const col of candidateColumns) {
        const nameLower = col.toLowerCase().trim();
        if (customFieldNames.has(nameLower)) continue;
        const colValues = rows.map((r) => r[col]);
        const type = inferType(colValues);
        const payload: Partial<CustomField> = {
          name: col,
          description: "Imported field",
          source: "custom",
          type,
        };
        if (type === EnumCustomFieldType.Dropdown) {
          const optionsSet = new Set(
            colValues
              .filter(
                (v) => v !== undefined && v !== null && `${v}`.trim() !== ""
              )
              .map((v) => `${v}`.trim())
          );
          const options = Array.from(optionsSet)
            .slice(0, 50)
            .map((v) => ({ value: v, label: v }));
          payload.options = options;
        }
        try {
          const res = await createCustomField(payload, workspace);
          if (res?.data?.id) {
            customFieldNames.add(nameLower);
          }
        } catch (_err) {
          // ignore
        }
      }

      let createdCards = 0;
      for (const raw of rows) {
        const keys = Object.keys(raw || {}).reduce((acc: any, k: string) => {
          acc[k.toLowerCase().trim()] = raw[k];
          return acc;
        }, {});

        const name = keys["task name"] || keys["name"] || "";
        if (!name || String(name).trim() === "") continue;
        const description = keys["description"] || "";
        const listName = keys["status"] || keys["list"] || "";
        const dueDateRaw = keys["due date"];
        const startDateRaw = keys["start date"];
        const assigneesRaw =
          keys["assignees"] || keys["assigned to"] || keys["members"] || "";

        const targetList =
          availableLists.find(
            (l: any) =>
              String(l.name || "")
                .toLowerCase()
                .trim() ===
              String(listName || "")
                .toLowerCase()
                .trim()
          ) || availableLists[0];
        if (!targetList) continue;

        const memberIdentifiers = String(assigneesRaw || "")
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        const userIds: string[] = [];
        for (const m of memberIdentifiers) {
          const emailKey = m.includes("@") ? m.toLowerCase() : "";
          const usernameKey = m.toLowerCase();
          let uid = emailKey && accountByEmail.get(emailKey);
          if (!uid) uid = accountByUsername.get(usernameKey);
          if (!uid) {
            try {
              const payload: any = {
                email: emailKey || undefined,
                username: !emailKey ? m : undefined,
                password: "12345",
              };
              const resp = await createAccount(payload);
              if (resp?.data?.id) {
                uid = resp.data.id;
                if (emailKey) accountByEmail.set(emailKey, uid);
                if (usernameKey) accountByUsername.set(usernameKey, uid);
              }
            } catch (_err) {
              // ignore failed creation
            }
          }
          if (uid) userIds.push(uid);
        }

        const cardBody: any = {
          name: String(name).trim(),
          description: String(description || ""),
        };
        if (startDateRaw && !isNaN(Date.parse(String(startDateRaw)))) {
          cardBody.startDate = new Date(String(startDateRaw));
        }
        if (dueDateRaw && !isNaN(Date.parse(String(dueDateRaw)))) {
          cardBody.dueDate = new Date(String(dueDateRaw));
        }

        try {
          const created = await api.post("/card", cardBody, {
            headers: { "list-id": targetList.id },
          });
          const cardId = created?.data?.data?.id;
          if (cardId && userIds.length > 0) {
            await addCardMember(cardId, userIds as any);
          }
          if (cardId) createdCards += 1;
        } catch (_err) {
          // skip row on error
        }
      }

      if (createdCards > 0) {
        message.success(`Imported ${createdCards} card(s)`);
      } else {
        message.info("No cards imported");
      }
      setImportCsvOpen(false);
    } catch (err: any) {
      console.error(err);
      const msg =
        (err?.response?.data &&
          (err.response.data.message || err.response.data.error)) ||
        err?.message ||
        "Import failed. Please try again.";
      message.error(msg);
      throw err;
    } finally {
      setIsImporting(false);
    }
  };

  const handleBoardUpdate = (updatedData: Partial<Board>) => {
    if (!currentBoard) return;

    updateBoard(
      {
        boardId: currentBoard.id,
        board: updatedData,
      },
      {
        onSuccess: () => {
          message.success("Board updated successfully");
          queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
          queryClient.invalidateQueries({
            queryKey: ["boardDetails", boardId],
          });
          setIsSettingsModalOpen(false);
        },
        onError: () => {
          message.error("Failed to update board");
        },
      }
    );
  };

  // Refetch whenever drawer opens
  useEffect(() => {
    if (archivedOpen) {
      refetchArchived();
    }
  }, [archivedOpen, refetchArchived]);

  return (
    <>
      <Drawer
        title="Menu"
        placement="right"
        closable={true}
        onClose={onClose}
        open={visible}
        width={300}
        className="board-menu-sidebar"
        closeIcon={<span className="text-xl">&times;</span>}
      >
        <div className="flex flex-col">
          <MenuItem
            icon={<InfoCircleOutlined size={16} />}
            text="About this board"
          />
          <div className="text-gray-500 text-xs px-12 -mt-2 mb-3">
            {currentBoard?.description || "No description available"}
          </div>

          {/* Activity section hidden for now */}
          {/* <MenuItem icon={<UnorderedListOutlined size={16} />} text="Activity" /> */}

          <MenuItem
            icon={<InboxOutlined size={16} />}
            text="Archived items"
            onClick={handleArchivedClick}
            divider={true}
            disabled={!canViewArchivedItems()}
            tooltipTitle={
              !canViewArchivedItems()
                ? "You don't have permission to view archived items"
                : undefined
            }
          />

          <MenuItem
            icon={<SettingOutlined size={16} />}
            text="Settings"
            onClick={handleSettingsClick}
            disabled={!canManageBoardSettings()}
            tooltipTitle={
              !canManageBoardSettings()
                ? "You don't have permission to access board settings"
                : undefined
            }
          />

          {/* Change background section hidden for now */}
          {/* <MenuItem
            icon={<PictureOutlined size={16} />}
            text="Change background"
          /> */}

          <MenuItem
            icon={<FormOutlined size={16} />}
            text="Custom Fields"
            disabled={!canManageBoardCustomFields()}
            tooltipTitle={
              !canManageBoardCustomFields()
                ? "You don't have permission to manage custom fields"
                : undefined
            }
          />

          <MenuItem
            icon={<Bot size={16} />}
            text="Automation"
            onClick={() => {
              if (canManageBoardAutomation()) {
                router.push(
                  `/workspace/${workspaceId}/board/${boardId}/automation`
                );
              }
            }}
            disabled={!canManageBoardAutomation()}
            tooltipTitle={
              !canManageBoardAutomation()
                ? "You don't have permission to manage automation"
                : undefined
            }
          />

          <MenuItem
            icon={<TagOutlined size={16} />}
            text="Labels"
            disabled={!canManageBoardLabels()}
            tooltipTitle={
              !canManageBoardLabels()
                ? "You don't have permission to manage labels"
                : undefined
            }
          />

          {/* Stickers section hidden for now */}
          {/* <MenuItem icon={<SmileOutlined size={16} />} text="Stickers" /> */}

          {/* Make template section hidden for now */}
          {/* <MenuItem icon={<Trello size={16} />} text="Make template" /> */}
        </div>
      </Drawer>

      {/* Archived Cards Drawer */}
      <Drawer
        title="Archived cards"
        placement="right"
        width={360}
        onClose={() => setArchivedOpen(false)}
        open={archivedOpen}
      >
        <Input.Search
          placeholder="Search archived cards"
          allowClear
          onChange={(e) => setSearchArchived(e.target.value)}
          className="mb-4"
        />

        {archivedLoading ? (
          <div className="flex justify-center items-center h-full">
            <Spin />
          </div>
        ) : archivedCards.length === 0 ? (
          <Empty description="No archived cards" />
        ) : (
          <div
            className="flex flex-col gap-4 overflow-y-auto pr-2"
            style={{ maxHeight: "calc(100vh - 200px)" }}
          >
            {archivedCards.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-lg border border-gray-200 max-w-sm hover:border-blue-500 transition-all duration-300 overflow-hidden cursor-pointer shadow-sm"
                onClick={() =>
                  openCardDetail(card, {
                    id: card.listId,
                    name: card.listName,
                    boardId: card.boardId || "",
                  })
                }
              >
                <RegularCard
                  card={card as any}
                  isHovered={false}
                  onCompletionChange={() => {}}
                />
              </div>
            ))}
          </div>
        )}
      </Drawer>

      {/* Board Settings Modal */}
      {isSettingsModalOpen && (
        <BoardSettingsModal
          board={currentBoard || undefined}
          boardId={typeof boardId === "string" ? boardId : boardId?.[0] || ""}
          workspaceId={resolvedWorkspaceId}
          open={isSettingsModalOpen}
          onClose={handleSettingsClose}
          onSuccess={handleBoardUpdate}
        />
      )}
    </>
  );
};

export default BoardScopeMenu;
