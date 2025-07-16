
"use client";

import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, Unsubscribe, doc, collection, writeBatch } from 'firebase/firestore';
import { useEditor, TLStore, TLRecord, TLEventInfo } from '@tldraw/tldraw';
import { getShapesCollectionRef, getCanvasSession, addShape, updateShape, deleteShape, CanvasSession } from '@/lib/data';
import { debounce } from 'lodash';

// A map to store debounced update functions for each shape ID
const debouncedUpdates = new Map<string, (shape: TLRecord) => void>();

export function useCanvasSession(sessionId: string) {
  const editor = useEditor();
  const [session, setSession] = useState<CanvasSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial session data
  useEffect(() => {
    const fetchSession = async () => {
      setIsLoading(true);
      const sessionData = await getCanvasSession(sessionId);
      setSession(sessionData);
      setIsLoading(false);
    };
    fetchSession();
  }, [sessionId]);

  // Set up real-time listener for shapes and editor events
  useEffect(() => {
    if (!editor || !session) return;

    let unsubscribe: Unsubscribe | undefined;
    const isHost = session.ownerId === editor.user.getId();
    let store: TLStore;

    // Wait for the editor to be ready and have a store
    const editorReadyInterval = setInterval(() => {
      const currentStore = editor.getStore();
      if (currentStore) {
        store = currentStore;
        clearInterval(editorReadyInterval);
        setupListeners();
      }
    }, 100);

    const setupListeners = () => {
      // Listener for changes from Firestore
      unsubscribe = onSnapshot(getShapesCollectionRef(sessionId), (snapshot) => {
        if (store) {
           snapshot.docChanges().forEach((change) => {
              const shapeData = change.doc.data() as TLRecord;
              if (change.type === 'added' || change.type === 'modified') {
                // Use store.put to add or update records without triggering a full re-render
                store.put([shapeData]);
              } else if (change.type === 'removed') {
                store.remove([shapeData.id as any]);
              }
          });
        }
      });

      // Listener for local editor changes (only for the host)
      if (isHost) {
        const handleEditorChange = (change: TLEventInfo) => {
          if (change.source !== 'user') return; // Only process user-initiated changes

           for (const record of Object.values(change.changes.added)) {
             if (record.typeName === 'shape') {
               addShape(sessionId, record);
             }
           }
          
           for (const [from, to] of Object.values(change.changes.updated)) {
              if (from.typeName === 'shape') {
                // Debounce updates to avoid overwhelming Firestore during rapid changes (e.g., dragging)
                let debouncedUpdate = debouncedUpdates.get(to.id);
                if (!debouncedUpdate) {
                    debouncedUpdate = debounce((shape: TLRecord) => {
                        updateShape(sessionId, shape);
                    }, 200); // 200ms debounce interval
                    debouncedUpdates.set(to.id, debouncedUpdate);
                }
                debouncedUpdate(to);
              }
           }

           for (const record of Object.values(change.changes.removed)) {
              if (record.typeName === 'shape') {
                deleteShape(sessionId, record.id);
              }
           }
        };

        editor.on('change', handleEditorChange);
        // Cleanup function for the host listener
        return () => {
          editor.off('change', handleEditorChange);
          if (unsubscribe) unsubscribe();
          // Clear any pending debounced updates on unmount
          debouncedUpdates.forEach(func => func.flush());
        };
      }
    };
    
    // Cleanup function
    return () => {
      clearInterval(editorReadyInterval);
      if (unsubscribe) unsubscribe();
    };

  }, [editor, session, sessionId]);


  return { session, isLoading };
}
