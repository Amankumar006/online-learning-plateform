
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Folder, Pin, PinOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUtilitySidebar } from '@/hooks/use-utility-sidebar';
import { Card, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  isPinned: boolean;
}

const NOTES_STORAGE_KEY = 'adapt-ed-notes';

export default function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const createNoteRef = useRef<HTMLDivElement>(null);
  const { openPanel } = useUtilitySidebar();

  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem(NOTES_STORAGE_KEY);
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error("Failed to load notes from local storage", error);
      localStorage.removeItem(NOTES_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (openPanel === 'notes') {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    }
  }, [notes, openPanel]);

  const handleSaveNote = () => {
    if (!newNoteContent.trim() && !newNoteTitle.trim()) {
      setIsCreating(false);
      return;
    }
    const newNote: Note = {
      id: `note_${Date.now()}`,
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      createdAt: Date.now(),
      isPinned: false,
    };
    setNotes(prev => [newNote, ...prev]);
    setNewNoteTitle('');
    setNewNoteContent('');
    setIsCreating(false);
  };
  
  const handleDeleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
  };
  
  const togglePinNote = (noteId: string) => {
    setNotes(prev => prev.map(note => note.id === noteId ? { ...note, isPinned: !note.isPinned } : note));
  };
  
  // Close the create note box when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (createNoteRef.current && !createNoteRef.current.contains(event.target as Node)) {
        if(isCreating) handleSaveNote();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreating, newNoteTitle, newNoteContent]);


  const pinnedNotes = notes.filter(n => n.isPinned).sort((a,b) => b.createdAt - a.createdAt);
  const otherNotes = notes.filter(n => !n.isPinned).sort((a,b) => b.createdAt - a.createdAt);

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="p-4 border-b">
        <div ref={createNoteRef}>
          {isCreating ? (
            <Card className="shadow-lg">
              <CardContent className="p-3 space-y-2">
                <Input
                  placeholder="Title"
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base font-semibold"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  autoFocus
                />
                <Textarea
                  placeholder="Take a note..."
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                />
                <div className="flex justify-end">
                    <Button variant="ghost" onClick={handleSaveNote}>Close</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <button
              className="w-full flex items-center gap-4 p-3 rounded-lg border shadow-sm hover:bg-muted"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-5 w-5" />
              <span className="text-muted-foreground">Take a note...</span>
            </button>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <AnimatePresence>
          {notes.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center text-center h-full p-4 text-muted-foreground"
            >
              <Folder className="h-24 w-24 text-primary/20 mb-4" />
              <h3 className="font-semibold text-lg text-foreground">No notes yet</h3>
              <p className="text-sm">Your notes will show up here.</p>
            </motion.div>
          ) : (
            <div className="p-4">
                 {pinnedNotes.length > 0 && (
                    <div className="mb-6">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 px-2">Pinned</h4>
                        <div className="space-y-3">
                            {pinnedNotes.map(note => <NoteCard key={note.id} note={note} onDelete={handleDeleteNote} onPin={togglePinNote} />)}
                        </div>
                    </div>
                 )}
                 {otherNotes.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 px-2">Others</h4>
                        <div className="space-y-3">
                            {otherNotes.map(note => <NoteCard key={note.id} note={note} onDelete={handleDeleteNote} onPin={togglePinNote} />)}
                        </div>
                    </div>
                 )}
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}

const NoteCard = ({note, onDelete, onPin}: {note: Note, onDelete: (id: string) => void, onPin: (id: string) => void}) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="group relative"
        >
            <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-2">
                    {note.title && <h4 className="font-semibold">{note.title}</h4>}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-muted-foreground pt-2">{format(note.createdAt, 'MMM d, yyyy')}</p>
                </CardContent>
            </Card>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPin(note.id)}>
                    {note.isPinned ? <PinOff className="h-4 w-4 text-primary"/> : <Pin className="h-4 w-4" />}
                 </Button>
                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(note.id)}>
                    <Trash2 className="h-4 w-4 text-destructive"/>
                 </Button>
            </div>
        </motion.div>
    )
}
