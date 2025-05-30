import React, { useState, useEffect } from 'react';
import { TimePicker, Select, Button, Checkbox, Modal, Input } from 'antd';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

interface DateSetterProps {
  onSave: (startDate: Date | null, dueDate: Date | null, reminder: string | null) => void;
  initialStartDate?: Date | null;
  initialDueDate?: Date | null;
  initialReminder?: string | null;
}

const DateSetter: React.FC<DateSetterProps> = ({
  onSave,
  initialStartDate = null,
  initialDueDate = null,
  initialReminder = '1 day before'
}) => {
  // State for selected dates
  const [startDate, setStartDate] = useState<Dayjs | null>(initialStartDate ? dayjs(initialStartDate) : null);
  const [dueDate, setDueDate] = useState<Dayjs | null>(initialDueDate ? dayjs(initialDueDate) : null);
  const [dueTime, setDueTime] = useState<Dayjs | null>(initialDueDate ? dayjs(initialDueDate) : dayjs());
  const [reminder, setReminder] = useState<string | null>(initialReminder);
  const [showDueDate, setShowDueDate] = useState<boolean>(!!initialDueDate);
  
  // Calendar navigation state
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());
  
  // Reset component state when the modal becomes visible
  useEffect(() => {
    setStartDate(initialStartDate ? dayjs(initialStartDate) : null);
    setDueDate(initialDueDate ? dayjs(initialDueDate) : null);
    setDueTime(initialDueDate ? dayjs(initialDueDate) : dayjs());
    setReminder(initialReminder);
    setShowDueDate(!!initialDueDate);
    setCurrentMonth(initialDueDate ? dayjs(initialDueDate) : dayjs());
  }, [initialStartDate, initialDueDate, initialReminder]);

  // Calendar generation functions
  const getDaysInMonth = (date: Dayjs) => {
    const daysInMonth = date.daysInMonth();
    const days: Dayjs[] = [];
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(date.date(i));
    }
    
    return days;
  };
  
  const getCalendarDays = () => {
    const firstDayOfMonth = currentMonth.startOf('month');
    const daysInMonth = getDaysInMonth(currentMonth);
    
    // Get the day of week of the first day (0 = Sunday, 1 = Monday, etc.)
    const startingDayOfWeek = firstDayOfMonth.day();
    
    // Calculate previous month's days to display
    const prevMonthDays: Dayjs[] = [];
    if (startingDayOfWeek > 0) {
      const prevMonth = currentMonth.subtract(1, 'month');
      const daysInPrevMonth = prevMonth.daysInMonth();
      
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        prevMonthDays.unshift(prevMonth.date(daysInPrevMonth - i));
      }
    }
    
    // Calculate next month's days to display
    const totalDaysDisplayed = 42; // 6 rows of 7 days
    const nextMonthDays: Dayjs[] = [];
    const remainingDays = totalDaysDisplayed - (prevMonthDays.length + daysInMonth.length);
    
    if (remainingDays > 0) {
      const nextMonth = currentMonth.add(1, 'month');
      
      for (let i = 1; i <= remainingDays; i++) {
        nextMonthDays.push(nextMonth.date(i));
      }
    }
    
    return [...prevMonthDays, ...daysInMonth, ...nextMonthDays];
  };

  // Calendar navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonth(currentMonth.subtract(1, 'month'));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(currentMonth.add(1, 'month'));
  };
  
  // Date selection handler
  const handleSelectDate = (date: Dayjs) => {
    if (showDueDate) {
      setDueDate(date);
    } else {
      setStartDate(date);
    }
  };
  
  // Format date as M/D/YYYY for input display
  const formatDate = (date: Dayjs | null) => {
    if (!date) return '';
    return date.format('M/D/YYYY');
  };
  
  // Save and remove handlers
  const handleSave = () => {
    let finalDueDate = null;
    
    if (dueDate && dueTime) {
      finalDueDate = dueDate
        .hour(dueTime.hour())
        .minute(dueTime.minute())
        .second(0)
        .toDate();
    }
    
    onSave(startDate?.toDate() || null, finalDueDate, reminder);
  };
  
  const handleRemove = () => {
    setStartDate(null);
    setDueDate(null);
    setDueTime(null);
    setReminder(null);
    onSave(null, null, null);
  };
  
  // Helper to check if a date is the current date
  const isToday = (date: Dayjs) => {
    return date.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
  };
  
  // Helper to check if a date is selected
  const isSelected = (date: Dayjs) => {
    return dueDate && date.format('YYYY-MM-DD') === dueDate.format('YYYY-MM-DD');
  };
  
  // Helper to check if a date is in the current month
  const isCurrentMonth = (date: Dayjs) => {
    return date.month() === currentMonth.month();
  };
  
  // Render calendar
  const calendarDays = getCalendarDays();
  
  // Group days into weeks for display
  const weeks: Dayjs[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div>
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-4">
        <button 
          className="p-1 rounded hover:bg-gray-100 flex items-center justify-center"
          onClick={handlePrevMonth}
          type="button"
        >
          <ChevronLeft size={16} className="text-gray-600" />
        </button>
        <h2 className="text-base font-medium">{currentMonth.format('MMMM YYYY')}</h2>
        <button 
          className="p-1 rounded hover:bg-gray-100 flex items-center justify-center"
          onClick={handleNextMonth}
          type="button"
        >
          <ChevronRight size={16} className="text-gray-600" />
        </button>
      </div>

      {/* Calendar Weekdays */}
      <div className="grid grid-cols-7 text-center mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-sm text-gray-500 font-medium py-1">{day}</div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="mb-4">
        {weeks.map((week, weekIndex) => (
          <div key={`week-${weekIndex}`} className="grid grid-cols-7">
            {week.map((day, dayIndex) => (
              <button
                key={`day-${weekIndex}-${dayIndex}`}
                type="button"
                onClick={() => handleSelectDate(day)}
                className={`
                  h-8 w-full flex items-center justify-center text-sm rounded-sm
                  ${!isCurrentMonth(day) ? 'text-gray-300' : 'text-gray-700'}
                  ${isToday(day) && !isSelected(day) ? 'text-blue-600 font-medium' : ''}
                  ${isSelected(day) ? 'bg-blue-100 text-blue-600 font-medium' : 'hover:bg-gray-100'}
                `}
              >
                {day.date()}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Start Date Section */}
      <div className="mb-4">
        <label className="block text-gray-700 font-medium text-sm mb-1">Start date</label>
        <div className="relative">
          <Input
            type="text"
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="M/D/YYYY"
            value={formatDate(startDate)}
            readOnly
            size={"small"}
            onClick={() => setShowDueDate(false)}
          />
        </div>
      </div>

      {/* Due Date Section */}
      <div className="mb-4">
        <div className="flex items-center mb-1 gap-2">
          <label className="block text-gray-700 font-medium text-sm">Due date</label>
          <Checkbox 
            className="ml-2"
            checked={showDueDate}
            onChange={(e) => setShowDueDate(e.target.checked)}
          />
        </div>
        
        {showDueDate && (
          <div className="flex space-x-2">
            <div className="w-1/2">
              <Input
                type="text"
                className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="M/D/YYYY"
                value={formatDate(dueDate)}
                readOnly
                size="small"
                onClick={() => setShowDueDate(true)}
              />
            </div>
            <TimePicker
              className="w-1/2"
              use12Hours
              format="h:mm A"
              value={dueTime}
              onChange={setDueTime}
              size='small'
            />
          </div>
        )}
      </div>

      {/* Reminder Section */}
      {showDueDate && (
        <div className="mb-6">
          <label className="block text-gray-700 font-medium text-sm mb-1">Set due date reminder</label>
          <Select
            className="w-full"
            value={reminder}
            size='small'
            onChange={setReminder}
            options={[
              { value: '1 day before', label: '1 Day before' },
              { value: '2 days before', label: '2 Days before' },
              { value: 'same day', label: 'Same day' },
              { value: '1 hour before', label: '1 Hour before' },
              { value: '30 minutes before', label: '30 Minutes before' },
              { value: '15 minutes before', label: '15 Minutes before' },
            ]}
          />
          <div className="mt-2 text-gray-500 text-xs">
            Reminders will be sent to all members and watchers of this card.
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col space-y-2">
        <Button
          type="primary"
          block
          onClick={handleSave}
          className="h-10"
        >
          Save
        </Button>
        <Button
          block
          onClick={handleRemove}
          className="h-10"
        >
          Remove
        </Button>
      </div>
    </div>
  );
};

export default DateSetter;