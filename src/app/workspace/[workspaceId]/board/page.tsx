"use client";
import { Card, Col, Row, Skeleton, Space, Typography } from "antd";
import { useState } from "react";
import "./style.css";
import dynamic from "next/dynamic";
import { Earth, Lock, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBoards } from "@/app/hooks/board";

// Move this outside the component
const BoardFilters = dynamic(() => import("./_filter_form"), {
  ssr: false,
  loading: () => <div>Loading filters...</div>,
});

// Change this to a regular function declaration
const BoardsPage: React.FC = () => {
  const { workspaceId } = useParams();
  const { boards, isLoading } = useBoards(
    Array.isArray(workspaceId) ? workspaceId[0] : workspaceId || ""
  );
  const [filter, setFilter] = useState({
    sortBy: "",
    filterBy: "",
    searchKeyword: "",
  });

  return (
    <div className="page scrollable-page">
      <div className="section-workspace"></div>
      <Typography.Title level={3} className="m-0">
        Boards
      </Typography.Title>
      <BoardFilters />

      <div className="section-card">
        <Row gutter={[10, 10]}>
          {!isLoading &&
            boards?.map((board, index) => {
              const key = `col-${index}`;
              return (
                <Col
                  key={key}
                  xs={{ flex: "100%" }}
                  sm={{ flex: "50%" }}
                  md={{ flex: "40%" }}
                  lg={{ flex: "30%" }}
                  xl={{ flex: "20%" }}
                >
                  <Link href={`/workspace/${workspaceId}/board/${board.id}`}>
                    <Card
                      className="board-item hover:shadow-sm"
                      style={{
                        backgroundImage: `url('${board?.cover}')`,
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        backgroundColor: board?.background || "#fff",
                        height: "120px",
                        margin: "5px",
                      }}
                      bodyStyle={{
                        padding: 0,
                        height: "100%",
                      }}
                    >
                      <div
                        className="fx-v-sb-left"
                        style={{
                          height: "100%",
                          width: "100%",
                          padding: "7px",
                        }}
                      >
                        <Typography.Title level={4} className="title m-0">
                          {board.name}
                        </Typography.Title>
                        <div>
                          {board.visibility === "shared" && <Users size={15} />}
                          {board.visibility === "private" && <Lock size={15} />}
                          {board.visibility === "public" && <Earth size={15} />}
                        </div>
                      </div>
                    </Card>
                  </Link>
                </Col>
              );
            })}
          {isLoading &&
            [1, 2, 3, 4, 5].map((item) => (
              <Col key={item}>
                <Space style={{ margin: "5px" }}>
                  <Skeleton.Input active={isLoading} size={"large"} />
                </Space>
              </Col>
            ))}
        </Row>
      </div>
    </div>
  );
};

export default BoardsPage;
