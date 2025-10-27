// Theme colors based on IMAPOS design
export const COLORS = {
  // Primary Brown - Coffee theme
  primary: {
    main: '#9B7653',
    light: '#A0826D',
    dark: '#7A5E3A',
    hover: '#8B6F47',
  },
  
  // Accent Orange/Yellow
  accent: {
    main: '#F97316',
    light: '#FB923C',
    dark: '#EA580C',
    hover: '#F59E0B',
  },
  
  // Success Green
  success: {
    main: '#10B981',
    light: '#34D399',
    dark: '#059669',
    hover: '#047857',
  },
  
  // Dark/Info
  dark: {
    main: '#374151',
    light: '#4B5563',
    dark: '#1F2937',
    darker: '#111827',
  },
  
  // Cream/Warm backgrounds
  cream: {
    light: '#FFFBF5',
    main: '#FEF7ED',
    medium: '#FAF5EF',
    dark: '#F5EFE7',
  },
  
  // Error/Danger Red
  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
    hover: '#B91C1C',
  },
};

// Legacy color mappings (for gradual migration)
export const LEGACY_COLORS = {
  blue600: COLORS.dark.main,
  blue700: COLORS.dark.dark,
  indigo600: COLORS.primary.main,
  indigo700: COLORS.primary.dark,
  emerald600: COLORS.success.dark,
  emerald700: COLORS.success.hover,
  amber600: COLORS.accent.hover,
  amber700: COLORS.accent.dark,
};
