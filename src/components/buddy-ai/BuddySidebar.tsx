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
import { BookOpen, Briefcase, Ellipsis, Menu, Trash2 } from 'lucide-react';
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
        description: 'Friendly and encouraging learning companion.', 
        icon: <BookOpen className="w-5 h-5" />,
        color: 'text-blue-500',
        specialties: ['General Learning', 'Study Tips', 'Motivation', 'Explanations']
    },
    { 
        id: 'mentor', 
        name: 'Code Mentor', 
        description: 'Expert guidance for technical questions.', 
        icon: <Briefcase className="w-5 h-5" />,
        color: 'text-purple-500',
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


const SidebarContent = ({ conversations, activeConversationId, onSelectConversation, onDeleteConversation, onNewChat }: BuddySidebarProps) => {
  const groupedConversations = groupConversationsByDate(conversations);

  return (
    <>
      <div className="p-4 border-b space-y-2">
        <h3 className="font-semibold text-sm px-2 text-muted-foreground">Start a New Chat</h3>
        {Personas.map(p => (
            <button
                key={p.id}
                className="flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                onClick={() => onNewChat(p.id)}
            >
                <div className="shrink-0 rounded-md border bg-background p-2 shadow-sm">
                    {p.icon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
            </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
            {Object.entries(groupedConversations).map(([groupTitle, convos]) => (
              <div key={groupTitle}>
                    <h3 className="text-xs font-semibold text-muted-foreground px-2 my-2">{groupTitle}</h3>
                    <div className="space-y-1">
                      {convos.map(c => (
                          <div key={c.id} className="relative group">
                              <button
                                  onClick={() => onSelectConversation(c.id)}
                                  className={cn(
                                    "w-full justify-start truncate rounded-md pr-10 text-left p-2 flex items-center gap-2 text-sm transition-colors",
                                    c.id === activeConversationId ? 'bg-secondary text-secondary-foreground font-semibold' : 'hover:bg-black/5 dark:hover:bg-white/5'
                                  )}
                              >
                                  {c.persona === 'mentor' ? <Briefcase className="mr-2 h-4 w-4 shrink-0" /> : <BookOpen className="mr-2 h-4 w-4 shrink-0" />}
                                  <span className="truncate">{c.title}</span>
                              </button>
                                <div className="absolute right-2 top-1/2 z-20 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                                    <AlertDialog>
                                        <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                                                <Ellipsis className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4"/> Delete
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
      </div>
    </>
  );
};

export function BuddySidebar(props: BuddySidebarProps) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const activePersona = Personas.find(p => p.id === props.conversations.find(c => c.id === props.activeConversationId)?.persona)?.name || 'Buddy AI';

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden md:flex flex-col w-[280px] bg-muted/50 border-r shrink-0">
                <SidebarContent {...props} />
            </div>

            {/* Mobile Sidebar (Sheet) */}
            <header className="md:hidden flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm shrink-0">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-6 w-6" />
                            <span className="sr-only">Open conversations</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 flex flex-col w-full max-w-[300px]" onInteractOutside={() => setIsSheetOpen(false)}>
                        <SheetHeader className="sr-only">
                            <SheetTitle>Conversations and Personas</SheetTitle>
                            <SheetDescription>
                                A list of your past conversations and options to start a new chat with a different AI persona.
                            </SheetDescription>
                        </SheetHeader>
                        <SidebarContent {...props} onSelectConversation={(id) => { props.onSelectConversation(id); setIsSheetOpen(false); }} onNewChat={(p) => { props.onNewChat(p); setIsSheetOpen(false); }} />
                    </SheetContent>
                </Sheet>
                <div className="font-semibold">{activePersona}</div>
                 <Avatar className="w-8 h-8">
                    <AvatarImage src={props.user?.photoURL || ''} />
                    <AvatarFallback>{getInitials(props.user?.displayName)}</AvatarFallback>
                </Avatar>
            </header>
        </>
    );
}
