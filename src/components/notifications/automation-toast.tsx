import { message } from "antd";

export interface AutomationToastConfig {
  cardId?: string;
  cardName?: string;
  actionType?: string;
  ruleId?: string;
}

/**
 * Show a toast notification when automation triggers.
 */
export function showAutomationToast(config: AutomationToastConfig) {
  const { cardId, cardName } = config;

  message.info({
    content: `Card "${cardName || "Untitled"}" updated by automation`,
    duration: 2,
    key: `automation-${cardId ?? "unknown"}-${Date.now()}`,
  });
}

/**
 * Show a toast for batch automation updates.
 */
export function showBatchAutomationToast(count: number) {
  message.info({
    content: `${count} cards updated by automation`,
    duration: 3,
    key: `batch-automation-${Date.now()}`,
  });
}
