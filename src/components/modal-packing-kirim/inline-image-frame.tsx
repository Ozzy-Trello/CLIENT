"use client";

import React, { useState } from "react";
import { Alert, Spin, Typography } from "antd";

interface InlineImageFrameProps {
  url: string;
}

const InlineImageFrame: React.FC<InlineImageFrameProps> = ({ url }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (error) {
    return <Alert type="error" showIcon message="Failed to load image preview" />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <Typography.Text strong>Preview PO</Typography.Text>
        <Typography.Text type="secondary" className="text-xs">
          Image preview
        </Typography.Text>
      </div>
      <div className="relative flex max-h-[420px] min-h-[260px] items-center justify-center bg-slate-50 p-3">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
            <Spin />
          </div>
        )}
        <img
          src={url}
          alt="PO preview"
          className="max-h-[380px] max-w-full rounded-lg object-contain"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      </div>
    </div>
  );
};

export default InlineImageFrame;
