import { Avatar, Button, Col, Input, List, Row, Skeleton, Space, Tooltip, Typography } from "antd";
import { useEffect, useState } from "react";
import Image from 'next/image';
import DropdownCardListCategory from "../dropdown-card-list-category";
import "./style.css";
import RichTextEditor from "../rich-text-editor";
import defaultPic from "../../assets/images/Logo_Ozzy_Clothing_png.png";
import TextArea from "antd/es/input/TextArea";
import { Task } from "@/app/types";
import { getTaskById } from "@/dummy-data";
import MembersList from "../members-list";
import CardDetailsLogs from "../card-details-logs";

const CardDetails: React.FC = () => {

  const [data, setData] = useState<Task>();
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

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


  useEffect(() => {
    const fetchData = () => {
      const task = getTaskById('1');
      setData(task);
      console.log("task: %o", task);
    }

    if (isFetching) {
      setTimeout(() => {
        fetchData();
        setIsFetching(false);
      }, 3000)
    }
  }, [isFetching]);

  return (
    <div className="component-card-details">
      <div className="cover" 
        style={{
          background: `url("https://gw.alipayobjects.com/zos/rmsportal/JiqGstEfoWAOHiTxclqi.png")`,
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
        }}
      >
        <Button size="small" variant="outlined">Cover</Button>
      </div>
      
      <Row className="row">
        <Col span={18} style={{paddingRight: "10px"}}  className="left-col">
          { !isFetching && 
            <List className="card-details-list" itemLayout="vertical">
              <List.Item className="section-metadata">
                <div className="section-title-wrapper fx-h-left-center fullwidth">
                  <i className="fi fi-rs-credit-card" style={{fontSize: "20px"}}></i>
                  <Typography.Title level={5} className="m-0">{data?.title}</Typography.Title>
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
                      { data && data?.members && (
                        <MembersList members={data?.members || []} membersLength={data?.members.length || 0} membersLoopLimit={2} />
                      )}
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
                  <i className="fi fi-rr-symbol" style={{fontSize: "20px"}}></i>
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
                        <TextArea
                          value={data?.description}
                          placeholder="Description"
                          autoSize={{ minRows: 3, maxRows: 5 }}
                        />
                      </div>
                    )}
                  
                </div>
              </List.Item>

              <List.Item className="section-attachment">
                <div className="section-title-wrapper fx-h-left-center fullwidth">
                  <i className="fi fi-rr-clip" style={{fontSize: "18px"}}></i>
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
                    <i className="fi fi-sr-list-timeline" style={{fontSize: "16px"}}></i>
                    <Typography.Title level={5} className="m-0">Activity</Typography.Title>
                  </div>
                  <Button size="small">Show details</Button>
                </div>

                <div className="section-add-comment">
                  { isEditingComment ? (
                    <div className="fx-h-left-start">
                      <Avatar size={"small"} shape="circle" />
                      <div className="fullwidth">
                        <RichTextEditor />
                        <Button size="small" onClick={disableEditComment} >Cancel</Button>
                        <Button size="small" color="primary" onClick={handleSaveCommentClick}>Add comment</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="fx-h-left-center">
                      <Avatar size={"small"} />
                      <div className="fullwidth" onClick={enableEditComment} style={{cursor: "pointer"}}>
                        <Input placeholder="write comment..." readOnly={true} className="fullwidth"/>
                      </div>
                    </div>
                    
                  )}

                  { data?.logs?.list?.map((item, index) => {
                    return (
                      <CardDetailsLogs logs={item}/>
                    )
                  }) }
                </div>
              </List.Item>


            </List>
          }

          {/* Skeleton */}
          { isFetching && 
            <Skeleton active={isFetching}  />
          }
        </Col>

        <Col span={6} style={{paddingLeft: "10px"}} className="right-col">
          { !isFetching &&
            <List
              itemLayout="horizontal"
            >
              <List.Item>
                <Button size="small" className="fullwidth fx-h-left-center">
                  <i className="fi fi-rr-user-add"></i>
                  <span>Join</span>
                </Button>
              </List.Item>

              <List.Item>
                <Button size="small" className="fullwidth fx-h-left-center">
                  <i className="fi fi-rr-user-add"></i>
                  <span>Members</span>
                </Button>
              </List.Item>

              <List.Item>
                <Button size="small" className="fullwidth fx-h-left-center">
                  <i className="fi fi-ts-tags"></i>
                  <span>Labels</span>
                </Button>
              </List.Item>

              <List.Item>
                <Button size="small" className="fullwidth fx-h-left-center">
                  <i className="fi fi-rr-checkbox"></i>
                  <span>Checklist</span>
                </Button>
              </List.Item>

              <List.Item>
                <Button size="small" className="fullwidth fx-h-left-center">
                  <i className="fi fi-rr-clock-three"></i>
                  <span>Dates</span>
                </Button>
              </List.Item>

              <List.Item>
                <Button size="small" className="fullwidth fx-h-left-center">
                  <i className="fi fi-sr-clip"></i>
                  <span>Attachment</span>
                </Button>
              </List.Item>

              <List.Item>
                <Button size="small" className="fullwidth fx-h-left-center">
                  <i className="fi fi-rr-pen-field"></i>
                  <span>Custom Fields</span>
                </Button>
              </List.Item>
            </List> 
          }

          {/* Skeleton */}
          { isFetching &&
            <div style={{marginBottom:"10px"}}>
              {
                [1,2,3].map(item => 
                  <Space style={{marginBottom:"10px"}}>
                    <Skeleton.Input size="small" active={isFetching}  />
                  </Space>
                )
              }
            </div> 
          }
        </Col>
      </Row>
    </div>
  )
}

export default CardDetails;