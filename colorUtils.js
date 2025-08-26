// Calculate relative luminance for WCAG contrast calculations
const getLuminance = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const sRGB = [r, g, b].map(val => {
    if (val <= 0.03928) {
      return val / 12.92;
    }
    return Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
};

// Calculate contrast ratio between two colors (WCAG formula)
export const calculateContrastRatio = (color1, color2) => {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

// Check if contrast meets WCAG AA standards
export const meetsWCAGAA = (color1, color2, isLargeText = false) => {
  const ratio = calculateContrastRatio(color1, color2);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
};

// Check if contrast meets WCAG AAA standards
export const meetsWCAGAAA = (color1, color2, isLargeText = false) => {
  const ratio = calculateContrastRatio(color1, color2);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
};

export const getContrastColor = (color, colorScheme) => {
  if (!color) return colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  if (luminance > 0.5) {
    return '#000000';
  } else {
    return '#FFFFFF';
  }
};

export const adjustColorForBadge = (color, colorScheme, theme) => {
  if (!color) return theme.background;
  
  if (colorScheme === 'dark') {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    if (luminance > 0.6) {
      const factor = 0.4;
      const newR = Math.floor(r * factor);
      const newG = Math.floor(g * factor);
      const newB = Math.floor(b * factor);
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
  }
  else {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    if (luminance < 0.3) {
      const factor = 2.5;
      const newR = Math.min(255, Math.floor(r * factor));
      const newG = Math.min(255, Math.floor(g * factor));
      const newB = Math.min(255, Math.floor(b * factor));
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
  }
  
  return color;
};