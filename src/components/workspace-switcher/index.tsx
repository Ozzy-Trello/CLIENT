"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Button, Form, Input, Modal, Select, Switch, message } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useParams } from "next/navigation";
import {
  selectCurrentWorkspace,
  setCurrentWorkspace,
} from "@store/workspace_slice";
import { useCreateWorkspace, useUpdateWorkspace, useWorkspaces } from "@hooks/workspace";
import { useAccountListForModal, useCurrentAccount } from "@hooks/account";
import { selectCurrentBoard } from "@store/workspace_slice";
import { Lock } from "lucide-react";

const slugifyValue = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 60);

const WorkspaceSwitcher = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const params = useParams();
  const { workspaces, isLoading } = useWorkspaces();
  const currentWorkspace = useSelector(selectCurrentWorkspace);
  const currentBoard = useSelector(selectCurrentBoard);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const createWorkspaceMutation = useCreateWorkspace();
  const updateWorkspaceMutation = useUpdateWorkspace();
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [isPrivate, setIsPrivate] = useState(false);
  const { data: currentAccountData } = useCurrentAccount();
  const currentUserId = currentAccountData?.data?.id;

  const workspacesList = workspaces || [];
  const selectedWorkspaceForUsers =
    currentWorkspace?.id || workspacesList[0]?.id || "";

  const { data: accountListData, isLoading: accountsLoading } =
    useAccountListForModal({
      workspaceId: selectedWorkspaceForUsers,
      boardId: currentBoard?.id,
    });

  const memberOptions = useMemo(() => {
    return (
      accountListData?.data?.map((account) => ({
        value: account.id,
        label: account.username || account.email,
      })) || []
    );
  }, [accountListData]);

  useEffect(() => {
    const routeWorkspaceId = Array.isArray(params.workspaceId)
      ? params.workspaceId[0]
      : (params.workspaceId as string | undefined);

    if (routeWorkspaceId) {
      const matchingWorkspace = workspacesList.find(
        (workspace) => workspace.id === routeWorkspaceId
      );
      if (matchingWorkspace) {
        dispatch(setCurrentWorkspace(matchingWorkspace));
        return;
      }
    }

    if (!currentWorkspace && workspacesList.length > 0) {
      dispatch(setCurrentWorkspace(workspacesList[0]));
    }
  }, [params.workspaceId, workspacesList, currentWorkspace, dispatch]);

  const handleSelectChange = (value: string) => {
    const selected = workspacesList.find((item) => item.id === value);
    if (selected) {
      dispatch(setCurrentWorkspace(selected));
      router.push(`/workspace/${selected.id}`);
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setIsModalOpen(true);
    form.resetFields();
    setSlugManuallyEdited(false);
    setIsPrivate(false);
    form.setFieldsValue({
      memberIds: [],
    });
  };

  const openEditModal = () => {
    if (!currentWorkspace) {
      message.warning("Select a workspace to edit");
      return;
    }
    const workspace = workspacesList.find(
      (item) => item.id === currentWorkspace.id
    );
    if (!workspace) {
      message.error("Workspace not found");
      return;
    }
    setModalMode("edit");
    setIsModalOpen(true);
    form.setFieldsValue({
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      memberIds: workspace.memberIds || [],
    });
    setSlugManuallyEdited(true);
    setIsPrivate(!!workspace.isRestricted);
    if (workspace.isRestricted && (!workspace.memberIds || workspace.memberIds.length === 0) && currentUserId) {
      form.setFieldsValue({ memberIds: [currentUserId] });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    form.resetFields();
    setSlugManuallyEdited(false);
  };

  const handleNameInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!slugManuallyEdited && modalMode === "create") {
      form.setFieldsValue({ slug: slugifyValue(event.target.value) });
    }
  };

  const handlePrivacyToggle = (checked: boolean) => {
    setIsPrivate(checked);
    if (!checked) {
      form.setFieldsValue({ memberIds: [] });
    } else {
      const existing: string[] = form.getFieldValue("memberIds") || [];
      if (existing.length === 0 && currentUserId) {
        form.setFieldsValue({ memberIds: [currentUserId] });
      }
    }
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name.trim(),
        slug: (values.slug || slugifyValue(values.name)).trim(),
        description: values.description?.trim() || undefined,
        memberIds: isPrivate
          ? Array.from(
              new Set([
                ...(values.memberIds || []),
                ...(currentUserId ? [currentUserId] : []),
              ])
            )
          : [],
      };

      if (modalMode === "create") {
        const response = await createWorkspaceMutation.mutateAsync(payload);
        message.success("Workspace created");
        closeModal();

        const newWorkspaceId = response.data?.id;
        if (newWorkspaceId) {
          const newWorkspace = {
            id: newWorkspaceId,
            name: payload.name,
            description: payload.description || "",
            slug: payload.slug,
            memberIds: payload.memberIds,
            isRestricted: payload.memberIds.length > 0,
          };
          dispatch(setCurrentWorkspace(newWorkspace));
          router.push(`/workspace/${newWorkspaceId}`);
        }
      } else if (modalMode === "edit" && currentWorkspace) {
        await updateWorkspaceMutation.mutateAsync({
          workspaceId: currentWorkspace.id,
          payload,
        });
        message.success("Workspace updated");
        closeModal();
        dispatch(
          setCurrentWorkspace({
            ...currentWorkspace,
            name: payload.name || currentWorkspace.name,
            description: payload.description ?? currentWorkspace.description,
            slug: payload.slug || currentWorkspace.slug,
            memberIds: payload.memberIds,
            isRestricted: payload.memberIds.length > 0,
          })
        );
      }
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      const serverMessage = error?.response?.data?.message || error?.message;
      message.error(
        serverMessage ||
          (modalMode === "create"
            ? "Failed to create workspace"
            : "Failed to update workspace")
      );
    }
  };

  const renderWorkspaceLabel = (workspace: any) => (
    <span className="flex items-center gap-2">
      <span>{workspace.name}</span>
      {workspace.isRestricted && (
        <Lock size={14} className="text-gray-400" />
      )}
    </span>
  );

  return (
    <>
      <Select
        style={{ minWidth: 180 }}
        showSearch
        placeholder="Select workspace"
        value={currentWorkspace?.id}
        optionFilterProp="label"
        onChange={handleSelectChange}
        loading={isLoading}
        options={workspacesList.map((workspace) => ({
          label: renderWorkspaceLabel(workspace),
          value: workspace.id,
        }))}
        dropdownRender={(menu) => (
          <>
            {menu}
            <div className="border-t border-gray-100 px-3 py-2">
              <Button type="link" block onClick={openCreateModal}>
                + Create workspace
              </Button>
              <Button
                type="link"
                block
                disabled={!currentWorkspace}
                onClick={openEditModal}
              >
                Manage workspace
              </Button>
            </div>
          </>
        )}
        notFoundContent={
          isLoading ? "Loading workspaces..." : "No workspaces available"
        }
      />

      <Modal
        title={modalMode === "create" ? "Create Workspace" : "Edit Workspace"}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={handleModalSubmit}
        okText={modalMode === "create" ? "Create" : "Save"}
        confirmLoading={
          modalMode === "create"
            ? createWorkspaceMutation.isPending
            : updateWorkspaceMutation.isPending
        }
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Workspace name"
            name="name"
            rules={[
              { required: true, message: "Please enter a workspace name" },
            ]}
          >
            <Input placeholder="My Workspace" onChange={handleNameInputChange} />
          </Form.Item>
          <Form.Item
            label="Slug"
            name="slug"
            rules={[{ required: true, message: "Please enter a slug" }]}
          >
            <Input
              placeholder="my-workspace"
              onChange={() => setSlugManuallyEdited(true)}
            />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea
              placeholder="Optional description"
            rows={3}
            maxLength={200}
          />
        </Form.Item>
        <Form.Item
          label="Workspace visibility"
          tooltip="Private workspaces are only visible to selected users"
        >
          <div className="flex items-center gap-2">
            <Switch
              checked={isPrivate}
              onChange={handlePrivacyToggle}
              checkedChildren="Private"
              unCheckedChildren="Public"
            />
            <span className="text-sm text-gray-500">
              {isPrivate
                ? "Only selected users can access this workspace"
                : "Everyone can access this workspace"}
            </span>
          </div>
        </Form.Item>
        <Form.Item
          label="Allowed users"
          name="memberIds"
            extra="Leave empty to allow everyone to access this workspace."
          >
            <Select
              mode="multiple"
              showSearch
              allowClear
              placeholder="Select users (optional)"
            options={memberOptions}
            optionFilterProp="label"
            loading={accountsLoading}
            disabled={!selectedWorkspaceForUsers || !isPrivate}
            notFoundContent={
                !selectedWorkspaceForUsers
                  ? "Select a workspace to load users"
                  : accountsLoading
                  ? "Loading users..."
                  : "No users available"
            }
          />
        </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default WorkspaceSwitcher;
