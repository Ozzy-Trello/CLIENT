import React from "react";
import { Typography, Button, Row, Col } from "antd";
import { SmileOutlined } from "@ant-design/icons";
import Link from "next/link";
import Image from "next/image";
import underDevImg from "@/app/assets/images/under-dev.svg"

const { Title, Text } = Typography;

interface UnderDevelopment {
  pageTitle: string
}

const UnderDevelopment: React.FC<UnderDevelopment> = ({pageTitle}) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Row justify="center" align="middle" style={{ textAlign: "center" }}>
        <Col>
          {/* <SmileOutlined
            style={{
              fontSize: "100px",
              color: "#1890ff",
              marginBottom: "20px",
            }}
          /> */}
          <Image src={underDevImg} alt="Under Development Page" style={{height: "200px"}} />
          <Title level={2} style={{ color: "#333" }}>
            We're Still Working on <b>{pageTitle}</b> page!
          </Title>
          <Text style={{ color: "#555", fontSize: "16px" }}>
            This page is currently under development. Please check back soon.
          </Text>
          <div style={{ marginTop: "20px" }}>
            <Link href="/" passHref>
              <Button type="primary" size="large">
                Back to Home
              </Button>
            </Link>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default UnderDevelopment;
