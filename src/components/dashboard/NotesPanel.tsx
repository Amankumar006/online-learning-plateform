
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Folder, Pin, PinOff, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUtilitySidebar } from '@/hooks/use-utility-sidebar';
import { Card, CardContent } from '../ui/card';
import { format } from 'date-fns';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Note, getNotesListener, addNote, deleteNote, updateNote } from '@/lib/data';

export default function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const createNoteRef = useRef<HTMLDivElement>(null);
  const { openPanel } = useUtilitySidebar();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setNotes([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (userId && openPanel === 'notes') {
      setIsLoading(true);
      const unsubscribeNotes = getNotesListener(userId, (newNotes) => {
        setNotes(newNotes);
        setIsLoading(false);
      });
      return () => unsubscribeNotes();
    }
  }, [userId, openPanel]);

  const handleSaveNote = async () => {
    if (!userId || (!newNoteContent.trim() && !newNoteTitle.trim())) {
      setIsCreating(false);
      return;
    }
    const newNoteData = {
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      isPinned: false,
    };
    await addNote(userId, newNoteData);
    setNewNoteTitle('');
    setNewNoteContent('');
    setIsCreating(false);
  };
  
  const handleDeleteNote = (noteId: string) => {
    if (!userId) return;
    deleteNote(userId, noteId);
  };
  
  const togglePinNote = (noteId: string, currentPinStatus: boolean) => {
    if (!userId) return;
    updateNote(userId, noteId, { isPinned: !currentPinStatus });
  };
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (createNoteRef.current && !createNoteRef.current.contains(event.target as Node)) {
        if(isCreating) handleSaveNote();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreating, newNoteTitle, newNoteContent, userId]);

  const pinnedNotes = notes.filter(n => n.isPinned);
  const otherNotes = notes.filter(n => !n.isPinned);

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
              className="w-full flex items-center gap-4 p-3 rounded-lg border shadow-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setIsCreating(true)}
              disabled={!userId || isLoading}
            >
              <Plus className="h-5 w-5" />
              <span className="text-muted-foreground">Take a note...</span>
            </button>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <AnimatePresence>
          {isLoading ? (
             <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center text-center h-full p-4 text-muted-foreground"
            >
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </motion.div>
          ) : !userId ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center text-center h-full p-4 text-muted-foreground"
            >
              <Folder className="h-24 w-24 text-primary/20 mb-4" />
              <h3 className="font-semibold text-lg text-foreground">Please log in</h3>
              <p className="text-sm">Log in to create and view your notes.</p>
            </motion.div>
          ) : notes.length === 0 ? (
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

const NoteCard = ({note, onDelete, onPin}: {note: Note, onDelete: (id: string) => void, onPin: (id: string, currentPinStatus: boolean) => void}) => {
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
                    <p className="text-xs text-muted-foreground pt-2">{format(note.createdAt.toDate(), 'MMM d, yyyy')}</p>
                </CardContent>
            </Card>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPin(note.id, note.isPinned)}>
                    {note.isPinned ? <PinOff className="h-4 w-4 text-primary"/> : <Pin className="h-4 w-4" />}
                 </Button>
                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(note.id)}>
                    <Trash2 className="h-4 w-4 text-destructive"/>
                 </Button>
            </div>
        </motion.div>
    )
}
