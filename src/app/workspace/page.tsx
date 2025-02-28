'use client';

import { useDispatch } from "react-redux";
import { useAccount } from "../hooks/account";
import { Workspace } from "../dto/types";
import { Card, Col, Row, Skeleton, Space, Typography } from "antd";
import React, { useEffect, useState } from "react";

const WorkspacePage: React.FC = () => {
  const dispatch = useDispatch();
  const [isFetching, setIsFetching] = useState(true);
  const account = useAccount();
  const [workspaceList, setWorkspaceList] = useState<Workspace[]>([]);
  const [filter, setFilter] = useState({
    sortBy: "",
    filterBy: "",
    searchKeyword: ""
  });

  useEffect(() => {
    const fetchWorkspace = () => {
    }
    if (isFetching) {
      setTimeout(() => {
        fetchWorkspace();
        setIsFetching(false);
      }, 1000)
    }
  }, [isFetching])

  return (
    <div className="page scrollable-page">
      <div className="section-workspace">
      </div>
      <Typography.Title level={3} className="m-0">Workspace</Typography.Title>
      {/* <BoardFilters /> */}
     
      <div className="section-card">
        <Row gutter={[10, 10]}>
          {!isFetching && workspaceList?.map((workspace, index) => {
            const key = `col-${index}`;
            return (
              <Col
                key={key}
                xs={{ flex: '100%' }}
                sm={{ flex: '50%' }}
                md={{ flex: '40%' }}
                lg={{ flex: '30%' }}
                xl={{ flex: '20%' }}
              >
                <Card
                  className="board-item"
                  style={{
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    height: '120px',
                    margin: '5px'
                  }}
                  bodyStyle={{
                    padding: 0,
                    height: "100%"
                  }}
                >
                  <div className="fx-v-sb-left" style={{height: '100%', width: '100%', padding: "10px"}}>
                    <Typography.Title level={3} className="title m-0">Sprint 1</Typography.Title>
                  </div>
                </Card>
              </Col>
            );
          })}
          {isFetching && [1,2,3,4,5].map((item) => (
            <Col key={item}>
              <Space style={{margin:"5px"}}>
                <Skeleton.Input active={isFetching} size={"large"} />
              </Space>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  )
}

export default WorkspacePage;