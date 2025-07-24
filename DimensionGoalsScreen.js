import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getUniversalTime } from './dateUtils';
import { getColorForDimension } from './getColorForDimension';
import { useTheme } from './ThemeContext';

const DimensionGoalsScreen = ({ route, navigation }) => {
  const { theme, colorScheme } = useTheme();
  const { dimensionName } = route.params;
  const [dimensionColor, setDimensionColor] = useState('#D3D3D3');
  const [goals, setGoals] = useState([]);
  const [counterModalVisible, setCounterModalVisible] = useState(false);
  const [counterGoal, setCounterGoal] = useState(null);
  const [count, setCount] = useState(0);
  const [notepadModalVisible, setNotepadModalVisible] = useState(false);
  const [notepadGoal, setNotepadGoal] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [todayDate, setTodayDate] = useState(getUniversalTime().fullDate);
  const [habits, setHabits] = useState([]);
  const [combinedList, setCombinedList] = useState([]);

  // Dimension descriptions
  const getDimensionDescription = (dimension) => {
    const descriptions = {
      Physical: "Taking care of your body through exercise and healthy habits. This includes nutrition, sleep, and overall fitness.",
      Mental: "Managing your emotional wellbeing and mental health. Developing resilience and coping with life's challenges.",
      Environmental: "Creating spaces that support your wellbeing. Organizing your home and work areas for health and productivity.",
      Financial: "Managing money wisely for security and goals. Building financial habits that reduce stress and create opportunities.",
      Intellectual: "Keeping your mind active through learning and creativity. Pursuing knowledge and skills that interest you.",
      Occupational: "Finding satisfaction and growth in your work. Balancing career ambitions with personal wellbeing.",
      Social: "Building meaningful relationships and connections. Nurturing bonds with family, friends, and community.",
      Spiritual: "Understanding what gives your life meaning. Connecting with your values and sense of purpose."
    };
    return descriptions[dimension] || "Embrace this dimension of your wellness journey with intention and care.";
  };

  useFocusEffect(
    React.useCallback(() => {
      loadGoals();
      loadDimensionColor();
      loadHabits();
    }, [])
  );

  const loadDimensionColor = async () => {
    const color = await getColorForDimension(dimensionName);
    setDimensionColor(color || '#D3D3D3');
  };

  const loadGoals = async () => {
    try {
      const storedGoals = await AsyncStorage.getItem(todayDate);
      const allGoals = storedGoals ? JSON.parse(storedGoals) : [];
      const filteredGoals = allGoals.filter(goal => goal.dimension === dimensionName);
  
      const updatedGoals = await Promise.all(
        filteredGoals.map(async (goal) => {
          if (goal.quantifiable) {
            const savedCount = await AsyncStorage.getItem(`count-${goal.id}-${todayDate}`);
            goal.count = savedCount ? parseInt(savedCount) : 0;
          }
          if (goal.hasNotepad) {
            const savedNote = await AsyncStorage.getItem(`note-${goal.id}-${todayDate}`);
            goal.note = savedNote || ''; // ✅ Store as raw text (no object wrapping)
          }
          return goal;
        })
      );
  
      setGoals(updatedGoals);
    } catch (error) {
      console.error("Failed to load goals: ", error);
    }
  };

  const loadHabits = async () => {
    const today = getUniversalTime().fullDate;
    const storedHabits = await AsyncStorage.getItem('allHabits');
    const parsedHabits = storedHabits ? JSON.parse(storedHabits) : {};
    const todayHabits = parsedHabits[today]?.habits || [];
    const todayCounts = parsedHabits[today]?.counts || {};
    setHabits(
      todayHabits
        .filter(h => h.dimension === dimensionName)
        .map(habit => ({ ...habit, count: todayCounts[habit.id] || 0 }))
    );
  };

  const incrementHabitCount = async (habitId) => {
    const today = getUniversalTime().fullDate;
    const storedHabits = await AsyncStorage.getItem('allHabits');
    const parsedHabits = storedHabits ? JSON.parse(storedHabits) : {};
    const todayHabits = parsedHabits[today]?.habits || [];
    const todayCounts = parsedHabits[today]?.counts || {};
    todayCounts[habitId] = (todayCounts[habitId] || 0) + 1;
    parsedHabits[today].counts = todayCounts;
    await AsyncStorage.setItem('allHabits', JSON.stringify(parsedHabits));
    loadHabits();
  };

  const decrementHabitCount = async (habitId) => {
    const today = getUniversalTime().fullDate;
    const storedHabits = await AsyncStorage.getItem('allHabits');
    const parsedHabits = storedHabits ? JSON.parse(storedHabits) : {};
    const todayHabits = parsedHabits[today]?.habits || [];
    const todayCounts = parsedHabits[today]?.counts || {};
    todayCounts[habitId] = Math.max((todayCounts[habitId] || 0) - 1, 0);
    parsedHabits[today].counts = todayCounts;
    await AsyncStorage.setItem('allHabits', JSON.stringify(parsedHabits));
    loadHabits();
  };

  const toggleCompleteGoal = async (goalId) => {
    const storedGoals = await AsyncStorage.getItem(todayDate);
    const allGoals = storedGoals ? JSON.parse(storedGoals) : [];
  
    const updatedAllGoals = allGoals.map(goal =>
      goal.id === goalId ? { ...goal, completed: !goal.completed } : goal
    );
  
    setGoals(updatedAllGoals.filter(goal => goal.dimension === dimensionName)); // Update displayed goals
    await AsyncStorage.setItem(todayDate, JSON.stringify(updatedAllGoals)); // Save ALL goals
  };

  const openCounterModal = async (goal) => {
    try {
      const savedCount = await AsyncStorage.getItem(`count-${goal.id}-${todayDate}`);
      setCount(savedCount ? parseInt(savedCount) : 0);
      setCounterGoal(goal);
      setCounterModalVisible(true);
    } catch (error) {
      console.error("Failed to load counter: ", error);
    }
  };
  
  const incrementCount = async () => {
    try {
      const newCount = count + 1;
      setCount(newCount);
  
      const isCompleted = newCount >= counterGoal.target;
      const updatedGoals = goals.map(goal =>
        goal.id === counterGoal.id
          ? { ...goal, count: newCount, completed: isCompleted }
          : goal
      );
  
      setGoals(updatedGoals);
  
      // 🔥 Save counter and completion status
      await AsyncStorage.setItem(`count-${counterGoal.id}-${todayDate}`, newCount.toString());
      const allStoredGoals = await AsyncStorage.getItem(todayDate);
      const parsedGoals = allStoredGoals ? JSON.parse(allStoredGoals) : [];
      const updatedAllGoals = parsedGoals.map(goal =>
        goal.id === counterGoal.id ? { ...goal, completed: isCompleted } : goal
      );
      await AsyncStorage.setItem(todayDate, JSON.stringify(updatedAllGoals));
    } catch (error) {
      console.error("Failed to increment count: ", error);
    }
  };
  
  const decrementCount = async () => {
    try {
      const newCount = Math.max(count - 1, 0); // 🚫 Never negative
      setCount(newCount);
  
      const isCompleted = newCount >= counterGoal.target;
      const updatedGoals = goals.map(goal =>
        goal.id === counterGoal.id
          ? { ...goal, count: newCount, completed: isCompleted }
          : goal
      );
  
      setGoals(updatedGoals);
  
      await AsyncStorage.setItem(`count-${counterGoal.id}-${todayDate}`, newCount.toString());
      const allStoredGoals = await AsyncStorage.getItem(todayDate);
      const parsedGoals = allStoredGoals ? JSON.parse(allStoredGoals) : [];
      const updatedAllGoals = parsedGoals.map(goal =>
        goal.id === counterGoal.id ? { ...goal, completed: isCompleted } : goal
      );
      await AsyncStorage.setItem(todayDate, JSON.stringify(updatedAllGoals));
    } catch (error) {
      console.error("Failed to decrement count: ", error);
    }
  };

  const closeCounterModal = () => {
    setCounterModalVisible(false);
    setCounterGoal(null);
  };

  const openNotepadModal = async (goal) => {
    const savedNote = await AsyncStorage.getItem(`note-${goal.id}-${todayDate}`);
    setNoteText(savedNote || ''); // ✅ Store notes as raw text
    setNotepadGoal(goal);
    setNotepadModalVisible(true);
  };
  
  const closeNotepadModal = async () => {
    if (notepadGoal) {
      await AsyncStorage.setItem(`note-${notepadGoal.id}-${todayDate}`, noteText); // ✅ Save as raw text
      setGoals(goals.map(goal =>
        goal.id === notepadGoal.id ? { ...goal, note: noteText } : goal
      ));
    }
    setNotepadModalVisible(false);
    setNotepadGoal(null);
  };

  useEffect(() => {
    // Combine goals and habits into a single list, goals first
    const goalsWithType = goals.map(g => ({ ...g, _type: 'goal' }));
    const habitsWithType = habits.map(h => ({ ...h, _type: 'habit' }));
    setCombinedList([...goalsWithType, ...habitsWithType]);
  }, [goals, habits]);

  const renderItem = ({ item }) => {
    if (item._type === 'goal') {
      // Render goal item (existing renderItem logic)
      return (
        <View style={[styles.goalItem, { backgroundColor: dimensionColor }]}> 
          <Text style={[styles.goalText, item.completed && styles.completedText]}>{item.name}</Text>
          {item.quantifiable && (
            <TouchableOpacity onPress={() => openCounterModal(item)}>
              <Text style={styles.counterText}>{item.count}/{item.target}</Text>
            </TouchableOpacity>
          )}
          {item.hasNotepad && (
            <TouchableOpacity onPress={() => openNotepadModal(item)}>
              <Ionicons name="document-text-outline" size={24} color="#fff" style={{ marginRight: 10 }} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() =>
              item.quantifiable ? openCounterModal(item) : toggleCompleteGoal(item.id)
            }
          >
            <Ionicons
              name={item.completed ? "checkmark-circle" : "ellipse-outline"}
              size={28}
              color={item.completed ? "#00BFFF" : "#fff"}
            />
          </TouchableOpacity>
        </View>
      );
    } else {
      // Render habit item
      const isComplete = item.count >= item.target;
      return (
        <View style={{
          backgroundColor: theme.cardBackground,
          borderRadius: 14,
          marginVertical: 6,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          borderLeftWidth: 8,
          borderLeftColor: dimensionColor,
          shadowColor: '#000',
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <Ionicons name="star" size={18} color={dimensionColor} style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: isComplete ? theme.textSecondary : theme.text, flex: 1, textDecorationLine: isComplete ? 'line-through' : 'none' }}>{item.name}</Text>
          <TouchableOpacity onPress={() => decrementHabitCount(item.id)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.secondaryButton, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
            <Ionicons name="remove" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center', minWidth: 56 }}>
            <Text style={{ fontSize: 16, color: theme.text }}>{item.count || 0} / {item.target}</Text>
          </View>
          <TouchableOpacity onPress={() => incrementHabitCount(item.id)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: dimensionColor, alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    }
  };

  const styles = createStyles(theme);
  
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Today's {dimensionName} Goals & Habits</Text>
      </View>

      {/* Dimension Description */}
      <View style={[styles.descriptionContainer, { borderLeftColor: dimensionColor }]}>
        <Text style={styles.descriptionText}>
          {getDimensionDescription(dimensionName)}
        </Text>
      </View>

      {/* Goals for this dimension */}
      <FlatList
        data={combinedList}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.noGoalsText}>No goals or habits for this dimension today.</Text>}
        scrollEnabled={false}
      />

      {/* Modal for Counter */}
      <Modal animationType="slide" transparent={true} visible={counterModalVisible} onRequestClose={closeCounterModal}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{counterGoal?.name}</Text>
            <Text style={styles.counterText}>
              Count: {count}/{counterGoal?.target} 
              {count >= counterGoal?.target && " 🎉 Goal Complete!"}
            </Text>

            <TouchableOpacity onPress={incrementCount} style={styles.counterButton}>
              <Text style={styles.counterButtonText}>+1</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={decrementCount} style={styles.counterButton}>
              <Text style={styles.counterButtonText}>-1</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={closeCounterModal} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal for Notepad */}
      <Modal animationType="slide" transparent={true} visible={notepadModalVisible} onRequestClose={closeNotepadModal}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
            <KeyboardAvoidingView behavior="padding" style={styles.modalContent}>
              <Text style={styles.modalTitle}>{notepadGoal?.name}</Text>

              <TextInput
                style={styles.textInput}
                placeholder="Write your notes here..."
                placeholderTextColor={theme.placeholderText}
                multiline
                value={noteText}
                onChangeText={(text) => setNoteText(text)}
              />

              <TouchableOpacity onPress={closeNotepadModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 50,
    backgroundColor: theme.background,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 15,
    color: theme.text,
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  goalText: {
    fontSize: 18,
    color: '#fff',
    flex: 1,
    marginRight: 10,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: 'gray',
  },
  counterText: {
    fontSize: 20,
    color: theme.text, // Use theme text color for visibility
    marginVertical: 10,
  },
  noGoalsText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
    color: 'gray',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.cardBackground,
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: theme.text,
  },
  counterButton: {
    padding: 10,
    backgroundColor: theme.primaryButtonText,
    borderRadius: 5,
    marginVertical: 10,
  },
  counterButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  closeButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: theme.primaryButtonText,
    marginTop: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  textInput: {
    height: 150,
    borderColor: theme.border,
    borderWidth: 1,
    padding: 10,
    width: '100%',
    marginBottom: 20,
    color: theme.text,
    backgroundColor: theme.inputBackground,
  },
  descriptionContainer: {
    backgroundColor: theme.secondaryButton,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  descriptionText: {
    fontSize: 15,
    color: theme.textSecondary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});

export default DimensionGoalsScreen;