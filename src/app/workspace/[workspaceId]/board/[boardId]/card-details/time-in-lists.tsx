import React, { use, useEffect } from 'react';
import { Progress, Typography } from 'antd';
import { Card } from '@myTypes/card';
import { useCardTimeInList } from '@hooks/card-time-in-lists';
import { ListRestart } from 'lucide-react';

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
    <div>
      <div className='ml-8'>
        {timeInLists.map((item, index) => (
          <div key={index} className="mb-2 w-full">
            <div  className="flex items-center justify-between">
              <span className="text-2xl text-gray-950" >
                {item.listName}
              </span>
              <span className="text-[10px] text-gray-500" >
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