
"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Bot, User, Loader2, Send, Mic, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUser, ProactiveSuggestion, clearProactiveSuggestion } from '@/lib/data';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { buddyChatStream } from '@/ai/flows/buddy-chat';
import { Persona } from '@/ai/schemas/buddy-schemas';
import { generateAudioFromText } from '@/ai/flows/generate-audio-from-text';

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
  
  const [playingMessageIndex, setPlayingMessageIndex] = useState<number | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { toast } = useToast();
  
  const handleSend = async (prompt?: string) => {
    const messageToSend = prompt || input;
    if (!messageToSend.trim() || !user || !activeConversation) return;

    const userMessage: Message = { role: 'user', content: messageToSend };
    
    setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
            const newMessages = c.messages.map(m => ({ ...m, suggestions: undefined }));
            const isNewChat = c.messages.length === 0;
            const newTitle = isNewChat ? messageToSend.substring(0, 40) + (messageToSend.length > 40 ? '...' : '') : c.title;
            return { ...c, title: newTitle, messages: [...newMessages, userMessage], createdAt: Date.now() };
        }
        return c;
    }).sort((a,b) => b.createdAt - a.createdAt));

    setInput('');
    setIsLoading(true);

    try {
        const result = await buddyChatStream({
            userMessage: messageToSend,
            history: activeConversation.messages.map(msg => ({ role: msg.role, content: msg.content })),
            userId: user.uid,
            persona: activeConversation.persona
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
  };


   const { isListening, transcript, startListening, stopListening } = useSpeechRecognition({ onSpeechEnd: () => { if (transcript) handleSend(transcript); }});
  
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
  
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

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
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const [userProfile, savedConvos] = await Promise.all([ getUser(currentUser.uid), localStorage.getItem(`conversations_${currentUser.uid}`) ]);
        let parsedConvos: Conversation[] = [];
        if (savedConvos) {
            try {
                // Perform a more robust check before parsing
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
            if (parsedConvos.length > 0) setActiveConversationId(parsedConvos[0].id);
            else handleNewChat('buddy');
        }
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleProactiveSuggestion]);

  useEffect(() => {
    if (user && conversations.length > 0) {
        localStorage.setItem(`conversations_${user.uid}`, JSON.stringify(conversations));
    }
  }, [conversations, user]);
  
  const handleSelectConversation = (id: string) => setActiveConversationId(id);

  const handleNewChat = (persona: Persona) => {
    const newId = `convo_${Date.now()}_${Math.random()}`;
    const newConversation: Conversation = { id: newId, title: "New Chat", messages: [], createdAt: Date.now(), persona };
    setConversations(prev => [newConversation, ...prev.sort((a, b) => b.createdAt - a.createdAt)]);
    setActiveConversationId(newId);
    setInput('');
  };
  
  const handleDeleteConversation = (convoId: string) => {
    const newConversations = conversations.filter(c => c.id !== convoId);
    setConversations(newConversations);
    if (activeConversationId === convoId) {
        if (newConversations.length > 0) setActiveConversationId(newConversations[0].id);
        else handleNewChat('buddy');
    }
  };

  const handleRegenerate = async () => {
    if (!activeConversation || !user) return;
    const lastModelIndex = activeConversation.messages.findLastIndex(m => m.role === 'model');
    if (lastModelIndex === -1) return;
    const historyForRegen = activeConversation.messages.slice(0, lastModelIndex);
    const lastUserMessage = historyForRegen.at(-1);

    if (!lastUserMessage || lastUserMessage.role !== 'user') {
        toast({ variant: "destructive", title: "Cannot Regenerate", description: "Could not find the original prompt." });
        return;
    }
    
    setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages: historyForRegen } : c));
    handleSend(lastUserMessage.content);
  };

  return (
    <div className="flex h-full w-full bg-background">
      <audio ref={audioRef} onEnded={() => setPlayingMessageIndex(null)} />
      
      <BuddySidebar 
        user={user}
        conversations={conversations} 
        activeConversationId={activeConversationId} 
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onNewChat={handleNewChat}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
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
          <WelcomeScreen
            persona={activeConversation?.persona || 'buddy'}
            onSendSuggestion={handleSend}
          />
        )}

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
  );
}
