import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

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

// 🌈 Predefined palette
const colorPalette = ['#FFA07A', '#87CEFA', '#98FB98', '#FFD700', '#BA55D3', '#20B2AA', '#FF6347', '#EE82EE', '#FF69B4', '#FF4500', '#00CED1', '#32CD32'];

const ColorPickerModal = ({ visible, onClose, onColorSelected, dimensionKey }) => {
  const [selectedColor, setSelectedColor] = useState(defaultColors[dimensionKey]);

  useEffect(() => {
    if (visible) initializeColor();
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
    const savedColor = savedColors[dimensionKey] || defaultColors[dimensionKey];
    setSelectedColor(savedColor);
  };

  // 🏃 Save chosen color
const handleSelectColor = async () => {
    const storedColors = JSON.parse(await AsyncStorage.getItem('selectedColors')) || {};
    storedColors[dimensionKey] = selectedColor;
    await AsyncStorage.setItem('selectedColors', JSON.stringify(storedColors));
    onColorSelected(selectedColor);
    onClose();
  };
  
  // 🔄 Reset to default
  const resetToDefault = async () => {
    setSelectedColor(defaultColors[dimensionKey]);
    const storedColors = JSON.parse(await AsyncStorage.getItem('selectedColors')) || {};
    storedColors[dimensionKey] = defaultColors[dimensionKey];
    await AsyncStorage.setItem('selectedColors', JSON.stringify(storedColors));
    onColorSelected(defaultColors[dimensionKey]);
  };


  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          <Text style={styles.header}>Pick a Color for {dimensionKey}</Text>

          {/* 🎨 Color Palette */}
          <View style={styles.paletteContainer}>
            {colorPalette.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorCircle,
                  { backgroundColor: color, borderWidth: selectedColor === color ? 4 : 0 },
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>

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

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  paletteContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  colorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    margin: 10,
    borderColor: '#000',
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
  },
});

export default ColorPickerModal;