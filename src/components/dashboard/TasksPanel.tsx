
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2, CheckSquare, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useUtilitySidebar } from '@/hooks/use-utility-sidebar';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getTasksListener, addTask, updateTask, deleteTask, Task } from '@/lib/data';

type FormValues = {
  taskText: string;
};

export default function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { openPanel } = useUtilitySidebar();
  const { register, handleSubmit, reset } = useForm<FormValues>();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setTasks([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (userId && openPanel === 'tasks') {
      setIsLoading(true);
      const unsubscribeTasks = getTasksListener(userId, (newTasks) => {
        setTasks(newTasks);
        setIsLoading(false);
      });
      return () => unsubscribeTasks();
    }
  }, [userId, openPanel]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!data.taskText.trim() || !userId) return;
    await addTask(userId, data.taskText);
    reset();
  };

  const toggleTaskCompletion = (taskId: string, currentStatus: boolean) => {
    if (!userId) return;
    updateTask(userId, taskId, { completed: !currentStatus });
  };

  const handleDeleteTask = (taskId: string) => {
    if (!userId) return;
    deleteTask(userId, taskId);
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
                    disabled={!userId}
                />
                 <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full" disabled={!userId}>
                    <Plus className="h-4 w-4"/>
                    <span className="sr-only">Add Task</span>
                </Button>
            </div>
        </form>

        <ScrollArea className="flex-1">
            {isLoading ? (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : !userId ? (
                <div className="text-center text-muted-foreground p-8">
                    <p>Please log in to use tasks.</p>
                </div>
            ) : tasks.length === 0 ? (
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
                                onCheckedChange={() => toggleTaskCompletion(task.id, task.completed)}
                            />
                            <label htmlFor={task.id} className="flex-1 text-sm cursor-pointer">{task.text}</label>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteTask(task.id)}>
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
                                            onCheckedChange={() => toggleTaskCompletion(task.id, task.completed)}
                                        />
                                        <label htmlFor={task.id} className="flex-1 text-sm text-muted-foreground line-through cursor-pointer">{task.text}</label>
                                         <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteTask(task.id)}>
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
