import { Avatar, Button, Card, Col, Dropdown, Input, List, Row, Space, Typography } from "antd";
import { useState } from "react";
import Image from 'next/image';
import DropdownCardListCategory from "../dropdown-card-list-category";
import "./style.css";
import RichTextEditor from "../rich-text-editor";
import defaultPic from "../../assets/images/Logo_Ozzy_Clothing_png.png";
import { AddMemberButton } from "../button/button";

const CardDetails: React.FC = () => {

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingComment, setIsEditingComment] = useState(false);

  const enableEditDescription = () => {
    setIsEditingDescription(true);
  }

  const disableEditDescription = () => {
    setIsEditingDescription(false);
  }

  const handleSaveDescriptionClick = () => {
    setIsEditingDescription(false);
  };

  const enableEditComment = () => {
    setIsEditingComment(true);
  }

  const disableEditComment = () => {
    setIsEditingComment(false);
  }

  const handleSaveCommentClick = () => {

  }

  const handleAddMember = () => {
  }

  return (
    <div className="component-card-details">
      <div className="cover" 
        style={{
          background: `url("https://gw.alipayobjects.com/zos/rmsportal/JiqGstEfoWAOHiTxclqi.png")`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        <Button size="small" variant="outlined">Cover</Button>
      </div>

      <Row className="row">
        <Col span={20} style={{paddingRight: "10px"}}>
          <List className="card-details-list" itemLayout="vertical">
            <List.Item className="section-metadata">
              <div className="section-title-wrapper fx-h-left-center fullwidth">
                <i className="fi fi-rs-credit-card"></i>
                <Typography.Title level={5} className="m-0">Card Title Sample: slice frontend</Typography.Title>
              </div>
              <div className="body-wrapper">
                <div className="fx-h-left-center fullwidth">
                  <span>in list</span>
                  <DropdownCardListCategory />
                  <i className="fi fi-rr-eye"></i>
                </div>

                <div className="fx-h-left-center fullwidth">
                  <div className="title-wrapper fx-v-left-center">
                    <span>Members</span>
                    <div className="item-h-l" style={{gap: 3}}>
                      <Avatar size={"small"}></Avatar>
                      <AddMemberButton size={"small"} onClickFunc={handleAddMember}/>
                    </div>
                  </div>

                  <div className="members-wrapper fx-v-left-center">
                    <span>Notifications</span>
                    <Button>
                      <div className="fx-h-left-center" style={{gap: 3}}>
                        <i className="fi fi-rr-eye"></i> 
                        <span>watching</span>
                        <i className="fi fi-rr-check"></i>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            </List.Item>
            
            <List.Item className="section-description">
              <div className="section-title-wrapper fx-h-left-center fullwidth">
                <i className="fi fi-rr-symbol"></i>
                <Typography.Title level={5} className="m-0">Description</Typography.Title>
              </div>
              <div className="body-wrapper">
                {isEditingDescription ? (
                    <div>
                      <RichTextEditor />
                      <Button size="small" onClick={disableEditDescription} >Cancel</Button>
                      <Button size="small" color="primary" onClick={handleSaveDescriptionClick}>Save</Button>
                    </div>
                  ) : (
                    <div onClick={enableEditDescription}>
                      <Typography.Paragraph className="m-0">No description</Typography.Paragraph>
                    </div>
                  )}
                
              </div>
            </List.Item>

            <List.Item className="section-attachment">
              <div className="section-title-wrapper fx-h-left-center fullwidth">
                <i className="fi fi-rr-clip"></i>
                <Typography.Title level={5} className="m-0">Attachments</Typography.Title>
              </div>
              <div className="body-wrapper">
                <div className="files fx-v-left-center">
                  <span className="fullwidth">Files</span>
                  <div className="fx-h-left-center fullwidth">
                    <div className="fx-h-left-center fullwidth">
                      <Image src={defaultPic} alt="Ozzy Clothing Logo" style={{width: "50px", height: "auto", background: "grey"}} />
                      <div className="fx-h-left-center fullwidth">
                        <span className="fullwidth">Filename 1.png</span>
                        <span className="fullwidth">Added Jan 18 2025, 09:17 PM</span>
                      </div>
                    </div>
                    <div className="fx-h-right-center">
                      <Button size="small"><i className="fi fi-br-arrow-up-right"></i></Button>
                      <Button size="small"><i className="fi fi-bs-menu-dots"></i></Button>
                    </div>
                  </div>
                </div>
              </div>
            </List.Item>

            <List.Item className="section-activity">
              <div className="fx-h-sb-center">
                <div className="section-title-wrapper fullwidth fx-h-left-center">
                  <i className="fi fi-sr-list-timeline"></i>
                  <Typography.Title level={5} className="m-0">Activity</Typography.Title>
                </div>
                <Button size="small">Show details</Button>
              </div>

              <div className="section-add-comment">
                { isEditingComment ? (
                  <div className="fx-h-left-start">
                    <Avatar size={"small"} shape="circle" />
                    <div>
                      <RichTextEditor />
                      <Button size="small" onClick={disableEditComment} >Cancel</Button>
                      <Button size="small" color="primary" onClick={handleSaveCommentClick}>Add comment</Button>
                    </div>
                  </div>
                ) : (
                  <div onClick={enableEditComment} style={{cursor: "pointer"}}>
                    <Input placeholder="write comment..." readOnly={true}/>
                  </div>
                )}
              </div>
            </List.Item>
          </List>
        </Col>

        <Col span={4} style={{paddingLeft: "10px"}}>
          <List
            itemLayout="horizontal"
          >
            <List.Item>
              <Button size="small" className="fullwidth tx-align-left ">
                <i className="fi fi-rr-user-add"></i>
                <span>Join</span>
              </Button>
            </List.Item>

            <List.Item>
              <Button size="small" className="fullwidth tx-align-left ">
                <i className="fi fi-rr-user-add"></i>
                <span>Members</span>
              </Button>
            </List.Item>

            <List.Item>
              <Button size="small" className="fullwidth tx-align-left ">
                <i className="fi fi-ts-tags"></i>
                <span>Labels</span>
              </Button>
            </List.Item>

            <List.Item>
              <Button size="small" className="fullwidth tx-align-left ">
                <i className="fi fi-rr-checkbox"></i>
                <span>Checklist</span>
              </Button>
            </List.Item>

            <List.Item>
              <Button size="small" className="fullwidth tx-align-left ">
                <i className="fi fi-rr-clock-three"></i>
                <span>Dates</span>
              </Button>
            </List.Item>

            <List.Item>
              <Button size="small" className="fullwidth tx-align-left ">
                <i className="fi fi-sr-clip"></i>
                <span>Attachment</span>
              </Button>
            </List.Item>

            <List.Item>
              <Button size="small" className="fullwidth tx-align-left ">
                <i className="fi fi-rr-pen-field"></i>
                <span>Custom Fields</span>
              </Button>
            </List.Item>
          </List>
        </Col>
      </Row>
    </div>
  )
}

export default CardDetails;