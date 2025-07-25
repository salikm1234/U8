export const themes = {
  light: {
    // Background colors
    background: '#f5f5f5',
    cardBackground: '#FFFFFF',
    modalBackground: '#FFFFFF',
    inputBackground: '#FFFFFF',
    
    // Text colors
    text: '#000000',
    textSecondary: '#666666',
    placeholderText: '#999999',
    
    // Border colors
    border: '#E0E0E0',
    separator: '#E0E0E0',
    
    // Button colors
    primaryButton: '#E0F7FF',
    primaryButtonText: '#00BFFF',
    secondaryButton: '#F0F0F0',
    secondaryButtonText: '#333333',
    
    // Status colors
    success: '#4CAF50',
    error: '#FF5252',
    warning: '#FFC107',
    info: '#2196F3',
    starColor: '#FFD700',
    starOutline: '#8B4513',
    
    // Special UI elements
    shadowColor: '#000000',
    tabBarBackground: '#FFFFFF',
    tabBarActiveTint: '#00BFFF',
    tabBarInactiveTint: '#8E8E8F',
    
    // Suggested goals specific
    suggestedContainer: '#E8F6FF',
    suggestedBorder: '#000000',
    gradientStart: '#00BFFF',
    gradientMiddle: '#00BFFF',
    gradientEnd: '#00BFFF',
    
    // Calendar theme
    calendarBackground: '#FFFFFF',
    calendarTextSectionTitleColor: '#000000',
    calendarSelectedDayBackgroundColor: '#00BFFF',
    calendarSelectedDayTextColor: '#FFFFFF',
    calendarTodayTextColor: '#00BFFF',
    calendarDayTextColor: '#000000',
    calendarTextDisabledColor: '#CCCCCC',
    calendarMonthTextColor: '#000000',
    calendarArrowColor: '#00BFFF',
    
    // DateTimePicker theme
    dateTimePickerTextColor: '#000000',
    dateTimePickerBackgroundColor: '#FFFFFF',
  },
  
  dark: {
    // Background colors - Modern, deep but not harsh
    background: '#0F0F0F',
    cardBackground: '#1A1A1A',
    modalBackground: '#1F1F1F',
    inputBackground: '#252525',
    
    // Text colors - Softer whites and warm grays
    text: '#F5F5F7',
    textSecondary: '#ADADB8',
    placeholderText: '#6D6D73',
    
    // Border colors - Subtle and modern
    border: '#2C2C2E',
    separator: '#2C2C2E',
    
    // Button colors - Modern blue accent with warmth
    primaryButton: '#1D1D1F',
    primaryButtonText: '#00D4FF',
    secondaryButton: '#2C2C2E',
    secondaryButtonText: '#F5F5F7',
    
    // Status colors - Softer, more pleasing variants
    success: '#30D158',
    error: '#FF453A',
    warning: '#FF9F0A',
    info: '#00D4FF',
    starColor: '#FFD700',
    starOutline: '#B8860B',
    
    // Special UI elements
    shadowColor: '#000000',
    tabBarBackground: '#1A1A1A',
    tabBarActiveTint: '#00D4FF',
    tabBarInactiveTint: '#6D6D73',
    
    // Suggested goals specific - Warmer, less harsh
    suggestedContainer: '#1D1D1F',
    suggestedBorder: '#00D4FF',
    gradientStart: '#00D4FF',
    gradientMiddle: '#00D4FF',
    gradientEnd: '#00D4FF',
    
    // Calendar theme - Refined and modern
    calendarBackground: '#1A1A1A',
    calendarTextSectionTitleColor: '#F5F5F7',
    calendarSelectedDayBackgroundColor: '#00D4FF',
    calendarSelectedDayTextColor: '#000000',
    calendarTodayTextColor: '#00D4FF',
    calendarDayTextColor: '#F5F5F7',
    calendarTextDisabledColor: '#6D6D73',
    calendarMonthTextColor: '#F5F5F7',
    calendarArrowColor: '#00D4FF',
    
    // DateTimePicker theme
    dateTimePickerTextColor: '#F5F5F7',
    dateTimePickerBackgroundColor: '#1F1F1F',
  }
};

export const getTheme = (colorScheme) => {
  return themes[colorScheme] || themes.light;
};