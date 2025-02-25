import { 
  Avatar, 
  Button, 
  ColorPicker, 
  Divider, 
  Flex, 
  Form, 
  Input, 
  Modal, 
  Space, 
  Tooltip, 
  Typography 
} from "antd";
import { VisibilitySelection, WorkspaceSelection } from "../selection";
import boardsImage from "@/app/assets/images/boards.png";
import Image from "next/image";
import { PictureOutlined, CheckOutlined, StarOutlined } from "@ant-design/icons";
import "./style.css";
const { Text, Title } = Typography;

interface ModalCreateBoardForm {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onCreateBoard?: (values: any) => void;
}

const CreateBoard: React.FC<ModalCreateBoardForm> = (props: ModalCreateBoardForm) => {
  const { open, setOpen, onCreateBoard } = props;
  const [form] = Form.useForm();
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
  
  const PRESET_COLORS = [
    '#1890ff', '#f5222d', '#fa8c16', '#faad14', 
    '#13c2c2', '#52c41a', '#722ed1', '#eb2f96',
    '#2f54eb', '#fadb14', '#a0d911', '#fa541c'
  ];
  
  const handleSubmit = (values: any) => {
    if (onCreateBoard) {
      onCreateBoard(values); // Background is already included in values
    }
    form.resetFields();
    setOpen(false);
  };

  return (
    <Modal
      className="modal-create-board"
      open={open}
      onCancel={() => setOpen(false)}
      title={"Create New Board"}
      footer={
        <div className="form-action-button fx-v-right-center">
          <Button onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit">
            Create Board
          </Button>
        </div>
        }
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
            className="color-picker-item"
          >
            <ColorPicker
              defaultValue={DEFAULT_COLOR}
              allowClear
              showText
              presets={[
                {
                  label: 'Recommended',
                  colors: PRESET_COLORS,
                }
              ]}
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
          
          <Divider style={{ margin: '16px 0' }} />
          
          <Form.Item name="workspace" label={<Text strong>Workspace</Text>}>
            <WorkspaceSelection />
          </Form.Item>
          
          <Form.Item name="visibility" label={<Text strong>Visibility</Text>}>
            <VisibilitySelection />
          </Form.Item>
        
        </div>
      </Form>
    </Modal>
  );
};

export default CreateBoard;