import React, { use, useEffect } from 'react';
import { Progress, Typography } from 'antd';
import { Card } from '@/app/types/card';
import { useCardTimeInList } from '@/app/hooks/card-time-in-lists';
import { ListRestart, PaperclipIcon } from 'lucide-react';
import { set } from 'lodash';

const { Text } = Typography;

interface CardTimeInListProps {
  card: Card | null;
  setCard: React.Dispatch<React.SetStateAction<Card | null>>;
}

const CardTimeInList: React.FC<CardTimeInListProps> = (props) => {
  const { card, setCard } = props;
  const { timeInLists } = useCardTimeInList(card?.id ?? '');
  const [maxSeconds, setMaxSeconds] = React.useState(0);

  useEffect(() => {
    if (timeInLists.length > 0) {
      const max = Math.max(...timeInLists.map(item => item.totalSeconds));
      setMaxSeconds(max);
    }

    setCard(prevCard => {
      if (prevCard) {
        return {
          ...prevCard,
          timeInLists: timeInLists,
        };
      }
      return prevCard;
    });
    
  }, [timeInLists]);

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-2">
        <ListRestart size={18} />
        <h1 className="text-lg font-bold mb-0">Card Time by List</h1>
      </div>

      <div className='ml-8'>
        {timeInLists.map((item, index) => (
          <div key={index} className="mb-2 w-full">
            <div key={index} className="flex items-center justify-between">
              <span className="text-2xl text-gray-950" key={index}>
                {item.listName}
              </span>
              <span className="text-[10px] text-gray-500" key={index}>
                {item.formattedTimeInList} 
              </span>
            </div>
            <Progress percent={maxSeconds !== 0 ? Math.round((item.totalSeconds / maxSeconds) * 100) : 0 } showInfo={false} />
          </div>
        ))}
      </div>
    </div>
    
  );
};

export default CardTimeInList;