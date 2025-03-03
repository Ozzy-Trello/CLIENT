import { 
  Button, 
  ColorPicker, 
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
import { Board } from "@/app/dto/types";
import { useSelector } from "react-redux";
import { selectSelectedWorkspace, setSelectedBoard } from "@/app/store/slice";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { getGradientString } from "@/app/utils/general";
import { useEffect, useState } from "react";
const { Text, Title } = Typography;

interface ModalCreateBoardForm {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const CreateBoard: React.FC<ModalCreateBoardForm> = (props: ModalCreateBoardForm) => {
  const { open, setOpen } = props;
  const [form] = Form.useForm();
  const selectedWorkspace = useSelector(selectSelectedWorkspace);
  const router = useRouter();
  const dispatch = useDispatch();
  
  // Define the default gradient color for the color picker
  const DEFAULT_COLOR = [
    {
      color: 'rgb(16, 142, 233)',
      percent: 0,
    },
    {
      color: 'rgb(135, 208, 104)',
      percent: 100,
    },
  ];
  
  // Get the background value from the form
  const [backgroundGradient, setBackgroundGradient] = useState(DEFAULT_COLOR);
  
  const onFinish = async (values: any) => {
    const tempId = `board-${Date.now()}`;
    
    const board: Board = {
      id: tempId,
      workspaceId: selectedWorkspace,
      title: values.title,
      cover: '',
      backgroundColor: backgroundGradient,
      isStarred: false,
      visibility: '',
      createdAt: '',
      upatedAt: '',
    }
    
    dispatch(setSelectedBoard(board));
    form.resetFields();
    setOpen(false);

    router.push(`/workspace/${selectedWorkspace}/board/${tempId}`);
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
          visibility: "Private",
          background: DEFAULT_COLOR  // Pass the gradient array directly
        }}
      >
        <div
          className="selected-background"
          style={{ background: getGradientString(backgroundGradient) }}
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
              defaultValue={DEFAULT_COLOR}
              allowClear
              showText
              format="rgb"
              mode={['gradient']}
              onChange={(value) => {
                const { colors } = value;
                if (Array.isArray(value?.colors)) { // Ensure it's a gradient array
                  const formattedGradient = colors.map(({ color, percent }) => ({
                    color: color.toRgbString(), // Convert color to string
                    percent,
                  }));
                  setBackgroundGradient(formattedGradient);
                }
              }}
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
          
          <Form.Item name="visibility" label={<Text strong>Visibility</Text>}>
            <VisibilitySelection />
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