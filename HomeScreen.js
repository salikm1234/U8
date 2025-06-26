import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getUniversalTime } from './dateUtils';
import { getColorForDimension } from './getColorForDimension';
import { goals as presetGoals } from './goals';

const HomeScreen = ({ navigation }) => {
  const [dailyGoals, setDailyGoals] = useState([]);
  const [dimensionData, setDimensionData] = useState([]);
  const [dimensionColors, setDimensionColors] = useState({});
  const [todayDate, setTodayDate] = useState(getUniversalTime().fullDate);
  const [suggestedGoals, setSuggestedGoals] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [addedGoals, setAddedGoals] = useState({});
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);

  const loadGoals = async () => {
    const todayDate = getUniversalTime().fullDate; // ✅ Always get the latest date
    const goals = await AsyncStorage.getItem(todayDate);
    const parsedGoals = goals ? JSON.parse(goals) : [];
    setDailyGoals(parsedGoals);
  
    const dimensionMap = {};
    parsedGoals.forEach(goal => {
      dimensionMap[goal.dimension] = (dimensionMap[goal.dimension] || 0) + 1;
    });
  
    const dimensions = Object.keys(dimensionMap).map(dimension => ({
      name: dimension,
      count: dimensionMap[dimension],
    }));
  
    setDimensionData(dimensions);
  };

  const loadDimensionColors = async () => {
    try {
      const storedPresetGoals = await AsyncStorage.getItem('presetGoals');
      const presetGoalsParsed = storedPresetGoals ? JSON.parse(storedPresetGoals) : {};
  
      const allDimensions = Object.keys(presetGoalsParsed); // ✅ Get all dimension names
      const colors = {};
  
      for (const dimension of allDimensions) {
        colors[dimension] = await getColorForDimension(dimension);
      }
  
      setDimensionColors(colors);
    } catch (error) {
      console.error('Error loading dimension colors:', error);
    }
  };

  const loadSuggestedGoals = async () => {
    let allGoalsData = await AsyncStorage.getItem('presetGoals');
    let allGoals;
  
    // 🌟 Fallback to default goals if not found in AsyncStorage
    if (!allGoalsData) {
      await AsyncStorage.setItem('presetGoals', JSON.stringify(presetGoals));
      allGoals = presetGoals;
    } else {
      allGoals = JSON.parse(allGoalsData);
    }
  
    const todayDate = getUniversalTime().fullDate;
    const scheduledGoals = await AsyncStorage.getItem(todayDate);
    const scheduled = scheduledGoals ? JSON.parse(scheduledGoals).map(g => g.id) : [];
  
    const unscheduledGoals = Object.entries(allGoals)
      .flatMap(([dimension, goals]) =>
        goals.map(goal => ({ ...goal, dimension }))
      )
      .filter(goal => !scheduled.includes(goal.id));
  
    if (unscheduledGoals.length > 3) {
      const randomGoals = unscheduledGoals.sort(() => 0.5 - Math.random()).slice(0, 3);
      setSuggestedGoals(randomGoals);
      setShowSuggestions(true);
    } else if (unscheduledGoals.length > 0) {
      setSuggestedGoals(unscheduledGoals);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const refreshSuggestions = () => {
    setAddedGoals({});
    loadSuggestedGoals();
  };

  const scheduleSuggestedGoal = async (goal) => {
    const todayDate = getUniversalTime().fullDate;
    const existingGoals = await AsyncStorage.getItem(todayDate);
    const updatedGoals = existingGoals ? JSON.parse(existingGoals) : [];
    updatedGoals.push({ ...goal, completed: false });
  
    await AsyncStorage.setItem(todayDate, JSON.stringify(updatedGoals));
    setAddedGoals(prev => ({ ...prev, [goal.id]: true }));
    loadGoals(); // Refresh HomeScreen dynamically
  };
  const toggleSuggestions = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setSuggestionsExpanded(!suggestionsExpanded);
  };
  useFocusEffect(
    React.useCallback(() => {
      loadDimensionColors();    // 🎨 Load all colors first
      loadGoals();              // 🎯 Load today's goals
      loadSuggestedGoals();     // 💡 Load suggestions
    }, [])
  );

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const renderDimensionItem = ({ item }) => (
    <TouchableOpacity
    style={[
        styles.dimensionItem,
        {
          backgroundColor: dimensionColors[item.name] || '#D3D3D3',
          width: Math.min(120 + item.count * 10, 160),
height: Math.min(120 + item.count * 10, 160),
borderRadius: Math.min(120 + item.count * 10, 160) / 2,
        },
      ]}
      onPress={() => navigation.navigate('DimensionGoalsScreen', { dimensionName: item.name })}
    >
      <Text style={styles.dimensionText}>{item.name}</Text>
      <View style={styles.badge}>
        <Text style={[styles.badgeText, { color: dimensionColors[item.name] || '#000' }]}>
          {item.count}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (

    
<ScrollView contentContainerStyle={[styles.container, { flexGrow: 1 }]}>
    <View>
  <Text style={styles.header}>Today's Wellness Dimensions</Text>

  <View style={styles.topContainer}>
    <TouchableOpacity
      style={styles.goalsButton}
      onPress={() => navigation.navigate('GoalSetting', { date: getUniversalTime().fullDate })}
    >
      <Ionicons name="add-circle" size={40} color="#00BFFF" />
      <Text style={styles.goalsButtonText}>Plan a Goal</Text>
    </TouchableOpacity>
  </View>
</View>

      {dimensionData.length > 0 ? (
      <View style={{ flexGrow: 1 }}>
      <FlatList
        data={dimensionData}
        renderItem={renderDimensionItem}
        keyExtractor={(item) => item.name}
        numColumns={2}
        columnWrapperStyle={styles.dimensionRow}
        contentContainerStyle={styles.dimensionList}
        scrollEnabled={false}   // ✅ Keeps FlatList from scrolling independently
      />
    </View>
      ) : (
        <Text style={styles.noGoalsText}>No goals scheduled for today.</Text>
      )}
{/* <Text>Hey</Text> */}
{showSuggestions && (
  <View style={styles.suggestedContainer}>
    <View style={styles.suggestedHeader}>
  <TouchableOpacity
    style={styles.suggestedHeaderToggle}
    onPress={toggleSuggestions} // 🔥 Animated toggle
  >
    <Text style={styles.suggestedHeaderText}>Suggested Goals</Text>
    <Ionicons
    name={suggestionsExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
    size={30}
    color="#00BFFF"
    style={{ marginLeft: 10 }}  // 🎯 Adds space between text & toggle icon
  />
  </TouchableOpacity>
  <TouchableOpacity onPress={refreshSuggestions}>
    <Ionicons name="refresh-circle" size={30} color="#00BFFF" />
  </TouchableOpacity>
</View>
{suggestionsExpanded && suggestedGoals.map((goal) => (
  <View
    key={goal.id}
    style={[
      styles.suggestedGoalItem,
      { backgroundColor: dimensionColors[goal.dimension] || '#D3D3D3' },
    ]}
  >
    <Text style={styles.goalText}>{goal.name}</Text>
    <TouchableOpacity
      onPress={() => scheduleSuggestedGoal(goal)}
      disabled={addedGoals[goal.id]}
    >
      <Ionicons
        name={addedGoals[goal.id] ? "checkmark-circle-outline" : "add-circle-outline"}
        size={30}
        color={addedGoals[goal.id] ? "green" : "#fff"}
      />
    </TouchableOpacity>
  </View>
))}
    
  </View>
)}

{/* <Text>Hey</Text> */}

{/* <TouchableOpacity
  style={styles.planButton}
  onPress={() => navigation.navigate('GoalSelection', { date: getUniversalTime().fullDate })}
>
  <Ionicons name="add-circle" size={50} color="#00BFFF" />
  <Text style={styles.planButtonText}>Plan More Goals</Text>
</TouchableOpacity> */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,            // ✅ Ensure the ScrollView takes full height
        paddingTop: 80,
        paddingHorizontal: 20,
        backgroundColor: '#f5f5f5',
      },
      topContainer: {
        flexDirection: 'row',            // ✅ Side-by-side alignment
        justifyContent: 'space-between', // ✅ Push buttons to edges
        alignItems: 'center',            // ✅ Align vertically at the center
        marginBottom: 20,
      },
      
      goalsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: '#E0F7FF',
        borderRadius: 10,
        width: '100%',
        marginBottom: 20,
        marginTop: 10,
        shadowColor: '#00BFFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      },
      
      goalsButtonText: {
        fontSize: 20,
        marginLeft: 15,
        color: '#00BFFF',
        fontWeight: 'bold',
      },
      
      settingsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,                     // ✅ Same height as planButtonTop
        paddingVertical: 10,
        paddingHorizontal: 15,          // ✅ Same padding for alignment
        backgroundColor: '#E0F7FF',
        borderRadius: 10,
        width: '48%',                   // ✅ Adjust width for alignment
      },
      
      settingsLabel: {
        fontSize: 18,
        color: '#00BFFF',
        marginRight: 5,
      },
      header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center', /* ✅ Center the text */
        width: '100%',       /* ✅ Ensure it spans full width for proper centering */
      },
  dimensionList: {
    justifyContent: 'center',
    marginTop:20,
  },
  dimensionRow: {
    justifyContent: 'space-evenly',
    marginBottom: 20,
  },
  dimensionItem: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 120,    // ✅ Increased minimum width
    height: 120,   // ✅ Increased minimum height
    borderRadius: 60, // ✅ Adjusted for circle shape
    position: 'relative',
  },
  dimensionText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'black',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  noGoalsText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 18,
    color: 'gray',
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', 
    marginTop: 0,
  },
  planButtonText: {
    fontSize: 18,
    marginLeft: 10,
    color: '#00BFFF',
  },
  topButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  suggestedContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#E8F6FF',
    borderRadius: 10,
    borderWidth: 2,             // ✅ Add border
    borderColor: 'black',         // ✅ Make it obvious if hidden
  },
  suggestedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,                  // 🔥 Adds small spacing between text & icons
  },
  
  suggestedHeaderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 0,          // 🎯 Reduce space before the refresh button
  },
  suggestedHeaderText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  suggestedGoalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
 
 
});

export default HomeScreen;