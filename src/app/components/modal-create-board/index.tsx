import { 
  Button, 
  ColorPicker, 
  ColorPickerProps, 
  Form, 
  Input, 
  message, 
  Modal, 
  Tooltip, 
  Typography 
} from "antd";
import { VisibilitySelection, WorkspaceSelection } from "../selection";
import boardsImage from "@/app/assets/images/boards.png";
import Image from "next/image";
import { PictureOutlined, StarOutlined } from "@ant-design/icons";
import "./style.css";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { selectCurrentBoard, selectCurrentWorkspace, setCurrentBoard } from "@/app/store/workspace_slice";
import { useBoards } from "@/app/hooks/board";
import { useMemo, useState } from "react";
import { Color } from "antd/es/color-picker";
import { generateId } from "@/app/utils/general";
import { Board } from "@/app/types/board";
const { Text, Title } = Typography;

interface ModalCreateBoardForm {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const CreateBoard: React.FC<ModalCreateBoardForm> = (props: ModalCreateBoardForm) => {
  const { open, setOpen } = props;
  const [ form ] = Form.useForm();
  const currentWorkspace = useSelector(selectCurrentWorkspace);
  const currentBoard = useSelector(selectCurrentBoard);
  const { createBoard } = useBoards(currentWorkspace?.id ?? '');
  const DEFAULT_COLOR = '#FFFFFF';
  const [bg, setBg] = useState<string>(DEFAULT_COLOR);
  const router = useRouter();
  const dispatch = useDispatch();


  const handleColorChange = (color: any, hex: any) => {
    setBg(color.toHexString());
  }
  
  const onFinish = async (values: any) => {
    const tempId = generateId();
    let board: Partial<Board>;
    if (currentWorkspace !== null) {
      board = {
        workspaceId: currentWorkspace?.id,
        name: values.title,
        cover: '',
        background: values?.background?.toHexString() || "#FFFFFF",
        isStarred: false,
        description: values.description,
        createdAt: '',
        upatedAt: '',
      }

      createBoard({ board }, {
        onSuccess: (response) => {
          // Get the created board with ID from the server response
          const createdBoard = response.data?.data;
          
          // Update the selected board with the server data
          if (createdBoard) {
            dispatch(setCurrentBoard(createdBoard));
            router.push(`/workspace/${currentWorkspace.id}/board/${createdBoard.id}`);
          } else {
            // Fallback to using the temp ID if there's an issue
            dispatch(setCurrentBoard(board));
            router.push(`/workspace/${currentWorkspace.id}/board/${tempId}`);
          }
          
          // Reset and close
          dispatch(setCurrentBoard(board));
          form.resetFields();
          setBg(DEFAULT_COLOR);
          setOpen(false);
        }
      });
    }
    
  };

  const onFinishFailed = () => {
    message.error('Please check your input and try again.');
  };

  return (
    <Modal
      className="modal-create-board"
      open={open}
      onCancel={() => setOpen(false)}
      title={"Create New Board"}
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
          background: DEFAULT_COLOR
        }}
      >
        <div
          className="selected-background"
          style={{ background: bg }}
        >
          <div className="image-container">
            <Image
              alt={"boards-image"}
              src={boardsImage}
              className="preview-image"
            />
          </div>
          
          <div className="background-actions">
            <Tooltip title="Choose image">
              <Button 
                type="text" 
                shape="circle" 
                icon={<PictureOutlined />} 
                className="background-action-button"
              />
            </Tooltip>
            <Tooltip title="Save as favorite">
              <Button 
                type="text" 
                shape="circle" 
                icon={<StarOutlined />} 
                className="background-action-button"
              />
            </Tooltip>
          </div>
        </div>
        
        <div className="board-form-content">
          
          <Form.Item 
            name="background" 
            label={<Text strong>Background</Text>}
          >
            <ColorPicker
              defaultFormat="hex"
              format="hex"
              disabledAlpha={false} 
              value={DEFAULT_COLOR}
              onChange={handleColorChange}
              showText={true}
            />
          </Form.Item>
          
          <Form.Item 
            name="title" 
            label={<Text strong>Board Title</Text>} 
            rules={[{ required: true, message: 'Please enter a board title' }]}
          >
            <Input placeholder="Enter board title" size="large" />
          </Form.Item>
          
          <Form.Item name="workspace" label={<Text strong>Workspace</Text>}>
            <WorkspaceSelection />
          </Form.Item>
          
          <Form.Item name="description" label={<Text strong>Description</Text>}>
            <Input placeholder="Description..." size="large" />
          </Form.Item>
        
        </div>

        <div className="custom-footer">
          <Form.Item>
            <div className="form-action-button fx-v-right-center">
              <Button onClick={() => setOpen(false)} size="small">
                Cancel
              </Button>
              <Button htmlType="submit" size="small">
                Create Board
              </Button>
            </div>
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateBoard;