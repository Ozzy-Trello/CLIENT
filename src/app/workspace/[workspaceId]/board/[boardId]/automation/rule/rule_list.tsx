import { Button, Table } from 'antd';
import Link from 'next/link';
import { PlusOutlined } from '@ant-design/icons';
import { 
  formatTriggerDescription, 
  formatActionDescription, 
  Rule
} from '@/app/dto/rules';
import { useEffect, useState } from 'react';

const RuleListPage = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  
  useEffect(() => {
    // This is just for demonstration
    const exampleRules: Rule[] = [
      {
        id: 'rule-1',
        triggers: [
          {
            id: 'trigger-1',
            templateId: 'card-moved-out-of-board',
            values: {
              memberId: 'user-1',
              cardFilter: ''
            }
          }
        ],
        actions: [
          {
            id: 'action-1',
            templateId: 'move-card-to-list',
            values: {
              listId: 'list-1'
            }
          }
        ],
        isActive: true
      },
      {
        id: 'rule-2',
        triggers: [
          {
            id: 'trigger-2',
            templateId: 'due-date-set',
            values: {
              memberId: 'user-2',
              cardFilter: ''
            }
          }
        ],
        actions: [
          {
            id: 'action-2',
            templateId: 'archive-card',
            values: {}
          }
        ],
        isActive: false
      }
    ];
    
    setRules(exampleRules);
  }, []);

  const columns = [
    {
      title: 'Trigger',
      dataIndex: 'triggers',
      key: 'triggers',
      render: (triggers: any[]) => triggers.map(trigger => 
        <div key={trigger.id}>{formatTriggerDescription(trigger)}</div>
      )
    },
    {
      title: 'Action',
      dataIndex: 'actions',
      key: 'actions',
      render: (actions: any[]) => actions.map(action => 
        <div key={action.id}>{formatActionDescription(action)}</div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => isActive ? 'Active' : 'Inactive'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text: string, record: Rule) => (
        <Link href={`/automation/rules/${record.id}`}>
          Edit
        </Link>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-semibold">Automation Rules</h1>
      </div>
      
      <Table
        dataSource={rules}
        columns={columns}
        rowKey="id"
      />
    </div>
  );
};

export default RuleListPage;