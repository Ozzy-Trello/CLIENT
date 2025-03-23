import React from 'react';
import { Button, List, Typography } from 'antd';
import { ExportOutlined, EllipsisOutlined, PaperClipOutlined, PlusOutlined } from '@ant-design/icons';
import { Attachment } from '@/app/dto/types';

const Attachments: React.FC<{attachments: Attachment[]}> = ({attachments}) => {

  return (
    <div className="bg-white p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <PaperClipOutlined className="text-gray-500 mr-2" />
          <Typography.Title level={5} className="m-0">Attachments</Typography.Title>
        </div>
        <Button 
          type="default" 
          size="small" 
          icon={<PlusOutlined />}
          className="flex items-center"
        >
          Add
        </Button>
      </div>
     
      <div className="text-xs text-gray-500 font-medium uppercase mb-2">Files</div>
     
      <List
        className="space-y-3"
        dataSource={attachments}
        renderItem={(item) => (
          <List.Item className="flex items-center p-2 hover:bg-gray-50 rounded">
            <div className="flex-shrink-0 mr-3">
              <img 
                src={item.url} 
                alt={"review"} 
                className="w-20 h-15 object-cover rounded"
              />
            </div>
           
            <div className="flex-grow">
              <div className="text-sm font-medium">{item.filename}</div>
              <div className="text-xs text-gray-500 flex items-center">
                {item.addedAt} 
                {item.isCover && (
                  <span className="ml-2 bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded">
                    Cover
                  </span>
                )}
              </div>
            </div>
           
            <div className="flex-shrink-0 flex space-x-1">
              <Button 
                icon={<ExportOutlined />} 
                size="small" 
                className="flex items-center justify-center border-0 shadow-none"
              />
              <Button 
                icon={<EllipsisOutlined />} 
                size="small" 
                className="flex items-center justify-center border-0 shadow-none"
              />
            </div>
          </List.Item>
        )}
      />
     
      {/* <Button 
        type="link" 
        className="text-blue-500 hover:text-blue-600 p-0 mt-2 h-auto flex items-center"
      >
        View all attachments (30 hidden)
      </Button> */}
    </div>
  );
};

export default Attachments;