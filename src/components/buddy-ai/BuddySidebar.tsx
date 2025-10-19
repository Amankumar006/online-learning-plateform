"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { BookOpen, Ellipsis, Menu, Trash2, Plus, MessageSquare, Code2, Settings, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Conversation } from '@/app/dashboard/buddy-ai/page';
import type { Persona } from '@/ai/schemas/buddy-schemas';
import type { User as FirebaseUser } from 'firebase/auth';

interface BuddySidebarProps {
    user: FirebaseUser | null;
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onDeleteConversation: (id: string) => void;
    onNewChat: (persona: Persona) => void;
}

export const Personas: { id: Persona; name: string; description: string; icon: React.ReactNode; color: string; specialties: string[] }[] = [
    { 
        id: 'buddy', 
        name: 'Study Buddy', 
        description: 'Assisting with your academic questions', 
        icon: <BookOpen className="w-4 h-4" />,
        color: 'text-blue-500',
        specialties: ['General Learning', 'Study Tips', 'Motivation', 'Explanations']
    },
    { 
        id: 'mentor', 
        name: 'Code Mentor', 
        description: 'Get help with coding, debugging, and more', 
        icon: <Code2 className="w-4 h-4" />,
        color: 'text-green-500',
        specialties: ['Programming', 'Code Review', 'Algorithms', 'Best Practices']
    },
];

const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
};

const groupConversationsByDate = (convos: Conversation[]) => {
    const groups: { [key: string]: Conversation[] } = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
  
    convos.forEach(convo => {
      const convoDate = new Date(convo.createdAt);
      let key;
      if (convoDate.toDateString() === today.toDateString()) key = 'Today';
      else if (convoDate.toDateString() === yesterday.toDateString()) key = 'Yesterday';
      else key = convoDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  
      if (!groups[key]) groups[key] = [];
      groups[key].push(convo);
    });
    return groups;
};

const SidebarContent = ({ user, conversations, activeConversationId, onSelectConversation, onDeleteConversation, onNewChat }: BuddySidebarProps) => {
  const groupedConversations = groupConversationsByDate(conversations);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Chat</h2>
            <p className="text-xs text-muted-foreground">AdaptEd AI</p>
          </div>
        </div>
        
        {/* New Chat Button */}
        <Button 
          onClick={() => onNewChat('buddy')} 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors duration-300"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Personas Section */}
      <div className="p-4 border-b">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">PERSONAS</h3>
        <div className="space-y-1">
          {Personas.map(p => (
            <button
              key={p.id}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-all hover:bg-muted/50",
                p.id === 'buddy' ? "bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30" : ""
              )}
              onClick={() => onNewChat(p.id)}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300",
                p.id === 'buddy' 
                  ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" 
                  : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
              )}>
                {p.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversations History */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">HISTORY</h3>
          </div>
          
          {Object.keys(groupedConversations).length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground">Start a new chat to begin</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedConversations).map(([groupTitle, convos]) => (
                <div key={groupTitle}>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">{groupTitle}</h4>
                  <div className="space-y-1">
                    {convos.map(c => (
                      <div key={c.id} className="relative group">
                        <button
                          onClick={() => onSelectConversation(c.id)}
                          className={cn(
                            "w-full text-left p-2.5 rounded-lg transition-all flex items-start gap-3 hover:bg-muted/50",
                            c.id === activeConversationId 
                              ? 'bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30' 
                              : ''
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-300",
                            c.persona === 'mentor' 
                              ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                              : "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                          )}>
                            {c.persona === 'mentor' ? <Code2 className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{c.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.persona === 'mentor' ? 'Code Mentor' : 'Study Buddy'}
                            </p>
                          </div>
                        </button>
                        
                        {/* Delete button */}
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <AlertDialog>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md">
                                  <Ellipsis className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                    <Trash2 className="mr-2 h-3 w-3"/> Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete "{c.title}".</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteConversation(c.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function BuddySidebar(props: BuddySidebarProps) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const activeConversation = props.conversations.find(c => c.id === props.activeConversationId);
    const activePersona = Personas.find(p => p.id === activeConversation?.persona);

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden md:flex flex-col w-[280px] border-r shrink-0">
                <SidebarContent {...props} />
            </div>

            {/* Mobile Header */}
            <header className="md:hidden flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Open menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-[280px]">
                        <SheetHeader className="sr-only">
                            <SheetTitle>Navigation</SheetTitle>
                            <SheetDescription>Chat history and persona selection</SheetDescription>
                        </SheetHeader>
                        <SidebarContent 
                          {...props} 
                          onSelectConversation={(id) => { 
                            props.onSelectConversation(id); 
                            setIsSheetOpen(false); 
                          }} 
                          onNewChat={(p) => { 
                            props.onNewChat(p); 
                            setIsSheetOpen(false); 
                          }} 
                        />
                    </SheetContent>
                </Sheet>
                
                <div className="flex items-center gap-2">
                  {activePersona && (
                    <div className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-300",
                      activePersona.id === 'buddy' 
                        ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" 
                        : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                    )}>
                      {activePersona.icon}
                    </div>
                  )}
                  <span className="font-medium text-sm">
                    {activePersona?.name || 'AdaptEd AI'}
                  </span>
                </div>
                
                <Avatar className="w-8 h-8">
                    <AvatarImage src={props.user?.photoURL || ''} />
                    <AvatarFallback className="text-xs">{getInitials(props.user?.displayName)}</AvatarFallback>
                </Avatar>
            </header>
        </>
    );
}
