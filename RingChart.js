import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from './ThemeContext';

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
  
  // Calculate badge position (middle of the slice, between inner and outer radius)
  const getBadgePosition = (startAngle, endAngle) => {
    const midAngle = (startAngle + endAngle) / 2;
    const midRadius = (innerRadius + outerRadius) / 2;
    const x = size / 2 + midRadius * Math.cos((midAngle * Math.PI) / 180);
    const y = size / 2 + midRadius * Math.sin((midAngle * Math.PI) / 180);
    return { x, y };
  };
  
  let currentAngle = -90; // Start from top
  
  const slices = [];
  data.forEach((item, index) => {
    const sliceAngle = (item.count / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;
    
    const path = createPieSlice(startAngle, endAngle, innerRadius, outerRadius);
    const badgePos = getBadgePosition(startAngle, endAngle);
    
    slices.push({
      item,
      path,
      badgePos,
      startAngle,
      endAngle
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
          {slices.map((slice, index) => (
            <G key={`badge-${slice.item.name}`}>
              {/* Badge text with shadow */}
              <SvgText
                x={slice.badgePos.x + 1}
                y={slice.badgePos.y + 6}
                fontSize="18"
                fontWeight="bold"
                fill={colorScheme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)'}
                textAnchor="middle"
              >
                {slice.item.count}
              </SvgText>
              <SvgText
                x={slice.badgePos.x}
                y={slice.badgePos.y + 5}
                fontSize="18"
                fontWeight="bold"
                fill={colorScheme === 'dark' ? '#ffffff' : '#000000'}
                textAnchor="middle"
                stroke={colorScheme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)'}
                strokeWidth="1"
              >
                {slice.item.count}
              </SvgText>
              {/* Star indicator for habits with shadow */}
              {slice.item.hasHabits && (
                <>
                  <SvgText
                    x={slice.badgePos.x + 16}
                    y={slice.badgePos.y - 9}
                    fontSize="16"
                    fill={colorScheme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)'}
                    textAnchor="middle"
                  >
                    ★
                  </SvgText>
                  <SvgText
                    x={slice.badgePos.x + 15}
                    y={slice.badgePos.y - 10}
                    fontSize="16"
                    fill="#FFD700"
                    textAnchor="middle"
                    stroke={colorScheme === 'dark' ? 'rgba(255,215,0,0.3)' : 'rgba(255,215,0,0.5)'}
                    strokeWidth="0.5"
                  >
                    ★
                  </SvgText>
                </>
              )}
            </G>
          ))}
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
      <View style={[styles.centerText, { top: size / 2 - 20, left: size / 2 - 50 }]}>
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
    fontWeight: '500',
  },
  totalCount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
});

export default RingChart;