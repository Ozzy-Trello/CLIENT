import api from ".";
import { ApiResponse, AutomationRuleApiData, AutomationRuleActionApiData } from "../types/type";

export const createRule = async (
  rule: AutomationRuleApiData
): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/automation-rule`, rule, {
    headers: { "workspace-id": rule.workspaceId },
  });
  return data;
};

export const getRule = async (
  workspaceId: string,
  boardId?: string,
  page?: number,
  limit?: number,
  fetchAll?: boolean // New parameter to fetch all data for search
): Promise<ApiResponse<any>> => {
  const params: any = {};

  if (boardId) {
    params.board_id = boardId;
  }

  // If fetchAll is true, use high limit to get all data for frontend search
  if (fetchAll) {
    params.limit = 10000;
    params.page = 1;
  } else if (page !== undefined && limit !== undefined) {
    // Use provided pagination parameters
    params.page = page;
    params.limit = limit;
  }
  // If no pagination params provided, backend will use defaults

  const { data } = await api.get(`/automation-rule`, {
    headers: { "workspace-id": workspaceId },
    params,
  });
  return data;
};

export const getRuleById = async (
  workspaceId: string,
  ruleId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.get(`/automation-rule/${ruleId}`, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export const updateRule = async (
  workspaceId: string,
  ruleId: string,
  rule: any
): Promise<ApiResponse<any>> => {
  const { data } = await api.put(`/automation-rule/${ruleId}`, rule, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export const updateTriggerOnly = async (
  workspaceId: string,
  ruleId: string,
  triggerData: {
    condition: any;
    type?: string;
    group_type?: string;
  }
): Promise<ApiResponse<any>> => {
  const { data } = await api.put(`/automation-rule/${ruleId}/trigger-only`, triggerData, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export const deleteRule = async (
  workspaceId: string,
  ruleId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.delete(`/automation-rule/${ruleId}`, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

// New granular API functions
export const updateTrigger = async (
  workspaceId: string,
  ruleId: string,
  triggerData: {
    condition: any;
    type?: string;
    group_type?: string;
  }
): Promise<ApiResponse<any>> => {
  const { data } = await api.patch(
    `/automation-rule/${ruleId}/trigger`,
    triggerData,
    {
      headers: { "workspace-id": workspaceId },
    }
  );
  return data;
};

export const updateAction = async (
  workspaceId: string,
  ruleId: string,
  actionIndex: number,
  action: any,
  boardId?: string
): Promise<ApiResponse<any>> => {
  const headers: any = { "workspace-id": workspaceId };
  if (boardId) {
    headers["board-id"] = boardId;
  }

  const { data } = await api.patch(
    `/automation-rule/${ruleId}/actions/${actionIndex}`,
    { action },
    { headers }
  );
  return data;
};

export const addAction = async (
  workspaceId: string,
  ruleId: string,
  action: any,
  boardId?: string
): Promise<ApiResponse<any>> => {
  const headers: any = { "workspace-id": workspaceId };
  if (boardId) {
    headers["board-id"] = boardId;
  }

  const { data } = await api.post(
    `/automation-rule/${ruleId}/actions`,
    { action },
    { headers }
  );
  return data;
};

export const deleteAction = async (
  workspaceId: string,
  ruleId: string,
  actionIndex: number,
  boardId?: string
): Promise<ApiResponse<any>> => {
  const headers: any = { "workspace-id": workspaceId };
  if (boardId) {
    headers["board-id"] = boardId;
  }

  const { data } = await api.delete(
    `/automation-rule/${ruleId}/actions/${actionIndex}`,
    {
      headers,
    }
  );
  return data;
};

// Direct action update by action ID - simpler approach
export const updateActionById = async (
  workspaceId: string,
  actionId: string,
  action: any
): Promise<ApiResponse<any>> => {
  const { data } = await api.patch(
    `/automation-rule/actions/${actionId}`,
    action,
    {
      headers: { "workspace-id": workspaceId },
    }
  );
  return data;
};

// Direct action deletion by action ID - simpler approach
export const deleteActionById = async (
  workspaceId: string,
  actionId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.delete(`/automation-rule/actions/${actionId}`, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

// Get card buttons for a specific board
export const getCardButtonsForBoard = async (
  workspaceId: string,
  boardId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.get(
    `/automation-rule/card-buttons/${workspaceId}/${boardId}`,
    {
      headers: { "workspace-id": workspaceId },
    }
  );
  return data;
};

// Create a card button (automation rule with type "when-button-clicked")
export const createCardButton = async (
  workspaceId: string,
  boardId: string,
  buttonData: {
    label: string;
    actions: AutomationRuleActionApiData[];
  }
): Promise<ApiResponse<any>> => {
  const rule: AutomationRuleApiData = {
    workspaceId,
    groupType: "card.button",
    type: "when-button-clicked",
    condition: {
      button_label: buttonData.label,
      board_id: boardId,
    },
    action: buttonData.actions,
  };

  return createRule(rule);
};

// Get a specific card button by ID
export const getCardButtonById = async (
  workspaceId: string,
  buttonId: string
): Promise<ApiResponse<any>> => {
  return getRuleById(workspaceId, buttonId);
};

// Update a card button (automation rule)
export const updateCardButton = async (
  workspaceId: string,
  boardId: string,
  buttonId: string,
  buttonData: {
    label: string;
    actions: AutomationRuleActionApiData[];
  }
): Promise<ApiResponse<any>> => {
  const rule: Partial<AutomationRuleApiData> = {
    condition: {
      button_label: buttonData.label,
      board_id: boardId,
    },
    action: buttonData.actions,
  };

  return updateRule(workspaceId, buttonId, rule);
};

// Execute a card button (trigger automation rule)
export const executeCardButton = async (
  workspaceId: string,
  boardId: string,
  ruleId: string,
  cardId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.get(
    `/automation-rule/card-buttons/${workspaceId}/${boardId}/${ruleId}/${cardId}`,
    {
      headers: { "workspace-id": workspaceId },
    }
  );
  return data;
};
