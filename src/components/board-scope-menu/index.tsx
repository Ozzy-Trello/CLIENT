import React from 'react';
import { Drawer, Button } from 'antd';
import { InfoCircleOutlined, UnorderedListOutlined, InboxOutlined, 
         SettingOutlined, PictureOutlined, FormOutlined, ThunderboltOutlined, 
         TagOutlined, SmileOutlined, CopyOutlined } from '@ant-design/icons';
import { Bot, Trello } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

interface BoardMenuSidebarProps {
  visible: boolean;
  setIsVisible: any;
}

interface MenuItemProps {
  icon: React.ReactNode;
  text: string;
  badge?: number | null;
  onClick?: () => void;
  divider?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, text, badge, onClick, divider = false }) => (
  <>
    <div 
      className="flex items-center py-3 px-4 hover:bg-gray-100 cursor-pointer"
      onClick={onClick}
    >
      <div className="text-gray-700 mr-4">{icon}</div>
      <span className="text-gray-800 flex-grow">{text}</span>
      {badge && (
        <div className="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">
          {badge}
        </div>
      )}
    </div>
    {divider && <div className="h-px w-full bg-gray-200 my-2"></div>}
  </>
);

const BoardScopeMenu: React.FC<BoardMenuSidebarProps> = ({ 
  visible, 
  setIsVisible,
}) => {
  
  const { workspaceId, boardId } = useParams();
  const router = useRouter();

  const onClose = () => {
    setIsVisible(false);
  }

  return (
    <Drawer
      title="Menu"
      placement="right"
      closable={true}
      onClose={(onClose)}
      open={visible}
      width={300}
      className="board-menu-sidebar"
      closeIcon={<span className="text-xl">&times;</span>}
    >
      <div className="flex flex-col">
        <MenuItem 
          icon={<InfoCircleOutlined size={16} />} 
          text="About this board"
        />
        <div className="text-gray-500 text-xs px-12 -mt-2 mb-3">
          Add a description to your board
        </div>
        
        <MenuItem 
          icon={<UnorderedListOutlined size={16} />} 
          text="Activity" 
        />
        
        <MenuItem 
          icon={<InboxOutlined size={16} />} 
          text="Archived items" 
          divider={true}
        />
        
        <MenuItem 
          icon={<SettingOutlined size={16} />} 
          text="Settings" 
        />
        
        <MenuItem 
          icon={<PictureOutlined size={16} />} 
          text="Change background" 
        />
        
        <MenuItem 
          icon={<FormOutlined size={16} />} 
          text="Custom Fields" 
        />
        
        <MenuItem 
          icon={<Bot size={16} />} 
          text="Automation"
          onClick={() => {
            router.push(`/workspace/${workspaceId}/board/${boardId}/automation`)
          }}
        />
        
        <MenuItem 
          icon={<TagOutlined size={16} />} 
          text="Labels" 
        />
        
        <MenuItem 
          icon={<SmileOutlined size={16} />} 
          text="Stickers" 
        />
        
        <MenuItem 
          icon={<Trello size={16} />} 
          text="Make template" 
        />
      </div>
    </Drawer>
  );
};

export default BoardScopeMenu;