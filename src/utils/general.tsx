import { v4 as uuidv4 } from 'uuid';

export const getGradientString = (gradientArray: { color: string; percent: number; }[]) => {
  if (!gradientArray || !Array.isArray(gradientArray) || gradientArray.length < 2) {
    return 'linear-gradient(to right, rgb(16, 142, 233), rgb(135, 208, 104))';
  }
  
  const sortedGradient = [...gradientArray].sort((a, b) => a.percent - b.percent);
  const colorStops = sortedGradient.map(stop => 
    `${stop.color} ${stop.percent}%`
  ).join(', ');
  
  return `linear-gradient(to right, ${colorStops})`;
};


// Function to determine if text should be light or dark based on background
export const getContrastingTextColor = (backgroundColor: string): string => {
  console.log("backgroundColor: %o", backgroundColor);
  if (typeof backgroundColor !== "string") return '51, 51, 51';
  // Convert hex to RGB
  const rgbArr = backgroundColor.split(',');
  const r = parseInt(rgbArr[0]);
  const g = parseInt(rgbArr[1]);
  const b = parseInt(rgbArr[2]);
  
  // Calculate brightness using the formula: (0.299*R + 0.587*G + 0.114*B)
  // This weighs RGB based on human perception
  const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
  
  // Return white for dark backgrounds, black for light backgrounds
  // 128 is the middle threshold on a 0-255 scale
  return brightness < 128 ? '255, 255, 255' : '51, 51, 51';
}


// Generate unique IDs
export const generateId = (): string => {
  return uuidv4();
};

// Format date to ISO string
export const formatDate = (): string => {
  return new Date().toISOString();
};

// Calculate position for new items (add to end)
export const calculatePosition = (items: { position: number }[]): number => {
  if (items.length === 0) return 1;
  const maxPosition = Math.max(...items.map(item => item.position));
  return maxPosition + 1;
};

// Reorder items and update positions
export const reorderItems = <T extends { position: number }>(
  items: T[],
  startIndex: number,
  endIndex: number
): T[] => {
  const result = Array.from(items);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  
  // Update positions to reflect new order
  return result.map((item, index) => ({
    ...item,
    position: index + 1
  }));
};

// Calculate human-readable time durations
export const calculateTimeInList = (createdAt: string): string => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - created.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''}`;
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''}`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''}`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} day${diffInDays !== 1 ? 's' : ''}`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''}`;
};

// Generate random color
export const getRandomColor = (): string => {
  const colors = [
    '#FF5252', '#FF4081', '#E040FB', '#7C4DFF',
    '#536DFE', '#448AFF', '#40C4FF', '#18FFFF',
    '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41',
    '#FFFF00', '#FFD740', '#FFAB40', '#FF6E40'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Create a gradient background
export const createGradientBackground = (): { color: string; percent: number }[] => {
  return [
    { color: getRandomColor(), percent: 0 },
    { color: getRandomColor(), percent: 100 }
  ];
};

export function extractPlaceholders(pattern: string): string[] {
  const regex = /<([^>]+)>/g;
  const placeholders: string[] = [];
  
  let match;
  while ((match = regex.exec(pattern)) !== null) {
    placeholders.push(match[1]);
  }
  
  return placeholders;
}

export function isSpecialKey(key: string): boolean {
  // Add all properties that have specific types in the interfaces
  return ['filter'].includes(key);
}