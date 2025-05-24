"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import underDevImg from "@/app/assets/images/under-dev.svg"
import { Button, Col, Row, Typography } from "antd";

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
          <Image src={underDevImg} alt="Under Development Page" style={{height: "200px"}} />
          <Typography.Title level={2} style={{ color: "#333" }}>
            We're Still Working on <b>{pageTitle}</b> page!
          </Typography.Title>
          <Typography.Text style={{ color: "#555", fontSize: "16px" }}>
            This page is currently under development. Please check back soon.
          </Typography.Text>
          <div style={{ marginTop: "20px" }}>
            <Link href="/workspace/boards" passHref>
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
