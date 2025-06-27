import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getUniversalTime } from './dateUtils';
import Constants from 'expo-constants';

const GptPrompterScreen = () => {
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false); // Loading state for GPT thinking
  const currentDate = getUniversalTime().fullDate;

  const systemMessage = {
    role: 'system',
    content: `You are integrated into a wellness app that helps users create and manage custom goals.
    Each goal can be classified under one of 8 dimensions: Physical, Mental, Social, Spiritual, Financial, Environmental, Occupational, and Intellectual.
    Always ensure that you gather enough information to create and schedule these goals accurately.
    Ask the user how granular they want the goals to be (weekly subgoals or daily subgoals), then plan each day/week/month's subgoals for the user.
    Always double check for confirmation before proceeding further.
    Keep each response very short.
    Ask lots and lots of follow-up questions, get every detail imaginable.
    When scheduling tasks, use the current real-time date in the Pacific Time Zone (${currentDate}) as a reference for setting the start date and determining when tasks should recur.

    If the user is unsure or does not know what goal to set, offer relevant suggestions based on the 8 Dimensions of wellness and their current state. Encourage them to explore different goals that align with their needs or feelings. Use questions or examples to help guide them toward selecting a goal that fits into their wellness plan.

    Be extremely detailed in your plans. Ensure that every aspect of the goal, including day-to-day or week-to-week planning, is specified. 
    Stay specific to the goal at hand, do not broaden the scope. Be as thorough as possible while only considering the goal in question.`,
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear the conversation? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setConversation([]);
            setUserInput('');
          },
        },
      ]
    );
  };

  const getGptResponse = async (conversation) => {
    // Get API key from environment variables
    const apiKey = Constants.expoConfig?.extra?.openaiApiKey;
    
    if (!apiKey) {
      console.error('OpenAI API key not found in environment variables');
      return 'Configuration error: API key not found. Please check your environment setup.';
    }

    setLoading(true);  // Show loading animation while GPT is thinking
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [systemMessage, ...conversation.map(message => ({
            role: message.isUser ? 'user' : 'assistant',
            content: message.text,
          }))],
        }),
      });

      const data = await response.json();
      setLoading(false);  // Stop loading animation once response is received
      return data.choices[0].message.content;
    } catch (error) {
      setLoading(false);
      console.error('Error fetching GPT response:', error);
      return 'There was an issue getting a response from GPT.';
    }
  };

  const handleSend = async () => {
    if (userInput.trim() === '') return;

    const newConversation = [...conversation, { text: userInput, isUser: true }];
    setConversation(newConversation);
    setUserInput('');

    // Get GPT's response
    const gptResponse = await getGptResponse(newConversation);
    setConversation(prev => [...prev, { text: gptResponse, isUser: false }]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <View style={styles.mainContent}>
        <ScrollView style={styles.conversationContainer} contentContainerStyle={{ paddingBottom: 80 }}>
          {conversation.length === 0 && (
            <View style={styles.welcomeMessage}>
              <Ionicons name="chatbubbles-outline" size={60} color="#00BFFF" />
              <Text style={styles.welcomeText}>Start a conversation with your AI wellness assistant!</Text>
              <Text style={styles.welcomeSubtext}>Ask about goal planning, wellness tips, or get personalized advice.</Text>
            </View>
          )}
          
          {conversation.map((message, index) => (
            <View key={index} style={[styles.messageBubble, message.isUser ? styles.userBubble : styles.gptBubble]}>
              <Text style={message.isUser ? styles.userText : styles.gptText}>{message.text}</Text>
            </View>
          ))}

          {/* Show loading animation when GPT is thinking */}
          {loading && <ActivityIndicator size="large" color="#00BFFF" />}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your long-term goal..."
            placeholderTextColor="#888"
            value={userInput}
            onChangeText={setUserInput}
            multiline
          />
          {conversation.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Ionicons name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginTop: 40,
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  conversationContainer: {
    flex: 1,
    padding: 20,
  },
  welcomeMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  messageBubble: {
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#00BFFF',
    alignSelf: 'flex-end',
  },
  gptBubble: {
    backgroundColor: '#EAEAEA',
    alignSelf: 'flex-start',
  },
  userText: {
    color: '#fff',
    fontSize: 16,
  },
  gptText: {
    color: '#333',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    fontSize: 16,
    color: '#333',
    maxHeight: 100,
  },
  clearButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#00BFFF',
    borderRadius: 50,
    padding: 10,
  },
});

export default GptPrompterScreen;