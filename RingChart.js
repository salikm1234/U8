import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { getContrastColor } from './colorUtils';

const RingChart = ({ data, onSlicePress, size = 280, innerRadius = 85, outerRadius = 120 }) => {
  const { theme, colorScheme } = useTheme();
  
  if (!data || data.length === 0) {
    return null;
  }

  // Calculate total for proportions
  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  // Create pie slices
  const createPieSlice = (startAngle, endAngle, innerR, outerR) => {
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    const x1 = size / 2 + innerR * Math.cos((startAngle * Math.PI) / 180);
    const y1 = size / 2 + innerR * Math.sin((startAngle * Math.PI) / 180);
    
    const x2 = size / 2 + outerR * Math.cos((startAngle * Math.PI) / 180);
    const y2 = size / 2 + outerR * Math.sin((startAngle * Math.PI) / 180);
    
    const x3 = size / 2 + outerR * Math.cos((endAngle * Math.PI) / 180);
    const y3 = size / 2 + outerR * Math.sin((endAngle * Math.PI) / 180);
    
    const x4 = size / 2 + innerR * Math.cos((endAngle * Math.PI) / 180);
    const y4 = size / 2 + innerR * Math.sin((endAngle * Math.PI) / 180);
    
    return `
      M ${x1} ${y1}
      L ${x2} ${y2}
      A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x3} ${y3}
      L ${x4} ${y4}
      A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x1} ${y1}
      Z
    `;
  };
  
  // Calculate badge position with constraints
  const getBadgePosition = (startAngle, endAngle, forStar = false) => {
    const sliceAngle = endAngle - startAngle;
    const midAngle = (startAngle + endAngle) / 2;
    
    // For small slices, adjust the radius to keep elements inside
    let effectiveRadius = (innerRadius + outerRadius) / 2;
    
    if (forStar && sliceAngle < 30) {
      // For small slices, position star closer to center to stay within bounds
      effectiveRadius = (innerRadius + outerRadius) / 2 - 8;
    }
    
    const x = size / 2 + effectiveRadius * Math.cos((midAngle * Math.PI) / 180);
    const y = size / 2 + effectiveRadius * Math.sin((midAngle * Math.PI) / 180);
    return { x, y };
  };
  
  // Determine if star should be shown based on slice size
  const shouldShowStar = (sliceAngle) => sliceAngle >= 15;
  
  let currentAngle = -90; // Start from top
  
  const slices = [];
  data.forEach((item, index) => {
    const sliceAngle = (item.count / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;
    
    const path = createPieSlice(startAngle, endAngle, innerRadius, outerRadius);
    const badgePos = getBadgePosition(startAngle, endAngle);
    const starPos = getBadgePosition(startAngle, endAngle, true);
    
    slices.push({
      item,
      path,
      badgePos,
      starPos,
      startAngle,
      endAngle,
      sliceAngle
    });
  });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G>
          {slices.map((slice, index) => (
            <G key={slice.item.name}>
              <Path
                d={slice.path}
                fill={slice.item.color}
                stroke={colorScheme === 'dark' ? theme.border : '#fff'}
                strokeWidth={2}
              />
            </G>
          ))}
          {/* Render badges on top */}
          {slices.map((slice, index) => {
            const textColor = getContrastColor(slice.item.color, colorScheme);
            const fontSize = slice.sliceAngle < 20 ? "14" : "18";
            const starSize = slice.sliceAngle < 30 ? "14" : "16";
            const showStar = slice.item.hasHabits && shouldShowStar(slice.sliceAngle);
            
            // Calculate star position within slice boundaries
            let starX, starY;
            const midAngle = (slice.startAngle + slice.endAngle) / 2;
            
            if (slice.sliceAngle < 20) {
              // Very narrow slice: position star closer to inner edge
              const starRadius = innerRadius + (outerRadius - innerRadius) * 0.3;
              const starAngle = midAngle;
              starX = size / 2 + starRadius * Math.cos(starAngle * Math.PI / 180);
              starY = size / 2 + starRadius * Math.sin(starAngle * Math.PI / 180);
            } else if (slice.sliceAngle < 40) {
              // Medium slice: position star at outer part of slice
              const starRadius = innerRadius + (outerRadius - innerRadius) * 0.75;
              const starAngle = midAngle;
              starX = size / 2 + starRadius * Math.cos(starAngle * Math.PI / 180);
              starY = size / 2 + starRadius * Math.sin(starAngle * Math.PI / 180);
            } else {
              // Large slice: position star with angular offset
              const starRadius = (innerRadius + outerRadius) / 2;
              // Offset by 20% of the slice angle, but max 15 degrees
              const angleOffset = Math.min(slice.sliceAngle * 0.2, 15);
              // Position clockwise from center for better visual balance
              const starAngle = midAngle + angleOffset;
              starX = size / 2 + starRadius * Math.cos(starAngle * Math.PI / 180);
              starY = size / 2 + starRadius * Math.sin(starAngle * Math.PI / 180);
            }
            
            return (
              <G key={`badge-${slice.item.name}`}>
                {/* Badge text without shadow */}
                <SvgText
                  x={slice.badgePos.x}
                  y={slice.badgePos.y + 5}
                  fontSize={fontSize}
                  fontWeight="700"
                  fill={textColor}
                  textAnchor="middle"
                >
                  {slice.item.count}
                </SvgText>
                {/* Star indicator for habits */}
                {showStar && (
                  <SvgText
                    x={starX}
                    y={starY}
                    fontSize={starSize}
                    fill="#FFD700"
                    textAnchor="middle"
                  >
                    ★
                  </SvgText>
                )}
              </G>
            );
          })}
        </G>
      </Svg>
      
      {/* Invisible touch areas */}
      {slices.map((slice, index) => {
        const touchPos = getBadgePosition(slice.startAngle, slice.endAngle);
        return (
          <TouchableOpacity
            key={`touch-${slice.item.name}`}
            style={{
              position: 'absolute',
              left: touchPos.x - 40,
              top: touchPos.y - 40,
              width: 80,
              height: 80,
              backgroundColor: 'transparent',
            }}
            onPress={() => onSlicePress(slice.item)}
          />
        );
      })}
      
      {/* Center text */}
      <View style={[styles.centerText, { top: size / 2 - 30, left: size / 2 - 50 }]}>
        <Text style={[styles.totalText, { color: theme.text }]}>Total</Text>
        <Text style={[styles.totalCount, { color: theme.text }]}>{total}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    position: 'absolute',
    width: 100,
    alignItems: 'center',
  },
  totalText: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalCount: {
    fontSize: 28,
    fontWeight: '700',
  },
});

export default RingChart;