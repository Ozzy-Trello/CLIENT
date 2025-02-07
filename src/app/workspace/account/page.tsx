'use client';
import { selectUser } from "@/app/store/slice";
import { Avatar, Typography } from "antd";
import { useSelector } from "react-redux";

const Account: React.FC = () => {

  const user = useSelector(selectUser);
  console.log("Account page: user: %o", user);

  return (
    <div style={{ overflowY: 'scroll', padding: "20px", overflowX: "hidden"}}>
      <div className="fx-h-sb-center" style={{marginBottom: "20px"}}>
        <div className="section-title fx-h-left-center">
          <Typography.Title level={4}>Account</Typography.Title>
        </div>
      </div>

      <div className="fx-h=left-start">
        <div className="section-avatar">
          <Typography.Title level={5}>Avatar</Typography.Title>
          <Avatar shape="circle" src="" size={"default"}></Avatar>
        </div>

        <div className="section-about-you">
          <Typography.Title level={5}>About You</Typography.Title>

        </div>
      </div>
    </div>
  );
}

export default Account;