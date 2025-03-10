'use client';
import { Board } from "@/app/dto/types";
import { Card, Col, Row, Skeleton, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import "./style.css";
import { useAccount } from "@/app/hooks/account";
import { selectSelectedWorkspace, setUser } from "@/app/store/app_slice";
import { useDispatch } from "react-redux";
import dynamic from "next/dynamic";
import { useSelector } from "react-redux";
import { Earth, Lock, Users } from "lucide-react";
// import { BoardService } from "@/app/mock/api";
import Link from "next/link";
import { useAppSelector } from "@/app/store/hook";
import useTaskService from "@/app/hooks/task";

// Move this outside the component
const BoardFilters = dynamic(() => import('./_filter_form'), {
  ssr: false,
  loading: () => <div>Loading filters...</div>
});

// Change this to a regular function declaration
const BoardsPage: React.FC = () => {
  const dispatch = useDispatch();
  const [isFetching, setIsFetching] = useState(true);
  const account = useAccount();
  const { workspaceBoards, currentWorkspaceId } = useTaskService();
  const [boardList, setBoardList] = useState<Board[]>(workspaceBoards);
  const selectedWorksapce = useSelector(selectSelectedWorkspace);
  const [filter, setFilter] = useState({
    sortBy: "",
    filterBy: "",
    searchKeyword: ""
  });

  useEffect(() => {
    setTimeout(() => {
      setIsFetching(false)
    }, 500)
  }, [])

  return (
    <div className="page scrollable-page mt-7">
      <div className="section-workspace">
      </div>
      <Typography.Title level={3} className="m-0">Boards</Typography.Title>
      <BoardFilters />
     
      <div className="section-card">
        <Row gutter={[10, 10]}>
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
                <Link href={`/workspace/${selectedWorksapce?.id}/board/${board.id}`}>
                  <Card
                    className="board-item hover:shadow-sm"
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
                    <div className="fx-v-sb-left" style={{height: '100%', width: '100%', padding: "7px"}}>
                      <Typography.Title level={4} className="title m-0">{board.title}</Typography.Title>
                      <div>
                        {board.visibility === "shared" && (
                          <Users size={15} />
                        )}
                        {board.visibility === "private" && (
                          <Lock size={15} />
                        )}
                        {board.visibility === "public" && (
                          <Earth size={15} />
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
                
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

export default BoardsPage;