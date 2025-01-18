import { Avatar, Card, Col, List, Row } from "antd";
import { useState } from "react";

const CardForm: React.FC = () => {

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

      <Row>

        <Col span={16} >
        <List
            itemLayout="horizontal"
          >
            <List.Item>
              <List.Item.Meta
                avatar={<i className="fi fi-rs-credit-card"></i>}
                title={"Card title sample: slice frontend"}
              />
              <span>in list</span>
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

export default CardForm;