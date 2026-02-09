import {
  Button,
  ColorPicker,
  ColorPickerProps,
  Form,
  Input,
  message,
  Modal,
  Tooltip,
  Typography,
  Upload,
  Spin,
} from "antd";
import { VisibilitySelection, WorkspaceSelection } from "../selection";
import boardsImage from "@assets/images/boards.png";
import Image from "next/image";
import {
  PictureOutlined,
  StarOutlined,
  LoadingOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import "./style.css";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  selectCurrentBoard,
  selectCurrentWorkspace,
  setCurrentBoard,
} from "@store/workspace_slice";
import { useBoards } from "@hooks/board";
import { useMemo, useState, useRef, useEffect } from "react";
import { Color } from "antd/es/color-picker";
import { generateId } from "@utils/general";
import { Board } from "@myTypes/board";
import { uploadFile } from "@api/file";
import type { UploadProps, UploadFile } from "antd";
import type { RcFile } from "antd/es/upload/interface";
import { Select, Tag } from "antd";
import { useRoles } from "@hooks/useRoles";
import { Role } from "@myTypes/role";

const { Option } = Select;
const { Text, Title } = Typography;

interface ModalCreateBoardForm {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const CreateBoard: React.FC<ModalCreateBoardForm> = (
  props: ModalCreateBoardForm
) => {
  const { open, setOpen } = props;
  const [form] = Form.useForm();
  const currentWorkspace = useSelector(selectCurrentWorkspace);
  const currentBoard = useSelector(selectCurrentBoard);
  const { createBoard } = useBoards(currentWorkspace?.id ?? "");
  const DEFAULT_COLOR = "#FFFFFF";
  const [bg, setBg] = useState<string>(DEFAULT_COLOR);
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [rolePermissionLevels, setRolePermissionLevels] = useState<
    Record<string, string>
  >({});
  const uploadRef = useRef<any>(null);
  const router = useRouter();
  const dispatch = useDispatch();

  // Fetch roles for the current workspace
  const { roles, loading: loadingRoles } = useRoles(currentWorkspace?.id || "");

  const handleColorChange = (color: Color, hex: string) => {
    setBackgroundImage("");
    setFileList([]);
    setBg(hex);
    form.setFieldsValue({ background: hex });
  };

  const beforeUpload = (file: RcFile) => {
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      message.error("You can only upload image files!");
      return false;
    }

    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error("Image must be smaller than 2MB!");
      return false;
    }

    return true;
  };

  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;

    try {
      setIsUploading(true);
      const result = await uploadFile(file);

      if (result && result.data) {
        const cacheBustedUrl = `${result.data.url}${result.data.url.includes("?") ? "&" : "?"}v=${Date.now()}`;
        setBackgroundImage(cacheBustedUrl);
        setBg("transparent"); // Make the background transparent to show the image
        form.setFieldsValue({ background: cacheBustedUrl });
        message.success("Background image uploaded successfully!");
        onSuccess(result, file);
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      message.error("Failed to upload background image");
      onError(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setBackgroundImage("");
    setFileList([]);
    setBg(DEFAULT_COLOR);
  };

  const handleRoleAssignmentChange = (roleId: string, isAssigned: boolean) => {
    if (isAssigned) {
      setSelectedRoles((prev) => [...prev, roleId]);
      setRolePermissionLevels((prev) => ({ ...prev, [roleId]: "MEMBER" }));
    } else {
      setSelectedRoles((prev) => prev.filter((id) => id !== roleId));
      setRolePermissionLevels((prev) => {
        const newLevels = { ...prev };
        delete newLevels[roleId];
        return newLevels;
      });
    }
  };

  const handleRolePermissionLevelChange = (
    roleId: string,
    permissionLevel: string
  ) => {
    setRolePermissionLevels((prev) => ({ ...prev, [roleId]: permissionLevel }));
    if (!selectedRoles.includes(roleId)) {
      setSelectedRoles((prev) => [...prev, roleId]);
    }
  };

  const onFinish = async (values: any) => {
    const tempId = generateId();
    let board: Partial<Board>;
    if (currentWorkspace !== null) {
      board = {
        workspaceId: currentWorkspace?.id,
        name: values.title,
        cover: backgroundImage || "",
        background: backgroundImage ? backgroundImage : values.background,
        isStarred: false,
        description: values.description,
        createdAt: "",
        upatedAt: "",
        roleIds: selectedRoles.length > 0 ? selectedRoles : undefined,
        rolePermissions: rolePermissionLevels,
      };

      createBoard(
        { board },
        {
          onSuccess: (response) => {
            // Get the created board with ID from the server response
            const createdBoard = response.data?.data;

            // Update the selected board with the server data
            if (createdBoard) {
              dispatch(setCurrentBoard(createdBoard));
              router.push(
                `/workspace/${currentWorkspace.id}/board/${createdBoard.id}`
              );
            } else {
              // Fallback to using the temp ID if there's an issue
              dispatch(setCurrentBoard(board));
              router.push(`/workspace/${currentWorkspace.id}/board/${tempId}`);
            }

            // Reset and close
            dispatch(setCurrentBoard(board));
            form.resetFields();
            setBg(DEFAULT_COLOR);
            setBackgroundImage("");
            setSelectedRoles([]);
            setRolePermissionLevels({});
            setOpen(false);
          },
        }
      );
    }
  };

  const onFinishFailed = () => {
    message.error("Please check your input and try again.");
  };

  return (
    <Modal
      className="modal-create-board modal-cust-footer"
      open={open}
      onCancel={() => setOpen(false)}
      title={"Create New Board"}
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
                  value={form.getFieldValue("background") || bg}
                  onChange={handleColorChange}
                  showText={false}
                  disabled={isUploading}
                  onChangeComplete={(color) => {
                    form.setFieldsValue({ background: color.toHexString() });
                  }}
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
                          handleRoleAssignmentChange(role.id, e.target.checked)
                        }
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

          <Form.Item name="workspace" label={<Text strong>Workspace</Text>}>
            <WorkspaceSelection />
          </Form.Item>

          <div className="footer">
            <Form.Item>
              <Button onClick={() => setOpen(false)} size="small">
                Cancel
              </Button>
            </Form.Item>
            <Form.Item>
              <Button htmlType="submit" size="small">
                Create Board
              </Button>
            </Form.Item>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateBoard;
