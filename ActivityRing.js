import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ActivityRing = ({ 
  radius = 50, 
  strokeWidth = 12,
  progress = 0,
  color = '#007AFF',
  backgroundColor = 'rgba(0, 0, 0, 0.1)',
  animationDuration = 1000,
  startAngle = -90,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const circumference = 2 * Math.PI * radius;
  
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: animationDuration,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference * (1 - Math.min(progress, 1))],
  });

  const size = (radius + strokeWidth) * 2;
  const center = size / 2;

  return (
    <Svg width={size} height={size}>
      <G rotation={startAngle} origin={`${center}, ${center}`}>
        {/* Background ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {/* Progress ring */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
        {/* Over 100% indicator - additional ring layer */}
        {progress > 1 && (
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth * 0.6}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (2 - progress)}
            strokeLinecap="round"
            opacity={0.5}
          />
        )}
      </G>
    </Svg>
  );
};

export default ActivityRing;