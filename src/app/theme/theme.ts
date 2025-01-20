// theme.ts

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string; // New accent color for highlights
    muted: string;  // Muted color for less emphasis
  };
  fontSize: {
    small: string;
    medium: string;
    large: string;
    extraLarge: string; // Added for headings or important text
  };
  spacing: {
    extraSmall: string; // Added for tighter spacing needs
    small: string;
    medium: string;
    large: string;
    extraLarge: string; // Added for larger gaps
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
  };
  shadows: {
    card: string;
    button: string;
    dropdown: string;
  };
}

export const theme: Theme = {
  colors: {
    primary: '#08124c', // Main brand color
    secondary: '#ffcc00', // Bright secondary color to complement the primary
    background: '#ffffff', // Clean white background
    text: '#333333', // Dark text for readability
    accent: '#ff6f61', // Accent color for highlights and actions
    muted: '#d9d9d9', // Muted color for borders or subtle text
  },
  fontSize: {
    small: '12px',
    medium: '16px',
    large: '20px',
    extraLarge: '28px',
  },
  spacing: {
    extraSmall: '4px',
    small: '8px',
    medium: '16px',
    large: '24px',
    extraLarge: '40px',
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px',
  },
  shadows: {
    card: '0 2px 8px rgba(0, 0, 0, 0.1)', // Light shadow for cards
    button: '0 4px 12px rgba(0, 0, 0, 0.15)', // Slightly stronger shadow for buttons
    dropdown: '0 6px 16px rgba(0, 0, 0, 0.2)', // Deeper shadow for dropdowns or modals
  },
};
