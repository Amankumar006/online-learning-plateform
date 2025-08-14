"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Bot, User, Loader2, Send, Mic, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUser, ProactiveSuggestion, clearProactiveSuggestion, getLessons, getConversationMemory, generatePersonalizedPrompts, saveConversationSession, updateConversationPatterns } from '@/lib/data';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { buddyChatStream } from '@/ai/flows/buddy-chat';
import { Persona } from '@/ai/schemas/buddy-schemas';
import { generateAudioFromText } from '@/ai/flows/generate-audio-from-text';
import { Timestamp } from 'firebase/firestore';

import { BuddySidebar, Personas } from '@/components/buddy-ai/BuddySidebar';
import { MessageList } from '@/components/buddy-ai/MessageList';
import { WelcomeScreen } from '@/components/buddy-ai/WelcomeScreen';
import { BuddyInputForm } from '@/components/buddy-ai/BuddyInputForm';

export interface Message {
  role: 'user' | 'model';
  content: string;
  suggestions?: string[];
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  persona: Persona;
}

export default function BuddyAIPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Add state for user progress and lessons data
  const [userProgress, setUserProgress] = useState<any>(null);
  const [availableLessons, setAvailableLessons] = useState<any[]>([]);

  // Add session tracking state
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionTopics, setSessionTopics] = useState<string[]>([]);
  const [sessionToolsUsed, setSessionToolsUsed] = useState<string[]>([]);

  const [playingMessageIndex, setPlayingMessageIndex] = useState<number | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { toast } = useToast();

  // Move activeConversation memoization before the callbacks that use it
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  // Session tracking functions
  const startNewSession = useCallback(() => {
    setSessionStartTime(new Date());
    setSessionTopics([]);
    setSessionToolsUsed([]);
  }, []);

  const endSession = useCallback(async () => {
    if (!user || !sessionStartTime || !activeConversation) return;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - sessionStartTime.getTime()) / 1000);

    // Only save sessions longer than 30 seconds
    if (duration < 30) return;

    try {
      await saveConversationSession({
        userId: user.uid,
        persona: activeConversation.persona,
        title: activeConversation.title,
        messages: activeConversation.messages.map((msg, index) => ({
          id: `msg_${index}`,
          role: msg.role,
          content: msg.content,
          timestamp: Timestamp.fromDate(new Date(sessionStartTime.getTime() + (index * 30000))), // Approximate timestamps
          mediaContent: [],
          context: {
            topicTags: sessionTopics,
            toolsUsed: sessionToolsUsed,
          }
        })),
        startTime: Timestamp.fromDate(sessionStartTime),
        endTime: Timestamp.fromDate(endTime),
        duration,
        topicsCovered: sessionTopics,
        toolsUsed: sessionToolsUsed,
      });

      // Update conversation patterns
      await updateConversationPatterns(user.uid, {
        topics: sessionTopics,
        toolsUsed: sessionToolsUsed,
        duration,
        messageCount: activeConversation.messages.length,
      });

    } catch (error) {
      console.error("Error saving session:", error);
    }
  }, [user, sessionStartTime, activeConversation, sessionTopics, sessionToolsUsed]);

  // Helper function to extract topics from AI response
  const extractTopicsFromResponse = useCallback((content: string): string[] => {
    const topics: string[] = [];
    const commonTopics = [
      'python', 'javascript', 'react', 'math', 'algebra', 'calculus', 'physics',
      'chemistry', 'biology', 'history', 'english', 'programming', 'algorithms',
      'data structures', 'machine learning', 'artificial intelligence', 'databases',
      'web development', 'mobile development', 'science', 'literature'
    ];

    const text = content.toLowerCase();
    commonTopics.forEach(topic => {
      if (text.includes(topic)) {
        topics.push(topic);
      }
    });

    return topics;
  }, []);

  // Enhanced handleSend with session tracking
  const handleSend = useCallback(async (prompt?: string) => {
    const messageToSend = prompt || input;
    if (!messageToSend.trim() || !user || !activeConversation) return;

    // Start session if not already started
    if (!sessionStartTime) {
      startNewSession();
    }

    const userMessage: Message = { role: 'user', content: messageToSend };

    setConversations(prev => prev.map(c => {
      if (c.id === activeConversationId) {
        const newMessages = c.messages.map(m => ({ ...m, suggestions: undefined }));
        const isNewChat = c.messages.length === 0;
        const newTitle = isNewChat ? messageToSend.substring(0, 40) + (messageToSend.length > 40 ? '...' : '') : c.title;
        return { ...c, title: newTitle, messages: [...newMessages, userMessage], createdAt: Date.now() };
      }
      return c;
    }).sort((a, b) => b.createdAt - a.createdAt));

    setInput('');
    setIsLoading(true);

    try {
      const result = await buddyChatStream({
        userMessage: messageToSend,
        history: activeConversation.messages.map(msg => ({ role: msg.role, content: msg.content })),
        userId: user.uid,
        persona: activeConversation.persona,
        userProgress: userProgress,
        availableLessons: availableLessons
      });

      const isError = result.type === 'error';
      const assistantMessage: Message = { role: 'model', content: result.content, suggestions: result.suggestions, isError };

      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return { ...c, messages: [...c.messages, assistantMessage] };
        }
        return c;
      }));

      // Track topics and tools from the AI response
      if (result.type === 'response') {
        // Extract topics from the response (you can enhance this with better NLP)
        const detectedTopics = extractTopicsFromResponse(result.content);
        setSessionTopics(prev => [...new Set([...prev, ...detectedTopics])]);

        // Track tool usage if available
        if (result.suggestions) {
          setSessionToolsUsed(prev => [...new Set([...prev, 'generateFollowUpSuggestions'])]);
        }
      }

    } catch (e: any) {
      console.error(e);
      const errorMessageContent = `Sorry, a critical error occurred and I could not complete your request. Please try again.\n\n> ${e.message || 'An unknown error occurred.'}`;
      const errorMessage: Message = { role: 'model', content: errorMessageContent, isError: true };
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return { ...c, messages: [...c.messages, errorMessage] };
        }
        return c;
      }));
    } finally {
      setIsLoading(false);
    }
  }, [input, user, activeConversation, sessionStartTime, startNewSession, activeConversationId, userProgress, availableLessons, extractTopicsFromResponse]);

  // End session when conversation changes or component unmounts
  useEffect(() => {
    return () => {
      if (sessionStartTime) {
        endSession();
      }
    };
  }, [endSession, sessionStartTime]);

  // End session when switching conversations
  const handleSelectConversation = useCallback((id: string) => {
    if (sessionStartTime && activeConversationId !== id) {
      endSession();
    }
    setActiveConversationId(id);
    startNewSession();
  }, [sessionStartTime, activeConversationId, endSession, startNewSession]);

  const handleNewChat = useCallback((persona: Persona) => {
    if (sessionStartTime) {
      endSession();
    }
    const newId = `convo_${Date.now()}_${Math.random()}`;
    const newConversation: Conversation = { id: newId, title: "New Chat", messages: [], createdAt: Date.now(), persona };
    setConversations(prev => [newConversation, ...prev.sort((a, b) => b.createdAt - a.createdAt)]);
    setActiveConversationId(newId);
    setInput('');
    startNewSession();
  }, [sessionStartTime, endSession, startNewSession]);

  const handleDeleteConversation = useCallback((convoId: string) => {
    const newConversations = conversations.filter(c => c.id !== convoId);
    setConversations(newConversations);
    if (activeConversationId === convoId) {
      if (newConversations.length > 0) setActiveConversationId(newConversations[0].id);
      else handleNewChat('buddy');
    }
  }, [conversations, activeConversationId, handleNewChat]);

  const handleRegenerate = useCallback(async () => {
    if (!activeConversation || !user) return;
    const lastModelIndex = activeConversation.messages.findLastIndex(m => m.role === 'model');
    if (lastModelIndex === -1) return;
    const historyForRegen = activeConversation.messages.slice(0, lastModelIndex);
    const lastUserMessage = historyForRegen.at(-1);

    if (!lastUserMessage || lastUserMessage.role !== 'user') {
      toast({ variant: "destructive", title: "Cannot Regenerate", description: "Could not find the original prompt." });
      return;
    }

    // Remove the last AI response from the conversation
    setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages: historyForRegen } : c));

    // Start loading and regenerate response without adding user message again
    setIsLoading(true);

    try {
      const result = await buddyChatStream({
        userMessage: lastUserMessage.content,
        history: historyForRegen.slice(0, -1).map(msg => ({ role: msg.role, content: msg.content })), // Exclude the last user message from history
        userId: user.uid,
        persona: activeConversation.persona,
        userProgress: userProgress,
        availableLessons: availableLessons
      });

      const isError = result.type === 'error';
      const assistantMessage: Message = { role: 'model', content: result.content, suggestions: result.suggestions, isError };

      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return { ...c, messages: [...c.messages, assistantMessage] };
        }
        return c;
      }));
    } catch (e: any) {
      console.error(e);
      const errorMessageContent = `Sorry, a critical error occurred and I could not complete your request. Please try again.\n\n> ${e.message || 'An unknown error occurred.'}`;
      const errorMessage: Message = { role: 'model', content: errorMessageContent, isError: true };
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return { ...c, messages: [...c.messages, errorMessage] };
        }
        return c;
      }));
    } finally {
      setIsLoading(false);
    }
  }, [activeConversation, user, activeConversationId, userProgress, availableLessons, toast]);

  const handleProactiveSuggestion = useCallback((suggestion: ProactiveSuggestion, newConversations: Conversation[]) => {
    const newId = `convo_${Date.now()}_${Math.random()}`;
    const proactiveConversation: Conversation = {
      id: newId,
      title: `Help with ${suggestion.topic}`,
      messages: [{ role: 'model', content: suggestion.message }],
      createdAt: Date.now(),
      persona: 'buddy'
    };
    const updatedConversations = [proactiveConversation, ...newConversations];
    setConversations(updatedConversations);
    setActiveConversationId(newId);
    startNewSession();
  }, [startNewSession]);

  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition({ onSpeechEnd: () => { if (transcript) handleSend(transcript); } });

  useEffect(() => { if (transcript) setInput(transcript); }, [transcript]);

  const handleMicClick = () => { isListening ? stopListening() : startListening(); };

  const handlePlayAudio = async (text: string, index: number) => {
    if (playingMessageIndex === index) {
      audioRef.current?.pause();
      setPlayingMessageIndex(null);
      return;
    }

    setIsGeneratingAudio(index);
    setPlayingMessageIndex(index);
    try {
      const { audioDataUri } = await generateAudioFromText({ sectionTitle: '', sectionContent: text });
      if (audioRef.current) {
        audioRef.current.src = audioDataUri;
        audioRef.current.play();
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Audio Error', description: e.message });
      setPlayingMessageIndex(null);
    } finally {
      setIsGeneratingAudio(null);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setPlayingMessageIndex(null);
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, []);

  // Load user data and conversation memory
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        try {
          // Load user progress and lessons data
          const [userProfile, lessonsData, savedConvos] = await Promise.all([
            getUser(currentUser.uid),
            getLessons(),
            localStorage.getItem(`conversations_${currentUser.uid}`)
          ]);

          if (userProfile) {
            setUserProgress(userProfile.progress);
          }
          setAvailableLessons(lessonsData);

          let parsedConvos: Conversation[] = [];
          if (savedConvos) {
            try {
              if (savedConvos && savedConvos.trim().startsWith('[')) {
                const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
                parsedConvos = JSON.parse(savedConvos)
                  .map((convo: any) => ({ ...convo, messages: convo.messages || [] }))
                  .filter((convo: Conversation) => convo.createdAt && convo.createdAt > thirtyDaysAgo);
              } else {
                throw new Error("Invalid JSON format for conversations.");
              }
            } catch (e) {
              console.error("Failed to parse conversations from localStorage, clearing data.", e);
              localStorage.removeItem(`conversations_${currentUser.uid}`);
            }
          }

          if (userProfile?.proactiveSuggestion) {
            handleProactiveSuggestion(userProfile.proactiveSuggestion, parsedConvos);
            clearProactiveSuggestion(currentUser.uid).catch(console.error);
          } else {
            setConversations(parsedConvos);
            if (parsedConvos.length > 0) {
              setActiveConversationId(parsedConvos[0].id);
              startNewSession();
            } else {
              handleNewChat('buddy');
            }
          }
        } catch (error) {
          console.error("Error loading user data:", error);
          handleNewChat('buddy');
        }
      }
    });
    return () => unsubscribe();
  }, [handleProactiveSuggestion, startNewSession]);

  // Save conversations to localStorage
  useEffect(() => {
    if (user && conversations.length > 0) {
      localStorage.setItem(`conversations_${user.uid}`, JSON.stringify(conversations));
    }
  }, [conversations, user]);

  // Prevent body scroll when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="absolute inset-0 flex bg-background">
      <audio ref={audioRef} onEnded={() => setPlayingMessageIndex(null)} />

      <BuddySidebar
        user={user}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onNewChat={handleNewChat}
      />

      <div className="flex-1 flex flex-col relative">
        {/* Messages Area */}
        <div className="flex-1 relative">
          {activeConversation && activeConversation.messages.length > 0 ? (
            <MessageList
              user={user}
              conversation={activeConversation}
              isLoading={isLoading}
              playingMessageIndex={playingMessageIndex}
              isGeneratingAudio={isGeneratingAudio}
              onPlayAudio={handlePlayAudio}
              onRegenerate={handleRegenerate}
              onSendSuggestion={handleSend}
            />
          ) : (
            <div className="absolute inset-0 overflow-y-auto">
              <WelcomeScreen
                persona={activeConversation?.persona || 'buddy'}
                onSendSuggestion={handleSend}
              />
            </div>
          )}
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t bg-background/95 backdrop-blur-sm z-10">
          <BuddyInputForm
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            isLoading={isLoading}
            isListening={isListening}
            onMicClick={handleMicClick}
          />
        </div>
      </div>
    </div>
  );
}
