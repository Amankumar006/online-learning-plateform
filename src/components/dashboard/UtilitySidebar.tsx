
"use client";

import { Bot, Calculator, CheckSquare, X, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUtilitySidebar, PanelType } from '@/hooks/use-utility-sidebar';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import QuickChatPanel from './QuickChatPanel';
import TasksPanel from './TasksPanel';
import AdvancedCalculatorPanel from './AdvancedCalculatorPanel';
import NotesPanel from './NotesPanel';
import { ScrollArea } from '../ui/scroll-area';

const sidebarTools = [
  { type: 'chat' as PanelType, icon: Bot, label: 'Quick Chat' },
  { type: 'tasks' as PanelType, icon: CheckSquare, label: 'Tasks' },
  { type: 'notes' as PanelType, icon: Lightbulb, label: 'Notes' },
  { type: 'math' as PanelType, icon: Calculator, label: 'Calculator' },
];

const MathSolverPanel = () => {
    return (
        <ScrollArea className="h-full">
            <div className="p-4">
                <AdvancedCalculatorPanel />
            </div>
        </ScrollArea>
    );
};


export default function UtilitySidebar() {
  const { openPanel, togglePanel } = useUtilitySidebar();

  const renderPanelContent = () => {
    switch (openPanel) {
      case 'chat':
        return <QuickChatPanel />;
      case 'tasks':
        return <TasksPanel />;
      case 'notes':
        return <NotesPanel />;
      case 'math':
        return <MathSolverPanel />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex h-full">
        {/* Tool Icon Tray */}
        <div className="flex flex-col items-center gap-2 border-l bg-background p-2">
          <TooltipProvider delayDuration={0}>
            {sidebarTools.map(tool => (
              <Tooltip key={tool.type}>
                <TooltipTrigger asChild>
                  <Button
                    variant={openPanel === tool.type ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => togglePanel(tool.type)}
                  >
                    <tool.icon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{tool.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        {/* Sliding Panel */}
        <div
          className={cn(
            "transition-all duration-300 ease-in-out bg-background border-l shadow-lg overflow-hidden",
            openPanel ? 'w-[350px]' : 'w-0'
          )}
        >
          {openPanel && (
            <div className="h-full flex flex-col">
                 <div className="flex h-14 items-center justify-between border-b px-4">
                    <h3 className="font-semibold">{sidebarTools.find(t => t.type === openPanel)?.label}</h3>
                    <Button variant="ghost" size="icon" onClick={() => togglePanel(null)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {renderPanelContent()}
                </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
