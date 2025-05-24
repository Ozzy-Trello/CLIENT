import React from 'react';
import { Table, Skeleton } from 'antd';

interface DataType {
  key: React.Key;
  name: string;
  age: number;
  address: string;
}

export const SkeletonTable: React.FC = () => {
  const columns = [
    {
      title: '',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: '',
      dataIndex: 'address',
      key: 'address',
    },
  ];

  // Create empty data for the skeleton
  const data = Array.from({ length: 5 }).map((_, index) => ({
    key: index,
    name: <Skeleton.Input style={{ width: 100 }} active />,
    age: <Skeleton.Input style={{ width: 50 }} active />,
    address: <Skeleton.Input style={{ width: 150 }} active />,
  }));

  return (
    <Table
      columns={columns}
      dataSource={data}
      pagination={false}
      bordered
      rowKey="key"
    />
  );
};
