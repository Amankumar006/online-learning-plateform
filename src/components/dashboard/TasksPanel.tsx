
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2, CheckSquare } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useUtilitySidebar } from '@/hooks/use-utility-sidebar';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

type FormValues = {
  taskText: string;
};

const TASKS_STORAGE_KEY = 'adapt-ed-tasks';

export default function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { openPanel } = useUtilitySidebar();

  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } catch (error) {
        console.error("Failed to load tasks from local storage", error);
        localStorage.removeItem(TASKS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    // Only save when the panel is visible to avoid unnecessary writes
    if(openPanel === 'tasks') {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks, openPanel]);

  const { register, handleSubmit, reset } = useForm<FormValues>();

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    if (!data.taskText.trim()) return;
    const newTask: Task = {
      id: `task_${Date.now()}`,
      text: data.taskText,
      completed: false,
    };
    setTasks((prev) => [newTask, ...prev]);
    reset();
  };

  const toggleTaskCompletion = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };
  
  const activeTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 border-b">
            <div className="relative">
                <CheckSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    {...register('taskText')}
                    placeholder="Add a task"
                    className="pl-10 h-12 rounded-full"
                    autoComplete="off"
                />
                 <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full">
                    <Plus className="h-4 w-4"/>
                    <span className="sr-only">Add Task</span>
                </Button>
            </div>
        </form>

        <ScrollArea className="flex-1">
            {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center h-full p-4">
                    <Image
                        src="https://www.gstatic.com/tasks/v2/static/illo_tasks_complete_2x.png"
                        width={200}
                        height={200}
                        alt="All tasks complete"
                        className="w-48 h-48"
                        data-ai-hint="tasks complete illustration"
                    />
                    <h3 className="font-semibold mt-4">All tasks complete</h3>
                    <p className="text-sm text-muted-foreground">Nice work!</p>
                </div>
            ) : (
                <div className="p-4 space-y-2">
                     {activeTasks.map(task => (
                        <div key={task.id} className="group flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                            <Checkbox
                                id={task.id}
                                checked={task.completed}
                                onCheckedChange={() => toggleTaskCompletion(task.id)}
                            />
                            <label htmlFor={task.id} className="flex-1 text-sm cursor-pointer">{task.text}</label>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => deleteTask(task.id)}>
                                <Trash2 className="h-4 w-4 text-destructive"/>
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </ScrollArea>
        
        {completedTasks.length > 0 && (
            <div className="p-2 border-t">
                 <Accordion type="single" collapsible>
                    <AccordionItem value="completed" className="border-b-0">
                        <AccordionTrigger className="text-sm font-medium py-2 px-2 hover:no-underline rounded-md hover:bg-muted">
                            Completed ({completedTasks.length})
                        </AccordionTrigger>
                        <AccordionContent className="p-2 pt-0">
                            <div className="space-y-2">
                               {completedTasks.map(task => (
                                    <div key={task.id} className="group flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                                        <Checkbox
                                            id={task.id}
                                            checked={task.completed}
                                            onCheckedChange={() => toggleTaskCompletion(task.id)}
                                        />
                                        <label htmlFor={task.id} className="flex-1 text-sm text-muted-foreground line-through cursor-pointer">{task.text}</label>
                                         <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => deleteTask(task.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        )}
    </div>
  );
}
