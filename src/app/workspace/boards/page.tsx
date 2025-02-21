'use client';

import { Board } from "@/app/dto/types";
import { boards } from "@/dummy-data";
import { Card, Col, Row, Skeleton, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import "./style.css";
import { useAccount } from "@/app/hooks/account";
import { setUser } from "@/app/store/slice";
import { useDispatch } from "react-redux";
import dynamic from "next/dynamic";

const BoardFilters = dynamic(() => import('./_filter_form'), {
  loading: () => <div>Loading filters...</div>
});

const Boards: React.FC = () => {
  const dispatch = useDispatch();
  const [isFetching, setIsFetching] = useState(true);
  const account = useAccount();
  const [boardList, setBoardList] = useState<Board[]>([]);
  const [filter, setFilter] = useState({
    sortBy: "",
    filterBy: "",
    searchKeyword: ""
  });

  useEffect(() => {
    const getAccount = async() => {
      const result = await account.mutateAsync();
      if (result) {
        dispatch(setUser(result.data));
      }
    }
    getAccount();
  }, [])

  useEffect(() => {
    const fetchBoards = () => {
      setBoardList(boards);
    }

    if (isFetching) {
      setTimeout(() => {
        fetchBoards();
        setIsFetching(false);
      }, 1000)
    }
  }, [isFetching])


  return (
    <div className="page scrollable-page">
      <div className="section-workspace">

      </div>
      <Typography.Title level={3} className="m-0">Boards</Typography.Title>
      <BoardFilters />
      
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