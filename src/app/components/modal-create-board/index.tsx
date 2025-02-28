import { 
  Button, 
  ColorPicker, 
  Form, 
  Input, 
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
  
  // Use Form's values to track background instead of separate state
  const backgroundGradient = Form.useWatch('background', form) || 'linear-gradient(to right, rgb(16, 142, 233), rgb(135, 208, 104))';
  
  const handleSubmit = (values: any) => {
    const tempId = `board-${Date.now()}`;
    const board: Board = {
      id: tempId,
      workspaceId: selectedWorkspace,
      title: values.title,
      cover: '',
      backgroundColor: values.background,
      isStarred: false,
      visibility: '',
      createdAt: '',
      upatedAt: '',
    }
    dispatch(setSelectedBoard(board));
    router.push(`/workspace/${selectedWorkspace}/board/${tempId}`);
    form.resetFields();
    setOpen(false);
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
        form={form} 
        layout="vertical" 
        onFinish={handleSubmit}
        requiredMark={false}
        initialValues={{ 
          title: "", 
          workspace: "Personal", 
          visibility: "Private",
          background: 'linear-gradient(to right, rgb(16, 142, 233), rgb(135, 208, 104))'
        }}
      >
        <div
          className="selected-background"
          style={{ background: backgroundGradient }}
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
            rules={[{ required: true, message: 'Please enter a board title' }]}
          >
            <ColorPicker
              defaultValue={DEFAULT_COLOR}
              allowClear
              showText
              mode={['gradient']}
              onChangeComplete={(color) => {
                form.setFieldValue('background', color.toRgbString());
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

        <div className="form-action-button fx-v-right-center">
          <Button onClick={() => setOpen(false)} size="small">
            Cancel
          </Button>
          <Button htmlType="submit" size="small">
            Create Board
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateBoard;