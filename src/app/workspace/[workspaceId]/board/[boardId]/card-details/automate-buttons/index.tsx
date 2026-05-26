"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useCardDetailContext } from "@providers/card-detail-context";
import { useSelector } from "react-redux";
import { selectTheme, selectUser } from "@store/app_slice";
import {
  getCardButtonsForBoard,
  executeCardButton,
  updatePOMasukDM,
} from "@api/automation_rule";
import { useParams } from "next/navigation";
import { message, Tooltip } from "antd";
import { Zap } from "lucide-react";

interface CardButton {
  id: string;
  label: string;
  ruleId: string;
}

const AutomateButtons: React.FC<{
  boardName?: string;
  exclude?: string[];
  isToolbar?: boolean;
}> = ({ boardName, exclude = [], isToolbar = false }) => {
  const [cardButtons, setCardButtons] = useState<CardButton[]>([]);
  const [isFetchingButtons, setIsFetchingButtons] = useState(false);
  const [loadingByRuleId, setLoadingByRuleId] = useState<
    Record<string, boolean>
  >({});
  const { selectedCard, refetchCardDetails } = useCardDetailContext();
  const { workspaceId, boardId } = useParams();
  const theme = useSelector(selectTheme);
  const { colors } = theme;
  const isAutomationRunning = Object.values(loadingByRuleId).some(Boolean);

  useEffect(() => {
    const fetchCardButtons = async () => {
      if (!workspaceId || !boardId) return;

      try {
        setIsFetchingButtons(true);
        const response = await getCardButtonsForBoard(
          workspaceId as string,
          boardId as string,
        );

        const buttons: CardButton[] = (response.data || []).map(
          (rule: any) => ({
            id: rule.id,
            label:
              rule.condition?.buttonLabel || rule.condition?.label || "Button",
            ruleId: rule.id,
          }),
        );

        setCardButtons(buttons);
      } catch (error) {
        // message.error("Failed to load automation buttons");
      } finally {
        setIsFetchingButtons(false);
      }
    };

    fetchCardButtons();
  }, [workspaceId, boardId]);

  //   - Revisi: Adm Produksi, Kepala Produksi, SPV Desainer Outlet
  // - Konfirm Bordir: Spv Desainer Bordir, Desainer Bordir
  // - Split Job: SPV Sewing, Kepala Produksi
  // - Checked: SPV Desainer Outlet, SPV Outlet
  // Hardcoded role permissions
  const ALLOWED_ROLES: Record<string, string[]> = {
    Revisi: ["Admin Produksi", "SPV Desainer Outlet", "Kepala Produksi", "Super Admin"],
    "Konfirm Bordir": ["SPV Desainer Bordir", "Desainer Bordir", "Super Admin"],
    "Split Job": ["SPV Sewing", "Kepala Produksi", "Super Admin"],
    "Checked": ["SPV Desainer Outlet", "SPV Outlet", "Super Admin"],
  };

  const currentUser = useSelector(selectUser);

  // Filter buttons based on role
  const visibleButtons = cardButtons.filter((button) => {
    const allowedRoles = ALLOWED_ROLES[button.label];
    if (!allowedRoles) return true; // Visible to everyone if not in the list

    const userRole =
      (currentUser as any)?.roleName || (currentUser as any)?.role?.name;
    return userRole && allowedRoles.includes(userRole);
  });

  const handleButtonClick = async (button: CardButton) => {
    if (!selectedCard?.id || !workspaceId || !boardId) {
      message.error("Missing required information to execute button");
      return;
    }

    try {
      setLoadingByRuleId((prev) => ({ ...prev, [button.ruleId]: true }));
      message.loading({
        key: `automation-${button.ruleId}`,
        content: `Running "${button.label}"...`,
        duration: 0,
      });
      await executeCardButton(
        workspaceId as string,
        boardId as string,
        button.ruleId,
        selectedCard.id,
      );
      if (button.label.trim().toLowerCase() === "checked") {
        await updatePOMasukDM(selectedCard.id);
      }
      message.success({
        key: `automation-${button.ruleId}`,
        content: `"${button.label}" executed successfully!`,
      });
      // Refetch card details to update the UI
      refetchCardDetails();
    } catch (error) {
      message.error({
        key: `automation-${button.ruleId}`,
        content: `Failed to execute "${button.label}"`,
      });
    } finally {
      setLoadingByRuleId((prev) => ({ ...prev, [button.ruleId]: false }));
    }
  };

  // Theme-aware button styles with yellowish background
  const buttonStyle = {
    backgroundColor: "#fef3c7", // Light yellow background
    color: `rgb(${colors.text})`,
    border: `1px solid #f59e0b`, // Yellow border
  };

  const iconStyle = {
    color: "#f59e0b", // Yellow/orange color for thunder icon
  };

  if (cardButtons.length === 0) {
    return null;
  }

  const overlay =
    isAutomationRunning && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white text-sm font-medium pointer-events-auto">
            <span>Automation is running…</span>
            <span className="text-[11px] opacity-80">
              Hold tight, just a moment.
            </span>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {overlay}
      <div className="w-full rounded-lg">
        {/* Card Buttons */}
        <div className={isAutomationRunning ? "pointer-events-none" : ""}>
          {visibleButtons.map((button) => (
            <Tooltip
              key={button.id}
              title={`Execute automation: ${button.label}`}
            >
              <button
                onClick={() => handleButtonClick(button)}
                disabled={isFetchingButtons || !!loadingByRuleId[button.ruleId]}
                className={`text-xs flex items-center gap-1 text-left px-2 rounded-sm transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isToolbar ? "h-[24px] mr-1 inline-flex border" : "w-full mb-1 py-2"
                }`}
                style={buttonStyle}
              >
                <Zap size={14} style={iconStyle} />
                <span className="text-xs">{button.label}</span>
                {!!loadingByRuleId[button.ruleId] && (
                  <span className="text-xs ml-auto opacity-60">...</span>
                )}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
    </>
  );
};

export default AutomateButtons;
