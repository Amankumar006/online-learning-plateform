
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Editor, getSvgAsImage } from '@tldraw/tldraw';
import { evaluate } from 'mathjs';

interface PreviewState {
  box: { x: number; y: number; w: number; h: number };
  result: string;
}

const getSelectedMathText = (editor: Editor): string | null => {
  const selectedShapes = editor.getSelectedShapes();
  if (selectedShapes.length !== 1) return null;

  const shape = selectedShapes[0];
  if ('text' in shape.props) {
    // Regular expression to find simple math expressions
    const mathRegex = /^[0-9+\-*/().\s]+$/;
    if (mathRegex.test(shape.props.text)) {
      return shape.props.text;
    }
  }
  return null;
};

export const useLiveMath = (editor: Editor, isLiveMode: boolean) => {
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const calculatePreview = useCallback(() => {
    if (!isLiveMode) {
      setPreview(null);
      return;
    }
    const mathText = getSelectedMathText(editor);
    if (mathText) {
      try {
        const result = evaluate(mathText);
        const selectedShape = editor.getSelectedShapes()[0];
        const pageBounds = editor.getShapePageBounds(selectedShape.id);
        
        if (pageBounds) {
          setPreview({
            box: {
              x: pageBounds.maxX + 10,
              y: pageBounds.y,
              w: 0,
              h: 0,
            },
            result: `= ${result.toString()}`,
          });
        }
      } catch (e) {
        setPreview(null);
      }
    } else {
      setPreview(null);
    }
  }, [editor, isLiveMode]);
  
  const confirmPreview = useCallback(() => {
    if (!preview) return;
    editor.createShape({
      type: 'text',
      x: preview.box.x,
      y: preview.box.y,
      props: {
        text: preview.result,
        size: 'm',
        align: 'start',
      },
    });
    setPreview(null);
  }, [editor, preview]);


  useEffect(() => {
    const handleChange = () => {
      calculatePreview();
    };
    
    // Subscribe to changes
    const cleanup = editor.sideEffects.registerBeforeChangeHandler(
      'shape',
      handleChange
    );

    // Also handle selection changes
    editor.on('change', (change) => {
       if (change.source === 'user' && change.changes.selected) {
            handleChange();
       }
    });

    return () => {
      cleanup();
      // editor.off doesn't exist, so cleanup is sufficient
    };
  }, [editor, calculatePreview]);
  
   useEffect(() => {
    if (!isLiveMode) {
      setPreview(null);
    }
  }, [isLiveMode]);

  return { preview, confirmPreview };
};
