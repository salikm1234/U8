import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getUniversalTime } from './dateUtils';
// import { EventEmitter } from 'fbemitter';

// const eventEmitter = new EventEmitter(); // Create a global event emitter
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const RoutineActionScreen = ({ navigation, route }) => {
  const { routine } = route.params;
  const [tasks, setTasks] = useState([]);
  const [motivations, setMotivations] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [lastAddedTask, setLastAddedTask] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(0); // Triggers re-renders

  const flatListRef = useRef(null);

//   useEffect(() => {
//     const subscription = eventEmitter.addListener('refreshMotivation', (task) => {
//         console.log(`🔄 Received refresh event for: ${task.name}`);
//         refreshMotivationForTask(task.id, task.name, task.description);
//     });

//     return () => subscription.remove(); // Clean up on unmount
// }, []);


  useFocusEffect(
    React.useCallback(() => {
      loadRoutineTasks();
      return () => console.log('RoutineActionScreen reloaded.');
    }, [routine.id]) // Reload if routine changes
);


const loadRoutineTasks = async () => {
    try {
        const todayKey = getUniversalTime().fullDate;
        console.log('🛠 Fetching tasks for date:', todayKey);

        const lastReset = await AsyncStorage.getItem('lastCompletionReset');

        // 🔥 Reset completion states if it's a new day
        if (lastReset !== todayKey) {
            console.log("🌅 New day detected! Resetting task completion.");
            await AsyncStorage.removeItem(`completion-${routine.id}-${todayKey}`);
            await AsyncStorage.setItem('lastCompletionReset', todayKey);
        }

        // Fetch latest tasks
        const storedRoutines = JSON.parse(await AsyncStorage.getItem('routines')) || [];
        const currentRoutine = storedRoutines.find((r) => r.id === routine.id);

        if (!currentRoutine) {
            console.log('❌ No routine found for ID:', routine.id);
            return;
        }

        const storedCompletion = JSON.parse(await AsyncStorage.getItem(`completion-${routine.id}-${todayKey}`)) || {};
        const sortedTasks = [...(currentRoutine.tasks || [])].sort((a, b) => a.stepNumber - b.stepNumber);

        const updatedTasks = sortedTasks.map((task) => ({
            ...task,
            completed: storedCompletion[task.id] || false,
        }));

        setTasks(updatedTasks);

        // 🔄 Trigger UI refresh
        setRefreshFlag((prev) => prev + 1);

        // 🔥 Scroll to first incomplete task
        const firstIncompleteIndex = updatedTasks.findIndex(task => !task.completed);
        const targetIndex = firstIncompleteIndex !== -1 ? firstIncompleteIndex : 0;

        setTimeout(() => {
            if (flatListRef.current) {
                flatListRef.current.scrollToIndex({
                    index: targetIndex,
                    animated: true,
                    viewOffset: 80
                });
            }
        }, 500);

        // ✅ Regenerate motivational messages if it's a new day
        await regenerateMotivations(updatedTasks);

    } catch (error) {
        console.error('❌ Error loading routine tasks:', error);
    }
};

const regenerateMotivations = async (tasksList) => {
    console.log("🔄 Regenerating all motivation messages...");
    
    const motivationPromises = tasksList.map(async (task) => {
        return { id: task.id, motivation: await generateMotivation(task) };
    });

    const motivationResults = await Promise.all(motivationPromises);
    const newMotivations = {};
    
    motivationResults.forEach(({ id, motivation }) => {
        newMotivations[id] = motivation;
    });

    console.log("✅ New Motivations Generated:", newMotivations);

    // 🔥 Update State & AsyncStorage
    setMotivations(newMotivations);
    await AsyncStorage.setItem(`motivations-${routine.id}`, JSON.stringify(newMotivations));

    // 🔥 Force UI Refresh
    setTasks((prevTasks) => [...prevTasks]);
};

const apiKey = 'sk-HQTAw5Uo53Ju3trxAWuLcrlLz8s2BSlDnA7Q-pbaONT3BlbkFJ0Tc3zDrimeBw-1Uor3_AQlkTWfYuOYyHic3AGO0_IA';
const generateMotivation = async (task) => {
    try {
        console.log(`Generating motivation for: ${task.name}`);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: `Provide a **short and energetic** motivational message for this task:
                        - **Task Name**: ${task.name}
                        - **Task Description**: ${task.description}

                        The message should be **concise, engaging, and inspiring**. Keep it extremely short. No longer than 6-7 words. Do **not** include task instructions.
                        Example: "You're unstoppable! This task is another step toward success!"`,
                    },
                ],
            }),
        });

        if (!response.ok) {
            console.error(`OpenAI API Error: ${response.status}`);
            return 'Stay strong! Keep going!';
        }

        const data = await response.json();
        const motivation = data.choices?.[0]?.message?.content?.trim();
        
        return motivation || 'Keep pushing forward! You got this!';
    } catch (error) {
        console.error("Error generating motivation:", error);
        return 'You got this! Keep moving forward!';
    }
};

const refreshMotivationForTask = async (taskId, taskName, taskDescription) => {
    try {
        console.log(`Refreshing motivation for: ${taskName}`);

        // 🔥 Generate AI motivation
        const newMotivation = await generateMotivation({ name: taskName, description: taskDescription });

        // 🔥 Update motivation in state dynamically
        setMotivations((prevMotivations) => ({
            ...prevMotivations,
            [taskId]: newMotivation,
        }));

        // 🔥 Save to AsyncStorage
        const storedMotivations = JSON.parse(await AsyncStorage.getItem(`motivations-${routine.id}`)) || {};
        storedMotivations[taskId] = newMotivation;
        await AsyncStorage.setItem(`motivations-${routine.id}`, JSON.stringify(storedMotivations));

        console.log(`New motivation saved for ${taskName}: ${newMotivation}`);
    } catch (error) {
        console.error("Error refreshing motivation:", error);
        setMotivations((prevMotivations) => ({
            ...prevMotivations,
            [taskId]: "AI failed. Try refreshing!",
        }));
    }
};

  const persistTasks = async (updatedTasks) => {
    const storedRoutines = JSON.parse(await AsyncStorage.getItem('routines')) || [];
    const updatedRoutines = storedRoutines.map((r) =>
      r.id === routine.id ? { ...r, tasks: updatedTasks } : r
    );
  
    await AsyncStorage.setItem('routines', JSON.stringify(updatedRoutines));
  
    // Get the current PST date
    const todayKey = getUniversalTime().fullDate;
    const lastReset = await AsyncStorage.getItem('lastCompletionReset');
  
    // If it's a new day, clear previous completion states
    if (lastReset !== todayKey) {
      await AsyncStorage.removeItem(`completion-${routine.id}-${todayKey}`);
      await AsyncStorage.setItem('lastCompletionReset', todayKey);
    }
  };

  const toggleTaskCompletion = async (taskId) => {
    try {
        const todayKey = getUniversalTime().fullDate; // Use universal PST date
        const storedCompletion = JSON.parse(await AsyncStorage.getItem(`completion-${routine.id}-${todayKey}`)) || {};

        // Toggle completion state
        storedCompletion[taskId] = !storedCompletion[taskId];

        // Save updated completion state to AsyncStorage
        await AsyncStorage.setItem(`completion-${routine.id}-${todayKey}`, JSON.stringify(storedCompletion));

        // Update local state
        const updatedTasks = tasks.map((task) =>
            task.id === taskId ? { ...task, completed: storedCompletion[taskId] } : task
        );

        setTasks(updatedTasks);

        // 🔥 Notify RoutineTrackingScreen to update
        await AsyncStorage.setItem(`routineProgressUpdated`, 'true');

        console.log('Task completion updated:', storedCompletion);
    } catch (error) {
        console.error('Error updating task completion:', error);
    }
};

  const handleTaskFieldChange = (taskId, field, value) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, [field]: value } : task
    );
    setTasks(updatedTasks);
  };

  const confirmDeleteTask = (taskId) => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTask(taskId),
      },
    ]);
  };

  const deleteTask = async (taskId) => {
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    updatedTasks.forEach((task, index) => (task.stepNumber = index + 1));
    setTasks(updatedTasks);
    await persistTasks(updatedTasks);
  };

  const reorderTask = async (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tasks.length) return;
    
    const reorderedTasks = [...tasks];
    const [movedTask] = reorderedTasks.splice(index, 1);
    reorderedTasks.splice(newIndex, 0, movedTask);
    reorderedTasks.forEach((task, idx) => (task.stepNumber = idx + 1));
    
    setTasks(reorderedTasks);
    await persistTasks(reorderedTasks);

    // 🔥 Ensure motivation persists for the moved task
    refreshMotivationForTask(movedTask.id, movedTask.name, movedTask.description); //do we want this?
};


const navigateToAddTask = async () => {
    console.log("🚀 Navigating to AddTaskScreen...");
    
    const newTask = await navigation.navigate('AddTaskScreen', { routineId: routine.id });

    if (newTask) {
        console.log(`✅ New Task Created: ${newTask.name}, ID: ${newTask.id}`);

        // Step 1: Add new task immediately with placeholder motivation
        const taskWithPlaceholder = { ...newTask, motivation: "Generating motivation..." };
        setTasks((prevTasks) => [...prevTasks, taskWithPlaceholder]);

        // Step 2: Refresh **all** motivation messages
        setTimeout(async () => {
            console.log("🔄 Regenerating ALL Motivational Messages...");
            await regenerateMotivations([...tasks, newTask]);

            // 🔥 Force FlatList refresh to reflect motivation updates
            setTasks((prevTasks) => [...prevTasks]);
        }, 50);
    }
};

const forceRefreshTasks = async () => {
    console.log("🚀 Force-refreshing task list...");

    // Full reload from storage
    await loadRoutineTasks();

    // Force FlatList to re-render
    setTasks((prevTasks) => [...prevTasks]);

    console.log("✅ Task list force-refreshed.");
};

const generateAndStoreMotivation = async (task) => {
    console.log(`🤖 Generating AI motivation for: ${task.name}, ID: ${task.id}`);

    try {
        const motivation = await generateMotivation(task);
        const finalMotivation = motivation || "AI failed. Keep pushing forward!";
        
        console.log(`✅ AI Motivation Generated: ${finalMotivation}`);

        // 🔥 Step 1: Update state
        setMotivations((prev) => ({
            ...prev,
            [task.id]: finalMotivation,
        }));

        // 🔥 Step 2: Persist to AsyncStorage
        const storedMotivations = JSON.parse(await AsyncStorage.getItem(`motivations-${routine.id}`)) || {};
        storedMotivations[task.id] = finalMotivation;
        await AsyncStorage.setItem(`motivations-${routine.id}`, JSON.stringify(storedMotivations));

        console.log(`✅ Motivation stored for ${task.name}: ${finalMotivation}`);
    } catch (error) {
        console.error("❌ Error generating motivation:", error);
        
        // Fallback: Update state with error message
        setMotivations((prev) => ({
            ...prev,
            [task.id]: "AI failed. Try refreshing!",
        }));
    }
};

  const renderTaskItem = ({ item, index }) => {
    console.log(`Rendering task: ${item.name}, Motivation:`, motivations[item.id]);

    return (
        <View style={[
            styles.taskContainer,
            { backgroundColor: item.completed ? '#D4F1C5' : '#FFDDDD' },
        ]}>
            <Text style={styles.taskNameText}>{item.name}</Text>
            <Text style={styles.taskDescriptionText}>{item.description}</Text>

            {/* 🔥 AI-Generated Motivation Message */}
            <Text style={styles.motivationText}>
    {motivations[item.id] || item.motivation || 'Generating motivation...'}
</Text>

            <TouchableOpacity 
                style={styles.refreshMotivationButton} 
                onPress={() => refreshMotivationForTask(item.id, item.name, item.description)}
            >
                <Ionicons name="refresh-circle" size={28} color="#4CAF50" />
            </TouchableOpacity>

            <Text style={styles.taskDurationText}>⏳ {item.duration} mins</Text>

            <View style={styles.reorderContainer}>
                <TouchableOpacity onPress={() => reorderTask(index, 'up')}>
                    <Ionicons name="arrow-up" size={30} color="#000" />
                </TouchableOpacity>
                <View style={styles.stepNumberContainer}>
                    <Text style={styles.stepNumberText}>{item.stepNumber}</Text>
                </View>
                <TouchableOpacity onPress={() => reorderTask(index, 'down')}>
                    <Ionicons name="arrow-down" size={30} color="#000" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: item.completed ? 'green' : 'red' }]}
                onPress={() => toggleTaskCompletion(item.id)}
            >
                <Text style={styles.doneButtonText}>
                    {item.completed ? 'Completed' : 'Mark as Done'}
                </Text>
            </TouchableOpacity>

            <View style={styles.taskActionContainer}>
                <TouchableOpacity onPress={() => confirmDeleteTask(item.id)}>
                    <Ionicons name="trash" size={30} color="red" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('AddTaskScreen', { 
                    routineId: routine.id, 
                    task: item,  
                    reloadTasks: loadRoutineTasks 
                })}>
                    <Ionicons name="create" size={30} color="#000" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

useEffect(() => {
    console.log("🔄 Refresh Flag Changed: Re-rendering UI...");
    setTasks((prev) => [...prev]); // Forces FlatList to re-render
}, [refreshFlag]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
<View style={[styles.headerContainer, { backgroundColor: routine.color }]}>
  {/* Back Button (Left-Aligned, Green Text) */}
  <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
    <Ionicons name="arrow-back" size={28} color="#000" />
    <Text style={styles.backButtonText}>Back</Text>
</TouchableOpacity>

  {/* Routine Name (Now below and wraps) */}
  <View style={styles.headerTitleContainer}>
  <Text style={styles.headerTitle}>{routine.emoji}</Text>
</View>
</View>
<FlatList
  ref={flatListRef}
  initialNumToRender={10} // Ensures enough items are preloaded
  onScrollToIndexFailed={(info) => {
    console.warn("Scroll to index failed:", info);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true }); // Scroll to top if index is out of range
  }}
        data={[...tasks, { id: 'add-new', stepNumber: tasks.length + 1 }]}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) =>
          item.id === 'add-new' ? (
            <TouchableOpacity style={styles.addTaskContainer} onPress={navigateToAddTask}>
  <Ionicons name="add-circle-outline" size={40} color="#4CAF50" />
  <Text style={styles.addTaskText}>Add New Task</Text>
</TouchableOpacity>
          ) : (
            renderTaskItem({ item, index })
          )
        }
        pagingEnabled
showsVerticalScrollIndicator={false}
snapToInterval={SCREEN_HEIGHT*0.9+15} // Adjusted to account for spacing
snapToAlignment="start"
decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F2', marginTop: 40 },
  taskContainer: {
    height: SCREEN_HEIGHT * 0.9, // 🔥 Slightly smaller than full screen
    width: '90%', // 🔥 Reduce width slightly for aesthetic spacing
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
    borderRadius: 20, // 🔥 Rounded corners for a more inviting look
    marginVertical: 10, // 🔥 Space between tasks
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
    alignSelf: 'center',
  },
  taskNameText: {
    fontSize: 26, // 🔥 Make task name even bigger
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    marginBottom: 20, // 🔥 Create more space below the name
    marginTop: -100, // 🔥 Move the name higher in the container
  },
  taskDescriptionText: {
    fontSize: 18, // 🔥 Slightly bigger for better readability
    color: '#444', // 🔥 Slightly darker for contrast
    textAlign: 'center',
    paddingHorizontal: 25, // 🔥 More space around text
    lineHeight: 24, // 🔥 Improve spacing between lines
    marginBottom: 25, // 🔥 More space before the duration
  },
  taskDurationText: {
    fontSize: 18, // 🔥 Keep it the same size
    fontWeight: '600',
    color: '#4A90E2', // 🔥 Change to blue for a calming effect
    textAlign: 'center',
    marginBottom: 30, // 🔥 Space out from the done button
    marginTop: 15
  },
//   motivationText: { fontSize: 18, textAlign: 'center', marginTop: 10 },
  doneButton: {
    paddingVertical: 20, // 🔥 Increase vertical padding for a bigger button
    paddingHorizontal: 40, // 🔥 Make it wider
    borderRadius: 12, // 🔥 Slightly more rounded
    marginTop: 20, // 🔥 More spacing above
    marginBottom: 20, // 🔥 Space it out from bottom elements
  },
  doneButtonText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontSize: 18, // 🔥 Make text inside the button larger
  },
  addTaskContainer: {
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTaskText: { fontSize: 20, color: '#4CAF50', fontWeight: 'bold' },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    // backgroundColor: '#000', // ✅ Black button
    // paddingVertical: 0, // 🔥 Add some padding for a nicer button feel
    paddingHorizontal: 10,
    borderRadius: 10, // 🔥 Round the button edges
    marginLeft: 0,
    marginBottom: 0,
    marginTop: 5, // 🔥 Slightly closer to the routine name
},
  backButtonText: {
    fontSize: 18,
    marginLeft: 4,
    color: '#000',  // ✅ Black text for "Back"
  },
  reorderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    backgroundColor: '#F2F2F2',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 15,
    width: '100%',
  },
  orderInput: {
    width: 50,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 18,
  },
  headerContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 1, // 🔥 Smaller height
    paddingHorizontal: 10,
    backgroundColor: '#F9F9F9',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    borderRadius: 15, // ✅ Rounded header edges
    marginHorizontal: 10, // 🔥 Add some space on the sides
    marginTop: 10, // 🔥 Slightly lowered
    // marginBottom: 10,
},
  
  headerTitle: {
    fontSize: 35,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',   // 🔥 Center text
    flexWrap: 'wrap',      // 🔥 Wrap long text
    paddingHorizontal: 20,
    marginBottom: 10 // 🔥 Adds spacing for better wrapping
  },
  headerTitleContainer: {
    alignItems: 'center',
    width: '100%',
    marginTop: 0, // ✅ Moves it closer to the back button
},
  taskActionContainer: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    gap: 10,
  },
  stepNumberContainer: {
    backgroundColor: '#4CAF50', // 🔥 Green background for visibility
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepNumberText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF', // 🔥 White text for contrast
  },
  motivationText: {
    fontSize: 18,
    color: '#4CAF50', // 🔥 Orange for motivation
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 10,
    paddingHorizontal: 15,
},
refreshMotivationButton: {
    position: 'absolute',
    top: 12,
    right: 90, // Position next to delete & edit
    backgroundColor: 'transparent',
    padding: 5,
},
});

export default RoutineActionScreen;