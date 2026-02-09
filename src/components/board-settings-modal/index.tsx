import {
  LoadingOutlined,
  PictureOutlined,
  StarOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { uploadFile } from "@api/file";
import boardsImage from "@assets/images/boards.png";
import { usePermissions } from "@hooks/account";
import { useBoardPermissions } from "@hooks/useBoardPermissions";
import { useRoles } from "@hooks/useRoles";
import { Role } from "@myTypes/role";
import { selectCurrentWorkspace } from "@store/workspace_slice";
import type { UploadFile } from "antd";
import {
  Button,
  ColorPicker,
  Form,
  Input,
  message,
  Modal,
  Select,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import type { RcFile } from "antd/es/upload/interface";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useBoardDetails, useUpdateBoard } from "../../hooks/board";
import { Board } from "../../types/board";
import { WorkspaceSelection } from "../selection";
import "./style.css";

type BoardBackground = {
  type: "color" | "image";
  value: string;
};

const { Option } = Select;
const { Text } = Typography;

interface BoardSettingsModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** Optional board data (if not provided, boardId must be provided) */
  board?: Board;
  /** Optional board ID (used to fetch board data if board prop is not provided) */
  boardId?: string;
  /** Optional workspace ID (not currently used but kept for future use) */
  workspaceId?: string;
  /** Callback when the board is successfully updated */
  onSuccess?: (board: Board) => void;
}

interface FormValues {
  title: string;
  description: string;
  background: string;
}

const BoardSettingsModal: React.FC<BoardSettingsModalProps> = ({
  open,
  onClose,
  board: initialBoard,
  boardId,
  workspaceId,
  onSuccess,
}) => {
  // Debug logging removed

  const [form] = Form.useForm();
  const currentWorkspace = useSelector(selectCurrentWorkspace);
  const DEFAULT_COLOR = "#FFFFFF";
  const [bg, setBg] = useState<string>(DEFAULT_COLOR);
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [rolePermissionLevels, setRolePermissionLevels] = useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const uploadRef = useRef<any>(null);
  const skipNextColorChangeRef = useRef(false);
  const router = useRouter();
  const dispatch = useDispatch();

  // Fetch roles for the current workspace
  const { roles, loading: loadingRoles } = useRoles(currentWorkspace?.id || "");
  const { mutateAsync: updateBoard } = useUpdateBoard(
    currentWorkspace?.id || ""
  );

  // Get global permissions for workspace-level actions
  const { canManageRoles } = usePermissions();

  const {
    board: fetchedBoard,
    isLoading: isLoadingBoard,
    refetch,
  } = useBoardDetails(
    boardId || initialBoard?.id || "",
    currentWorkspace?.id || "",
    {
      enabled: open && !!(boardId || initialBoard?.id),
    }
  );

  // Get board-specific permissions using the most current board data
  const currentBoardForPermissions = fetchedBoard || initialBoard;
  const boardPermissions = useBoardPermissions(currentBoardForPermissions);
  const { canManageBoardSettings, canUpdateBoard } = boardPermissions;

  // Check if user has observer-level permissions (read-only)
  const isObserver = () => {
    if (!currentBoardForPermissions) return true;
    if (currentBoardForPermissions?.user_permissions) {
      const {
        board: boardPerms,
        list,
        card,
      } = currentBoardForPermissions.user_permissions;
      // Observer: can only read, cannot create/update/delete
      return (
        !boardPerms.update && !boardPerms.delete && !list.create && !card.create
      );
    }
    // Fallback to old permission system
    return currentBoardForPermissions?.user_permission === "OBSERVER";
  };

  useEffect(() => {
    if (open) {
      setIsInitialized(false);
      setSelectedRoles([]);
      setRolePermissionLevels({});
    }
  }, [open]);

  // Initialize form with board data when it changes - but only once per modal open
  useEffect(() => {
    const currentBoard = fetchedBoard || initialBoard;

    if (currentBoard && !isInitialized) {
      const background = currentBoard.background || DEFAULT_COLOR;
      const isColorValue =
        /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(background) ||
        /^rgba?\(/i.test(background) ||
        /^hsla?\(/i.test(background) ||
        /^linear-gradient\(/i.test(background);
      const isImage = !!background && !isColorValue;

      const formValues = {
        title: currentBoard.name || "",
        description: currentBoard.description || "",
        background: isImage ? DEFAULT_COLOR : background,
      };

      form.setFieldsValue(formValues);

      if (isImage) {
        setBackgroundImage(background);
        setBg(DEFAULT_COLOR);
      } else {
        setBackgroundImage("");
        setBg(background || DEFAULT_COLOR);
      }

      // Set selected roles from board data - only during initialization
      const roleIds = currentBoard.roleIds || [];
      setSelectedRoles(roleIds);

      // Initialize role permission levels if available
      const rolePermissions = (currentBoard as any).rolePermissions || {};
      setRolePermissionLevels(rolePermissions);

      setIsInitialized(true); // Mark as initialized
    }
  }, [fetchedBoard, initialBoard, form, isInitialized]);

  // Update selected roles when both board and roles data are available
  useEffect(() => {
    const currentBoard = fetchedBoard || initialBoard;

    if (currentBoard?.roleIds && roles.length > 0 && !loadingRoles) {
      setSelectedRoles(currentBoard.roleIds);
    }
  }, [fetchedBoard, initialBoard, roles, loadingRoles]);

  // Show loading state while fetching board details
  if (isLoadingBoard) {
    return (
      <Modal
        open={open}
        onCancel={onClose}
        title="Loading Board Settings"
        footer={null}
        width={520}
        centered
      >
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      </Modal>
    );
  }

  // Get the current board (either fetched or passed in)
  const currentBoard = fetchedBoard || initialBoard;

  // If we still don't have a board, don't render the modal
  if (!currentBoard) {
    return null;
  }

  // Debug log removed

  const handleColorChange = (_color: any, hex: string) => {
    setBg(hex);

    if (skipNextColorChangeRef.current) {
      skipNextColorChangeRef.current = false;
      return;
    }

    setBackgroundImage("");
    form.setFieldsValue({ background: hex });
  };

  const beforeUpload = (file: RcFile) => {
    const isSupportedImage =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/webp";
    if (!isSupportedImage) {
      message.error("You can only upload JPG/PNG/WEBP file!");
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error("Image must smaller than 2MB!");
    }
    return isSupportedImage && isLt2M;
  };

  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    setIsUploading(true);

    try {
      const response = await uploadFile(file);
      const uploadedUrl =
        (response as any)?.data?.url ||
        (response as any)?.data?.data?.url ||
        (response as any)?.url;

      if (!uploadedUrl) {
        throw new Error("Upload response missing file URL");
      }

      const cacheBustedUrl = `${uploadedUrl}${uploadedUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;

      setBackgroundImage(cacheBustedUrl);
      skipNextColorChangeRef.current = true;
      setBg(DEFAULT_COLOR);
      form.setFieldsValue({ background: cacheBustedUrl });
      onSuccess?.(response, file);
    } catch (error) {
      console.error("Upload failed:", error);
      message.error("Failed to upload image");
      onError?.(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setBackgroundImage("");
    setBg(DEFAULT_COLOR);
    form.setFieldsValue({ background: DEFAULT_COLOR });
  };

  const onFinish = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const currentBoard = fetchedBoard || initialBoard;
      if (!currentBoard) {
        message.error("Board data not available");
        return;
      }

      const finalBackground = backgroundImage || values.background;
      const updateData = {
        boardId: currentBoard.id,
        board: {
          name: values.title,
          description: values.description,
          background: finalBackground,
          roleIds: selectedRoles,
          rolePermissions: rolePermissionLevels,
        },
      };

      await updateBoard(updateData);
      message.success("Board updated successfully!");
      onClose();
      if (onSuccess) {
        onSuccess({
          ...currentBoard,
          name: values.title,
          description: values.description,
          background: finalBackground,
          roleIds: selectedRoles,
        });
      }
    } catch (error) {
      console.error("Failed to update board:", error);
      message.error("Failed to update board");
    } finally {
      setIsLoading(false);
    }
  };

  const onFinishFailed = () => {
    message.error("Please check your input and try again.");
  };

  const handleRoleAssignmentChange = (roleId: string, assigned: boolean) => {
    if (assigned) {
      setSelectedRoles((prev) => [...prev, roleId]);
      // Set default permission level when assigning a role
      setRolePermissionLevels((prev) => ({
        ...prev,
        [roleId]: "MEMBER",
      }));
    } else {
      setSelectedRoles((prev) => prev.filter((id) => id !== roleId));
      // Remove permission level when unassigning
      setRolePermissionLevels((prev) => {
        const updated = { ...prev };
        delete updated[roleId];
        return updated;
      });
    }
  };

  const handleRolePermissionLevelChange = (
    roleId: string,
    permissionLevel: string
  ) => {
    setRolePermissionLevels((prev) => ({
      ...prev,
      [roleId]: permissionLevel,
    }));

    // Auto-assign role if setting permission level
    if (!selectedRoles.includes(roleId)) {
      setSelectedRoles((prev) => [...prev, roleId]);
    }
  };

  // Helper component for permission-controlled form items
  const PermissionFormItem: React.FC<{
    children: React.ReactNode;
    hasPermission: boolean;
    tooltipTitle?: string;
  }> = ({
    children,
    hasPermission,
    tooltipTitle = "Insufficient permissions",
  }) => {
    if (!hasPermission) {
      return (
        <Tooltip title={tooltipTitle}>
          <div style={{ opacity: 0.5, pointerEvents: "none" }}>{children}</div>
        </Tooltip>
      );
    }
    return <>{children}</>;
  };

  return (
    <Modal
      className="modal-create-board modal-cust-footer"
      open={open}
      onCancel={onClose}
      title={"Edit Board Settings"}
      footer={null}
      width={520}
      centered
      destroyOnHidden
    >
      <Form
        name="create-board-form"
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        requiredMark={false}
        initialValues={{
          title: "",
          workspace: "Personal",
          description: "",
          background: DEFAULT_COLOR,
        }}
      >
        <div
          className="selected-background"
          style={{
            backgroundColor: backgroundImage ? "transparent" : bg,
            backgroundImage: backgroundImage
              ? `url("${backgroundImage}")`
              : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
          }}
        >
          {isUploading && (
            <div className="upload-loading-overlay">
              <Spin
                indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
                tip="Uploading..."
              />
            </div>
          )}

          <div className="image-container">
            {!backgroundImage && (
              <Image
                alt={"boards-image"}
                src={boardsImage}
                className="preview-image"
              />
            )}
          </div>

          <div className="background-actions">
            <PermissionFormItem
              hasPermission={canUpdateBoard()}
              tooltipTitle="You don't have permission to change board background"
            >
              <Upload
                name="file"
                showUploadList={false}
                beforeUpload={beforeUpload}
                customRequest={handleUpload}
                fileList={fileList}
                onChange={({ fileList }) => setFileList(fileList)}
                ref={uploadRef}
                disabled={!canUpdateBoard()}
              >
                <Tooltip
                  title={
                    canUpdateBoard()
                      ? "Choose image"
                      : "You don't have permission to change board background"
                  }
                >
                  <Button
                    type="text"
                    shape="circle"
                    icon={<PictureOutlined />}
                    className="background-action-button"
                    disabled={isUploading || !canUpdateBoard()}
                  />
                </Tooltip>
              </Upload>
            </PermissionFormItem>

            {backgroundImage && (
              <PermissionFormItem
                hasPermission={canUpdateBoard()}
                tooltipTitle="You don't have permission to change board background"
              >
                <Tooltip
                  title={
                    canUpdateBoard()
                      ? "Remove image"
                      : "You don't have permission to change board background"
                  }
                >
                  <Button
                    type="text"
                    shape="circle"
                    icon={<UploadOutlined />}
                    className="background-action-button"
                    onClick={handleRemoveImage}
                    disabled={isUploading || !canUpdateBoard()}
                  />
                </Tooltip>
              </PermissionFormItem>
            )}

            <PermissionFormItem
              hasPermission={canUpdateBoard()}
              tooltipTitle="You don't have permission to save favorites"
            >
              <Tooltip
                title={
                  canUpdateBoard()
                    ? "Save as favorite"
                    : "You don't have permission to save favorites"
                }
              >
                <Button
                  type="text"
                  shape="circle"
                  icon={<StarOutlined />}
                  className="background-action-button"
                  disabled={isUploading || !canUpdateBoard()}
                />
              </Tooltip>
            </PermissionFormItem>
          </div>
        </div>

        <div className="board-form-content">
          <PermissionFormItem
            hasPermission={canUpdateBoard()}
            tooltipTitle="You don't have permission to change board background"
          >
            <Form.Item name="background" label={<Text strong>Background</Text>}>
              <div className="background-selection">
                <div className="color-picker-container">
                  <div
                    className="color-preview"
                    style={
                      {
                        "--selected-color": bg,
                        background: backgroundImage
                          ? `url("${backgroundImage}") center/cover`
                          : bg,
                      } as React.CSSProperties
                    }
                  />
                  <ColorPicker
                    defaultFormat="hex"
                    format="hex"
                    disabledAlpha={false}
                    value={bg}
                    onChange={handleColorChange}
                    showText={false}
                    disabled={isUploading || !canUpdateBoard()}
                  />
                </div>
                {backgroundImage && (
                  <span className="background-image-text">Image selected</span>
                )}
              </div>
            </Form.Item>
          </PermissionFormItem>

          <PermissionFormItem
            hasPermission={canManageBoardSettings()}
            tooltipTitle="You don't have permission to change board title"
          >
            <Form.Item
              name="title"
              label={<Text strong>Board Title</Text>}
              rules={[
                { required: true, message: "Please enter a board title" },
              ]}
            >
              <Input
                placeholder="Enter board title"
                size="large"
                disabled={!canManageBoardSettings()}
              />
            </Form.Item>
          </PermissionFormItem>

          <PermissionFormItem
            hasPermission={canManageBoardSettings()}
            tooltipTitle="You don't have permission to change board description"
          >
            <Form.Item
              label="Description"
              name="description"
              rules={[
                {
                  max: 500,
                  message: "Description cannot exceed 500 characters",
                },
              ]}
            >
              <Input.TextArea
                rows={3}
                placeholder="Add a description..."
                disabled={!canManageBoardSettings()}
              />
            </Form.Item>
          </PermissionFormItem>

          <PermissionFormItem
            hasPermission={canManageRoles()}
            tooltipTitle="You don't have permission to manage board roles"
          >
            <Form.Item
              label="Role Permissions"
              help="Configure role access and permission levels for this board (leave empty for public access)"
            >
              <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                {roles.map((role: Role) => {
                  const isAssigned = selectedRoles.includes(role.id);
                  const permissionLevel =
                    rolePermissionLevels[role.id] || "MEMBER";

                  return (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={(e) =>
                            handleRoleAssignmentChange(
                              role.id,
                              e.target.checked
                            )
                          }
                          disabled={!canManageRoles()}
                          className="w-4 h-4"
                        />
                        <div>
                          <div className="font-medium">{role.name}</div>
                          {role.description && (
                            <div className="text-sm text-gray-500">
                              {role.description}
                            </div>
                          )}
                        </div>
                      </div>
                      {isAssigned && (
                        <Select
                          value={permissionLevel}
                          onChange={(value) =>
                            handleRolePermissionLevelChange(role.id, value)
                          }
                          disabled={!canManageRoles()}
                          className="w-32"
                          size="small"
                        >
                          <Option value="OBSERVER">Observer</Option>
                          <Option value="MEMBER">Member</Option>
                          <Option value="MODERATOR">Moderator</Option>
                          <Option value="ADMIN">Admin</Option>
                        </Select>
                      )}
                    </div>
                  );
                })}
              </div>
            </Form.Item>
          </PermissionFormItem>

          <Form.Item name="workspace" label={<Text strong>Workspace</Text>}>
            <WorkspaceSelection />
          </Form.Item>

          <div className="footer">
            <Form.Item>
              <Button onClick={onClose} size="small">
                Cancel
              </Button>
            </Form.Item>
            <Form.Item>
              <Tooltip
                title={
                  !canManageBoardSettings()
                    ? "You don't have permission to save board changes"
                    : ""
                }
              >
                <Button
                  type="primary"
                  htmlType="submit"
                  size="small"
                  loading={isLoading}
                  disabled={!canManageBoardSettings() || isObserver()}
                >
                  Save Changes
                </Button>
              </Tooltip>
            </Form.Item>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default BoardSettingsModal;
