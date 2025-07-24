import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Slider from '@react-native-community/slider';
import { useTheme } from './ThemeContext';

// 🎨 Default color mappings per dimension (permanent)
const defaultColors = {
  Physical: '#FFA07A',
  Mental: '#87CEFA',
  Environmental: '#98FB98',
  Financial: '#FFD700',
  Intellectual: '#BA55D3',
  Occupational: '#20B2AA',
  Social: '#FF6347',
  Spiritual: '#EE82EE',
};

// Helper functions for color conversion
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
};

const rgbToHex = (r, g, b) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

const ColorPickerModal = ({ visible, onClose, onColorSelected, dimensionKey }) => {
  const { theme } = useTheme();
  const [selectedColor, setSelectedColor] = useState(defaultColors[dimensionKey] || '#FFA07A');
  const [usedColors, setUsedColors] = useState([]);
  const [rgbValues, setRgbValues] = useState({ r: 255, g: 255, b: 255 });
  const [hexInput, setHexInput] = useState('');

  useEffect(() => {
    if (visible) {
      initializeColor();
      loadUsedColors();
    }
  }, [visible]);

 // 🏃 Preload defaults if missing
const preloadDefaults = async () => {
    const existingDefaults = await AsyncStorage.getItem('defaultColors');
    if (!existingDefaults) {
      await AsyncStorage.setItem('defaultColors', JSON.stringify(defaultColors));
    }
  };
  
  // 🏃 Load selected color or use default
  const initializeColor = async () => {
    await preloadDefaults();
    const savedColors = JSON.parse(await AsyncStorage.getItem('selectedColors')) || {};
    const savedColor = savedColors[dimensionKey] || defaultColors[dimensionKey] || '#FFA07A';
    setSelectedColor(savedColor);
    const rgb = hexToRgb(savedColor);
    setRgbValues(rgb);
    setHexInput(savedColor);
  };

  // Load colors already used by other dimensions
  const loadUsedColors = async () => {
    const savedColors = JSON.parse(await AsyncStorage.getItem('selectedColors')) || {};
    const colors = [];
    Object.keys(savedColors).forEach(key => {
      if (key !== dimensionKey) {
        colors.push(savedColors[key]);
      }
    });
    // Also include default colors of other dimensions if not customized
    Object.keys(defaultColors).forEach(key => {
      if (key !== dimensionKey && !savedColors[key]) {
        colors.push(defaultColors[key]);
      }
    });
    setUsedColors(colors);
  };

  // 🏃 Save chosen color
  const handleSelectColor = async () => {
    if (isColorUsed(selectedColor)) {
      Alert.alert('Color Already Used', 'This color is already assigned to another dimension. Please choose a different color.');
      return;
    }
    const storedColors = JSON.parse(await AsyncStorage.getItem('selectedColors')) || {};
    storedColors[dimensionKey] = selectedColor;
    await AsyncStorage.setItem('selectedColors', JSON.stringify(storedColors));
    onColorSelected(selectedColor);
    onClose();
  };
  
  // Handle RGB slider changes
  const updateRgbValue = (value, component) => {
    const newRgb = { ...rgbValues, [component]: Math.round(value) };
    setRgbValues(newRgb);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setSelectedColor(newHex);
    setHexInput(newHex);
  };

  // Handle hex input changes
  const handleHexInputChange = (text) => {
    setHexInput(text);
    if (/^#[0-9A-F]{6}$/i.test(text)) {
      const rgb = hexToRgb(text);
      setRgbValues(rgb);
      setSelectedColor(text.toUpperCase());
    }
  };

  // Check if color is already used
  const isColorUsed = (color) => {
    return usedColors.some(usedColor => 
      usedColor.toLowerCase() === color.toLowerCase()
    );
  };

  // 🔄 Reset to default
  const resetToDefault = async () => {
    const defaultColor = defaultColors[dimensionKey];
    setSelectedColor(defaultColor);
    const rgb = hexToRgb(defaultColor);
    setRgbValues(rgb);
    setHexInput(defaultColor);
    const storedColors = JSON.parse(await AsyncStorage.getItem('selectedColors')) || {};
    storedColors[dimensionKey] = defaultColor;
    await AsyncStorage.setItem('selectedColors', JSON.stringify(storedColors));
    onColorSelected(defaultColor);
  };


  const styles = createStyles(theme);
  
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          <Text style={styles.header}>Pick a Color for {dimensionKey}</Text>

          {/* Color Preview */}
          <View style={styles.colorPreviewContainer}>
            <View style={[styles.colorPreview, { backgroundColor: selectedColor }]} />
            <View style={styles.colorInfo}>
              <Text style={styles.colorLabel}>Selected Color</Text>
              <TextInput
                style={styles.hexInput}
                value={hexInput}
                onChangeText={handleHexInputChange}
                placeholder="#000000"
                placeholderTextColor={theme.placeholderText}
                maxLength={7}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* RGB Sliders */}
          <View style={styles.slidersContainer}>
            {/* Red Slider */}
            <View style={styles.sliderRow}>
              <Text style={[styles.sliderLabel, { color: '#FF0000' }]}>RED</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={255}
                value={rgbValues.r}
                onValueChange={(value) => updateRgbValue(value, 'r')}
                minimumTrackTintColor="#FF0000"
                maximumTrackTintColor={theme.border}
                thumbTintColor="#FF0000"
              />
              <Text style={styles.sliderValue}>{rgbValues.r}</Text>
            </View>

            {/* Green Slider */}
            <View style={styles.sliderRow}>
              <Text style={[styles.sliderLabel, { color: '#00FF00' }]}>GREEN</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={255}
                value={rgbValues.g}
                onValueChange={(value) => updateRgbValue(value, 'g')}
                minimumTrackTintColor="#00FF00"
                maximumTrackTintColor={theme.border}
                thumbTintColor="#00FF00"
              />
              <Text style={styles.sliderValue}>{rgbValues.g}</Text>
            </View>

            {/* Blue Slider */}
            <View style={styles.sliderRow}>
              <Text style={[styles.sliderLabel, { color: '#0000FF' }]}>BLUE</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={255}
                value={rgbValues.b}
                onValueChange={(value) => updateRgbValue(value, 'b')}
                minimumTrackTintColor="#0000FF"
                maximumTrackTintColor={theme.border}
                thumbTintColor="#0000FF"
              />
              <Text style={styles.sliderValue}>{rgbValues.b}</Text>
            </View>
          </View>

          {/* Used color warning */}
          {isColorUsed(selectedColor) && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={20} color="#FF6B6B" />
              <Text style={styles.warningText}>This color is already used by another dimension</Text>
            </View>
          )}

          <TouchableOpacity style={styles.selectButton} onPress={handleSelectColor}>
            <Ionicons name="checkmark-circle" size={30} color="#4CAF50" />
            <Text style={styles.buttonText}>Select Color</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={resetToDefault}>
            <Ionicons name="refresh-circle" size={30} color="#FFA500" />
            <Text style={styles.buttonText}>Reset to Default</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Ionicons name="close-circle" size={30} color="#f44336" />
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme) => StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: theme.modalBackground,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: theme.text,
  },
  colorPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  colorPreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 20,
    borderWidth: 2,
    borderColor: theme.border,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  colorInfo: {
    flex: 1,
  },
  colorLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 5,
  },
  hexInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.inputBackground,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  slidersContainer: {
    width: '100%',
    marginBottom: 20,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sliderLabel: {
    width: 60,
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  sliderValue: {
    width: 40,
    textAlign: 'right',
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
  },
  warningText: {
    color: '#FF6B6B',
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    marginLeft: 10,
    color: theme.text,
  },
});

export default ColorPickerModal;