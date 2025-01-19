import { Avatar, Button, Card, Col, Dropdown, List, Row, Space, Typography } from "antd";
import { useState } from "react";
import Image from 'next/image';
import DropdownCardListCategory from "../dropdown-card-list-category";
import "./style.css";
import RichTextEditor from "../rich-text-editor";
import defaultPic from "../../assets/images/Logo_Ozzy_Clothing_png.png";

const CardDetails: React.FC = () => {

  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState('This is a sample description.');

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = () => {
    setIsEditing(false);
  };

  return (
    <div>
      <div className="cover" style={{height: "200px", backgroundColor: "#08124c", borderRadius: "9px 9px 0px 0px"}}>
        <div style={{display:"flex", justifyContent:"center", alignItems: "center", height: "inherit", borderRadius: "9px 9px 0px 0px"}}>
          <img
            alt="example"
            src="https://gw.alipayobjects.com/zos/rmsportal/JiqGstEfoWAOHiTxclqi.png"
            style={{
              borderRadius: "10px 0px",
              maxHeight: "inherit",
              width: "auto"
            }}
          />
        </div>
      </div>

      <Row style={{padding: "20px"}}>

        <Col span={16} style={{paddingRight: "10px"}}>
          <List className="card-details-list" itemLayout="vertical">
            <List.Item>
              <div className="title-wrapper item-h-l fullwidth">
                <i className="fi fi-rs-credit-card"></i>
                <Typography.Title level={5}>Card Title Sample: slice frontend</Typography.Title>
              </div>
              <div className="body-wrapper">
                <div className="item-h-l fullwidth">
                  <span>in list</span>
                  <DropdownCardListCategory />
                  <i className="fi fi-rr-eye"></i>
                </div>

                <div className="item-h-l fullwidth">
                  <div className="members-wrapper item-v-l">
                    <span>Members</span>
                    <div className="item-h-l" style={{gap: 3}}>
                      <Avatar size={"small"}></Avatar>
                      <Avatar size={"small"}>+</Avatar>
                    </div>
                  </div>

                  <div className="members-wrapper item-v-l">
                    <span>Notifications</span>
                    <Button>
                      <div className="item-h-l" style={{gap: 3}}>
                        <i className="fi fi-rr-eye"></i> 
                        <span>watching</span>
                        <i className="fi fi-rr-check"></i>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            </List.Item>
            
            <List.Item>
              <div className="title-wrapper item-h-l fullwidth">
                <i className="fi fi-rr-symbol"></i>
                <Typography.Title level={5}>Description</Typography.Title>
              </div>
              <div className="body-wrapper">
                <div onClick={handleEditClick}>
                  {isEditing ? (
                    <div>
                      <RichTextEditor />
                      <Button onClick={handleSaveClick}>Save</Button>
                    </div>
                  ) : (
                    <Typography.Paragraph>{description}</Typography.Paragraph>
                  )}
                </div>
              </div>
            </List.Item>

            <List.Item>
              <div className="title-wrapper item-h-l fullwidth">
                <i className="fi fi-rr-clip"></i>
                <Typography.Title level={5}>Attachments</Typography.Title>
              </div>
              <div className="body-wrapper">
                <div className="files item-v-l">
                  <span className="fullwidth">Files</span>
                  <div className="item-h-l fullwidth">
                    <div className="item-h-l fullwidth">
                      <Image src={defaultPic} alt="Ozzy Clothing Logo" style={{width: "50px", height: "auto", background: "grey"}} />
                      <div className="item-v-l fullwidth">
                        <span className="fullwidth">Filename 1.png</span>
                        <span className="fullwidth">Added Jan 18 2025, 09:17 PM</span>
                      </div>
                    </div>
                    <div className="item-h-r">
                      <Button size="small"><i className="fi fi-br-arrow-up-right"></i></Button>
                      <Button size="small"><i className="fi fi-bs-menu-dots"></i></Button>
                    </div>
                  </div>
                </div>
              </div>
            </List.Item>

            <List.Item>
              <div className="title-wrapper item-h-l fullwidth">
                <i className="fi fi-sr-list-timeline"></i>
                <Typography.Title level={5}>Activity</Typography.Title>
              </div>
            </List.Item>
          </List>
        </Col>

        <Col span={8} >
          <List
            itemLayout="horizontal"
          >
            <List.Item>
              <List.Item.Meta
                avatar={<i className="fi fi-rr-user-add"></i>}
                title={"Join"}
              />
            </List.Item>

            <List.Item>
              <List.Item.Meta
                avatar={<i className="fi fi-rr-user-add"></i>}
                title={"Members"}
              />
            </List.Item>

            <List.Item>
              <List.Item.Meta
                avatar={<i className="fi fi-rr-user-add"></i>}
                title={"Labels"}
              />
            </List.Item>

            <List.Item>
              <List.Item.Meta
                avatar={<i className="fi fi-rr-user-add"></i>}
                title={"Checklist"}
              />
            </List.Item>

            <List.Item>
              <List.Item.Meta
                avatar={<i className="fi fi-rr-user-add"></i>}
                title={"Dates"}
              />
            </List.Item>

            <List.Item>
              <List.Item.Meta
                avatar={<i className="fi fi-rr-user-add"></i>}
                title={"Attachment"}
              />
            </List.Item>

            <List.Item>
              <List.Item.Meta
                avatar={<i className="fi fi-rr-user-add"></i>}
                title={"Custom Fields"}
              />
            </List.Item>
          </List>
        </Col>
      </Row>
    </div>
  )
}

export default CardDetails;