import { Avatar } from "antd"

interface AddMemberButtonProps {
  size: any; // Assuming size is a string (adjust type if needed)
  onClickFunc: () => void;
}

export const AddMemberButton: React.FC<AddMemberButtonProps> = (props) => {
  return (
    <Avatar 
      className="fx-h-center-center" 
      size={props?.size || 'small'}
      style={{ cursor: "pointer" }}
      onClick={props?.onClickFunc}
    >
      <i className="fi fi-br-plus"></i>
    </Avatar>
  );
};
