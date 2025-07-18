
"use client";

import { Editor, useValue } from "tldraw";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Hand, Pencil, Eraser, RectangleHorizontal, ArrowRight } from "lucide-react";

interface CanvasToolbarProps {
  editor: Editor | null;
}

const tools = [
  { id: "select", icon: <Hand />, label: "Select" },
  { id: "draw", icon: <Pencil />, label: "Pencil" },
  { id: "eraser", icon: <Eraser />, label: "Eraser" },
  { id: "geo-rectangle", icon: <RectangleHorizontal />, label: "Rectangle" },
  { id: "arrow", icon: <ArrowRight />, label: "Arrow" },
];

export default function CanvasToolbar({ editor }: CanvasToolbarProps) {
  const activeToolId = useValue(
    "current tool id",
    () => editor?.getCurrentToolId(),
    [editor]
  );
  
  if (!editor) {
    return null;
  }

  return (
    <div className="absolute top-1/2 -translate-y-1/2 left-4 z-40">
      <div className="flex flex-col gap-1 p-2 rounded-lg bg-background border shadow-xl">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={activeToolId === tool.id ? "secondary" : "ghost"}
            size="icon"
            onClick={() => editor.setCurrentTool(tool.id as any)}
            title={tool.label}
          >
            {tool.icon}
          </Button>
        ))}
      </div>
    </div>
  );
}
