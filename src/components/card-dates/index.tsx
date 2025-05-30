import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

// Extend dayjs with plugins
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

export interface DateFormatResult {
  text: string;
  status: 'upcoming' | 'due-soon' | 'overdue' | 'completed' | null;
  hasTime: boolean;
}

export interface CardDateFormatOptions {
  showYear?: boolean;
  dueSoonThreshold?: number; // hours before due date to consider "due soon"
  isCompleted?: boolean;
}

/**
 * Format card start and due dates for display
 * @param startDate - Card start date (optional)
 * @param dueDate - Card due date (optional)
 * @param options - Formatting options
 * @returns Formatted date string with status
 */
export function formatCardDates(
  startDate?: Date | null,
  dueDate?: Date | null,
  options: CardDateFormatOptions = {}
): DateFormatResult | null {
  const {
    showYear = false,
    dueSoonThreshold = 24, // 24 hours
    isCompleted = false
  } = options;

  // If no dates provided, return null
  if (!startDate && !dueDate) {
    return null;
  }

  const now = dayjs();
  const start = startDate ? dayjs(startDate) : null;
  const due = dueDate ? dayjs(dueDate) : null;

  // Check if due date has time (not just midnight)
  const hasTime = due ? !(due.hour() === 0 && due.minute() === 0 && due.second() === 0) : false;

  // Determine status based on due date
  let status: DateFormatResult['status'] = null;
  if (due) {
    if (isCompleted) {
      status = 'completed';
    } else if (due.isBefore(now)) {
      status = 'overdue';
    } else if (due.isBefore(now.add(dueSoonThreshold, 'hour'))) {
      status = 'due-soon';
    } else {
      status = 'upcoming';
    }
  }

  // Format the date string
  let text = '';

  if (start && due) {
    // Both start and due dates
    if (start.isSame(due, 'day')) {
      // Same day
      if (hasTime) {
        text = `${start.format('MMM D')}${showYear ? start.format(', YYYY') : ''}, ${due.format('h:mm A')}`;
      } else {
        text = `${start.format('MMM D')}${showYear ? start.format(', YYYY') : ''}`;
      }
    } else {
      // Different days
      const startFormat = showYear ? 'MMM D, YYYY' : 'MMM D';
      const endFormat = showYear ? 'MMM D, YYYY' : 'MMM D';
      
      if (hasTime) {
        text = `${start.format(startFormat)} - ${due.format(endFormat)}, ${due.format('h:mm A')}`;
      } else {
        text = `${start.format(startFormat)} - ${due.format(endFormat)}`;
      }
    }
  } else if (due) {
    // Only due date
    const dateFormat = showYear ? 'MMM D, YYYY' : 'MMM D';
    if (hasTime) {
      text = `${due.format(dateFormat)}, ${due.format('h:mm A')}`;
    } else {
      text = due.format(dateFormat);
    }
  } else if (start) {
    // Only start date
    const dateFormat = showYear ? 'MMM D, YYYY' : 'MMM D';
    text = `Started ${start.format(dateFormat)}`;
  }

  return {
    text,
    status,
    hasTime
  };
}

/**
 * Get the status badge text for due dates
 * @param status - Date status
 * @returns Badge text or null
 */
export function getDateStatusBadge(status: DateFormatResult['status']): string | null {
  switch (status) {
    case 'overdue':
      return 'Overdue';
    case 'due-soon':
      return 'Due soon';
    case 'completed':
      return 'Complete';
    case 'upcoming':
    default:
      return null;
  }
}

/**
 * Get CSS classes for date status styling
 * @param status - Date status
 * @returns CSS class names
 */
export function getDateStatusClasses(status: DateFormatResult['status']): string {
  switch (status) {
    case 'overdue':
      return 'text-red-600 bg-red-100';
    case 'due-soon':
      return 'text-orange-600 bg-orange-100';
    case 'completed':
      return 'text-green-600 bg-green-100';
    case 'upcoming':
      return 'text-blue-600 bg-blue-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

/**
 * Format card dates specifically for the card component display
 * @param card - Card object
 * @param options - Formatting options
 * @returns Formatted result or null
 */
export function formatCardDisplayDates(
  card: { startDate?: Date; dueDate?: Date; isArchived?: boolean },
  options: CardDateFormatOptions = {}
): DateFormatResult | null {
  return formatCardDates(
    card.startDate,
    card.dueDate,
    {
      ...options,
      isCompleted: card.isArchived || false
    }
  );
}

// Example usage function
export function CardDateDisplay({ card }: { card: { startDate?: Date; dueDate?: Date; isArchived?: boolean } }) {
  const dateResult = formatCardDisplayDates(card);
  
  if (!dateResult) return null;

  const badge = getDateStatusBadge(dateResult.status);
  const statusClasses = getDateStatusClasses(dateResult.status);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-700">{dateResult.text}</span>
      {badge && (
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusClasses}`}>
          {badge}
        </span>
      )}
    </div>
  );
}