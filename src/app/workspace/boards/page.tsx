'use client';

import { Board } from "@/app/types";
import { boards } from "@/dummy-data";
import { Card, Col, Form, Input, List, Row, Select, Skeleton, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import "./style.css";

const sortOptions = [
 {
  "value":"most-recently-active",
  "label": "Mostly recently active"
 },
 {
  "value":"least-recently-active",
  "label": "Least recently active"
 },
 {
  "value":"alphabetically-a-z",
  "label": "Alphabetically A-Z"
 },
 {
  "value":"alphabetically-z-a",
  "label": "Alphabetically Z-A"
 } 
];

type LayoutType = Parameters<typeof Form>[0]['layout'];

const Boards: React.FC = () => {

  const [isFetching, setIsFetching] = useState(true);
  const [boardList, setBoardList] = useState<Board[]>([]);
  const [filter, setFilter] = useState({
    sortBy: "",
    filterBy: "",
    searchKeyword: ""
  });

  const [form] = Form.useForm();
  const [formLayout, setFormLayout] = useState<LayoutType>('vertical');

  const onFormLayoutChange = ({ layout }: { layout: LayoutType }) => {
    setFormLayout(layout);
  };

  const handleChange = (value: string) => {
    console.log(`selected ${value}`);
  };

  useEffect(() => {
    const fetchBoards = () => {
      setBoardList(boards);
    }

    if (isFetching) {
      setTimeout(() => {
        fetchBoards();
        setIsFetching(false);
      }, 3000)
    }
  }, [isFetching])


  return (
    <div style={{ overflowY: 'scroll', padding: "20px", overflowX: "hidden"}}>
      <div className="section-workspace">

      </div>
      <Typography.Title level={3} className="m-0">Boards</Typography.Title>

      <Form
        layout={formLayout}
        form={form}
        initialValues={{ layout: formLayout }}
        onValuesChange={onFormLayoutChange}
        className="fx-h-sb-center"
      >
        <div className="fx-h-left-center">
          <Form.Item label="Sort by">
            <Select
              defaultValue={sortOptions[0].label}
              style={{ width: 200 }}
              onChange={handleChange}
              options={sortOptions}
            />
          </Form.Item>
          <Form.Item label="Sort by">
            <Select
              defaultValue={""}
              style={{ width: 200 }}
              options={[]}
            />
          </Form.Item>
        </div>
        <Form.Item label="Search">
          <Input
            placeholder="Search…"
            prefix={<i className="fi fi-rr-search"></i>}
            style={{
              width: 200,
              borderRadius: 4,
            }}
          />
        </Form.Item>
      </Form>

      <div className="section-card">

      <Row>
        {!isFetching && boardList?.map((board, index) => {
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
                  backgroundImage: `url('${board?.cover}')`,
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
      
                  <div>
                    {board.visibility === "shared" && (
                      <i className="fi fi-ss-users-alt"></i>
                    )}

                    {board.visibility === "private" && (
                      <i className="fi fi-sr-lock"></i>
                    )}

                    {board.visibility === "public" && (
                      <i className="fi fi-ss-earth-americas"></i>
                    )}
                            
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}

        {/* Skeleton */}
        { isFetching && [1,2,3,4,5].map((item) => (
            <Space style={{margin:"5px"}}>
              <Skeleton.Input active={isFetching} size={"large"} />
            </Space>
          ))
        }
      </Row>
       
      </div>
    </div>
  )
}

export default Boards