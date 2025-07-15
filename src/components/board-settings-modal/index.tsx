import {
  LoadingOutlined,
  PictureOutlined,
  StarOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { uploadFile } from "@api/file";
import boardsImage from "@assets/images/boards.png";
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const uploadRef = useRef<any>(null);
  const router = useRouter();
  const dispatch = useDispatch();

  // Fetch roles for the current workspace
  const { roles, loading: loadingRoles } = useRoles(currentWorkspace?.id || "");
  const { mutateAsync: updateBoard } = useUpdateBoard(
    currentWorkspace?.id || ""
  );

  const {
    board,
    isLoading: isLoadingBoard,
    refetch,
  } = useBoardDetails(
    boardId || initialBoard?.id || "",
    currentWorkspace?.id || "",
    {
      enabled: open && !!(boardId || initialBoard?.id),
    }
  );

  const handleRefresh = async () => {
    await refetch();
  };

  useEffect(() => {
    if (open) {
      handleRefresh();
      setIsInitialized(false); // Reset initialization flag when modal opens
    }
  }, [open]);

  // Initialize form with board data when it changes - but only once per modal open
  useEffect(() => {
    const currentBoard = board || initialBoard;

    if (currentBoard && !isInitialized) {
      const background = currentBoard.background || DEFAULT_COLOR;
      const isImage = background && !background.startsWith("#");

      const formValues = {
        title: currentBoard.name || "",
        description: currentBoard.description || "",
        background: isImage ? DEFAULT_COLOR : background,
      };

      form.setFieldsValue(formValues);

      if (isImage) {
        setBackgroundImage(background);
        setBg("transparent");
      } else {
        setBackgroundImage("");
        setBg(background || DEFAULT_COLOR);
      }

      // Set selected roles from board data - only during initialization
      const roleIds = currentBoard.roleIds || [];
      setSelectedRoles(roleIds);
      setIsInitialized(true); // Mark as initialized
    }
  }, [board, initialBoard, form, isInitialized]);

  // Only set selectedRoles if both board and roles are ready AND not yet initialized
  useEffect(() => {
    const currentBoard = board || initialBoard;

    if (
      currentBoard?.roleIds &&
      roles.length > 0 &&
      !loadingRoles &&
      !isInitialized
    ) {
      setSelectedRoles(currentBoard.roleIds);
      setIsInitialized(true); // Mark as initialized
    }
  }, [board, initialBoard, roles, loadingRoles, isInitialized]);

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
  const currentBoard = board || initialBoard;

  // If we still don't have a board, don't render the modal
  if (!currentBoard) {
    return null;
  }

  // Debug log removed

  const handleColorChange = (color: any, hex: any) => {
    setBg(hex);
    setBackgroundImage("");
  };

  const beforeUpload = (file: RcFile) => {
    const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
    if (!isJpgOrPng) {
      message.error("You can only upload JPG/PNG file!");
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error("Image must smaller than 2MB!");
    }
    return isJpgOrPng && isLt2M;
  };

  const handleUpload = async (options: any) => {
    const { file } = options;
    setIsUploading(true);

    try {
      const response = await uploadFile(file);
      if (response.data) {
        setBackgroundImage(response.data.url);
        setBg("transparent");
        form.setFieldsValue({ background: response.data.url });
      }
    } catch (error) {
      console.error("Upload failed:", error);
      message.error("Failed to upload image");
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
      const currentBoard = board || initialBoard;
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

  return (
    <Modal
      className="modal-create-board modal-cust-footer"
      open={open}
      onCancel={onClose}
      title={"Edit Board Settings"}
      footer={null}
      width={520}
      centered
      destroyOnClose
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
            background: bg,
            backgroundImage: backgroundImage
              ? `url(${backgroundImage})`
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
            <Upload
              name="file"
              showUploadList={false}
              beforeUpload={beforeUpload}
              customRequest={handleUpload}
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              ref={uploadRef}
            >
              <Tooltip title="Choose image">
                <Button
                  type="text"
                  shape="circle"
                  icon={<PictureOutlined />}
                  className="background-action-button"
                  disabled={isUploading}
                />
              </Tooltip>
            </Upload>

            {backgroundImage && (
              <Tooltip title="Remove image">
                <Button
                  type="text"
                  shape="circle"
                  icon={<UploadOutlined />}
                  className="background-action-button"
                  onClick={handleRemoveImage}
                  disabled={isUploading}
                />
              </Tooltip>
            )}

            <Tooltip title="Save as favorite">
              <Button
                type="text"
                shape="circle"
                icon={<StarOutlined />}
                className="background-action-button"
                disabled={isUploading}
              />
            </Tooltip>
          </div>
        </div>

        <div className="board-form-content">
          <Form.Item name="background" label={<Text strong>Background</Text>}>
            <div className="background-selection">
              <div className="color-picker-container">
                <div
                  className="color-preview"
                  style={
                    {
                      "--selected-color": bg,
                      background: backgroundImage
                        ? `url(${backgroundImage}) center/cover`
                        : bg,
                    } as React.CSSProperties
                  }
                />
                <ColorPicker
                  defaultFormat="hex"
                  format="hex"
                  disabledAlpha={false}
                  value={backgroundImage ? "transparent" : bg}
                  onChange={handleColorChange}
                  showText={false}
                  disabled={isUploading}
                />
              </div>
              {backgroundImage && (
                <span className="background-image-text">Image selected</span>
              )}
            </div>
          </Form.Item>

          <Form.Item
            name="title"
            label={<Text strong>Board Title</Text>}
            rules={[{ required: true, message: "Please enter a board title" }]}
          >
            <Input placeholder="Enter board title" size="large" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[
              { max: 500, message: "Description cannot exceed 500 characters" },
            ]}
          >
            <Input.TextArea rows={3} placeholder="Add a description..." />
          </Form.Item>

          <Form.Item
            label="Roles"
            help="Select roles that can access this board (leave empty for public access)"
          >
            <Select
              mode="multiple"
              placeholder="Select roles (leave empty for public)"
              value={selectedRoles}
              onChange={setSelectedRoles}
              loading={loadingRoles}
              optionLabelProp="label"
              tagRender={({ label, value, onClose }) => (
                <Tag
                  color="blue"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  closable
                  onClose={onClose}
                  style={{ marginRight: 3 }}
                >
                  {label}
                </Tag>
              )}
            >
              {roles.map((role: Role) => (
                <Option key={role.id} value={role.id} label={role.name}>
                  <div className="flex items-center">
                    <span>{role.name}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

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
              <Button
                type="primary"
                htmlType="submit"
                size="small"
                loading={isLoading}
              >
                Save Changes
              </Button>
            </Form.Item>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default BoardSettingsModal;
