"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUser, ProactiveSuggestion, clearProactiveSuggestion, getLessons, saveConversationSession, updateConversationPatterns } from '@/lib/data';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { Persona } from '@/ai/schemas/buddy-schemas';
import { generateAudioFromText } from '@/ai/flows/generate-audio-from-text';
import { Timestamp } from 'firebase/firestore';

import { BuddySidebar } from '@/components/buddy-ai/BuddySidebar';
import { EnhancedMessageList } from '@/components/buddy-ai/EnhancedMessageList';
import { WelcomeScreen } from '@/components/buddy-ai/WelcomeScreen';
import { FileUploadInputForm } from '@/components/buddy-ai/FileUploadInputForm';

export interface UploadedFile {
  id: string;
  file: File;
  type: 'image' | 'pdf' | 'document' | 'other';
  preview?: string;
  content?: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: any[]; // relaxed type for ai sdk compatibility
  createdAt: number;
  persona: Persona;
}

export default function BuddyAIPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Session / User Progress State
  const [userProgress, setUserProgress] = useState<any>(null);
  const [availableLessons, setAvailableLessons] = useState<any[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  // Audio State
  const [playingMessageIndex, setPlayingMessageIndex] = useState<number | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { toast } = useToast();

  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  // Vercel AI SDK Hook - Robust Implementation
  const chatHelpers = useChat({
    // @ts-ignore - SDK version compatibility
    api: '/api/chat',
    id: activeConversationId || 'default',
    initialMessages: activeConversation?.messages || [],
    body: {
      data: {
        userId: user?.uid,
        userProgress,
        webSearchEnabled
      }
    },
    onFinish: (message) => {
      console.log('Chat finished:', message);
      // Sync back to local conversations state for persistence
      if (activeConversationId) {
        setConversations(prev => prev.map(c => {
          if (c.id === activeConversationId) {
            return { ...c, messages: [...c.messages, message] };
          }
          return c;
        }));
      }
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  });

  // Manual state management because useChat in this version doesn't provide it
  const [input, setInput] = useState('');

  // Extract helpers with fallbacks/checks
  const { messages, sendMessage, regenerate, status } = chatHelpers;
  const isLoading = status === 'submitted' || status === 'streaming';

  // Adapter functions to match previous API usage
  const append = async (message: any) => {
    // Map experimental_attachments (Files) to files (FileList | File[])
    // SDK expects { text: string, files?: ... }
    return sendMessage({
      text: message.content,
      files: message.experimental_attachments
    });
  };

  const reload = regenerate;

  // Manual handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e?: any) => {
    e?.preventDefault?.();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  // Debug Vercel AI SDK availability
  useEffect(() => {
    console.log('[BuddyAI] useChat Debug:', {
      keys: Object.keys(chatHelpers),
      status,
      isLoading
    });
  }, [chatHelpers, status, isLoading]);

  useEffect(() => {
    if (activeConversationId && messages.length > 0) {
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          // simple title generation for new chats
          let title = c.title;
          if (c.messages.length === 0 && messages.length > 0) {
            // Get text content from message (supports both legacy and new parts format)
            const firstMessageContent = messages[0]?.parts
              ?.filter((p: any) => p.type === 'text')
              ?.map((p: any) => p.text)
              ?.join('') || (messages[0] as any)?.content || '';
            title = firstMessageContent.substring(0, 40) || "New Chat";
          }
          return { ...c, title, messages };
        }
        return c;
      }));
    }
  }, [messages, activeConversationId]);


  // Session Management
  const startNewSession = useCallback(() => {
    setSessionStartTime(new Date());
  }, []);

  const endSession = useCallback(async () => {
    // Basic session saving logic (simplified for now)
    if (!user || !sessionStartTime || !activeConversation) return;
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - sessionStartTime.getTime()) / 1000);
    if (duration < 10) return; // ignore short sessions

    try {
      await updateConversationPatterns(user.uid, {
        duration,
        messageCount: messages.length,
        topics: [], // TODO: extract topics
        toolsUsed: []
      });
    } catch (e) { console.error("Session save error", e) }

  }, [user, sessionStartTime, activeConversation, messages.length]);

  // Auth & Data Loading
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const [profile, lessons] = await Promise.all([getUser(currentUser.uid), getLessons()]);
        setUserProgress(profile?.progress);
        setAvailableLessons(lessons);

        // Load local storage conversations
        const saved = localStorage.getItem(`conversations_${currentUser.uid}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setConversations(parsed);
            if (parsed.length > 0) setActiveConversationId(parsed[0].id);
            else handleNewChat('buddy');
          } catch (e) { console.error("LS Parse Error", e); handleNewChat('buddy'); }
        } else {
          handleNewChat('buddy');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Persistence
  useEffect(() => {
    if (user && conversations.length > 0) {
      localStorage.setItem(`conversations_${user.uid}`, JSON.stringify(conversations));
    }
  }, [conversations, user]);

  // Handlers
  const handleSelectConversation = (id: string) => {
    if (activeConversationId) endSession();
    setActiveConversationId(id);
    startNewSession();
  };

  const handleNewChat = (persona: Persona) => {
    if (activeConversationId) endSession();
    const newId = `convo_${Date.now()}`;
    const newConvo: Conversation = {
      id: newId,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      persona
    };
    setConversations(prev => [newConvo, ...prev]);
    setActiveConversationId(newId);
    startNewSession();
  };

  const handleDeleteConversation = (id: string) => {
    const remaining = conversations.filter(c => c.id !== id);
    setConversations(remaining);
    if (activeConversationId === id) {
      if (remaining.length > 0) setActiveConversationId(remaining[0].id);
      else handleNewChat('buddy');
    }
  };

  // Wrapped Send Handler to support files
  const onSendWrapper = async (text?: string, files?: UploadedFile[]) => {
    if (!activeConversationId) return;

    const attachments = files?.map(f => {
      // Convert to base64 data URI for immediate display and sending
      // Vercel AI SDK 'experimental_attachments' expects full URLs or data URIs
      return f.preview; // Helper already created preview string (data:image/...)
    }).filter(Boolean) as string[];

    if (text || (attachments && attachments.length > 0)) {
      await append({
        role: 'user',
        content: text || '',
        experimental_attachments: files?.map(f => f.file), // Pass original File objects to SDK
      });
      setInput(''); // Clear input after sending
    }
  };

  // Speech
  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition({
    onSpeechEnd: () => { if (transcript) onSendWrapper(transcript); }
  });
  useEffect(() => { if (transcript) setInput(transcript); }, [transcript]);

  // Audio Playback
  const handlePlayAudio = async (text: string, index: number) => {
    if (playingMessageIndex === index) { audioRef.current?.pause(); setPlayingMessageIndex(null); return; }
    setIsGeneratingAudio(index);
    setPlayingMessageIndex(index);
    try {
      const { audioDataUri } = await generateAudioFromText({ sectionTitle: '', sectionContent: text });
      if (audioRef.current) { audioRef.current.src = audioDataUri; audioRef.current.play(); }
    } catch (e: any) { toast({ variant: 'destructive', title: 'Audio Error', description: e.message }); setPlayingMessageIndex(null); }
    finally { setIsGeneratingAudio(null); }
  };

  return (
    <div className="absolute inset-0 flex flex-col md:flex-row bg-background">
      <audio ref={audioRef} onEnded={() => setPlayingMessageIndex(null)} />

      <BuddySidebar
        user={user}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onNewChat={handleNewChat}
      />

      <div className="flex-1 flex flex-col relative min-h-0">
        <div className="flex-1 relative min-h-0">
          {messages.length > 0 ? (
            <EnhancedMessageList
              user={user}
              conversation={{ ...activeConversation!, messages: messages as any }} // Cast for compat
              isLoading={isLoading}
              playingMessageIndex={playingMessageIndex}
              isGeneratingAudio={isGeneratingAudio}
              onPlayAudio={handlePlayAudio}
              onRegenerate={() => reload()}
              onSendSuggestion={(text) => onSendWrapper(text)}
            />
          ) : (
            <div className="absolute inset-0 overflow-y-auto">
              <WelcomeScreen
                persona={activeConversation?.persona || 'buddy'}
                onSendSuggestion={(text) => onSendWrapper(text)}
                onNewChat={handleNewChat}
              />
            </div>
          )}
        </div>

        <div className="bg-background z-10 shrink-0">
          <FileUploadInputForm
            input={input}
            onInputChange={(val) => setInput(val)}
            onSend={(text, files) => onSendWrapper(text, files)}
            isLoading={isLoading}
            isListening={isListening}
            onMicClick={isListening ? stopListening : startListening}
            webSearchEnabled={webSearchEnabled}
            onWebSearchToggle={() => setWebSearchEnabled(!webSearchEnabled)}
          />
        </div>
      </div>
    </div>
  );
}
