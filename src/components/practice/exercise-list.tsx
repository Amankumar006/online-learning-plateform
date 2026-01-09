"use client";

import Link from 'next/link';
import { Exercise, UserExerciseResponse } from '@/lib/data';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ListChecks, Trash2, Eye, Pencil, BrainCircuit, Code, FunctionSquare, CheckCircle } from 'lucide-react';

interface ExerciseListProps {
    exercises: Exercise[];
    responses: Map<string, UserExerciseResponse>;
    onDiscard: (id: string) => void;
}

export function ExerciseList({ exercises, responses, onDiscard }: ExerciseListProps) {
    const pendingExercises = exercises.filter(ex => !responses.has(ex.id));
    const completedExercises = exercises.filter(ex => responses.has(ex.id));

    const categoryIcons: Record<string, React.ReactNode> = {
        code: <Code className="w-12 h-12 text-muted-foreground/80" />,
        math: <FunctionSquare className="w-12 h-12 text-muted-foreground/80" />,
        general: <BrainCircuit className="w-12 h-12 text-muted-foreground/80" />,
    };

    const getDifficultyBadge = (level: number) => {
        switch (level) {
            case 1: return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Easy</Badge>;
            case 2: return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">Medium</Badge>;
            case 3: return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">Hard</Badge>;
            default: return <Badge variant="secondary">N/A</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold font-headline flex items-center gap-3">
                <ListChecks className="h-6 w-6" /> Your Custom Exercises
            </h2>

            <section>
                <h3 className="text-lg font-semibold mt-6 mb-3">Pending & In-Progress ({pendingExercises.length})</h3>
                {pendingExercises.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {pendingExercises.map(ex => (
                            <Card key={ex.id} className="overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                                <div className="h-24 bg-gradient-to-br from-muted to-secondary flex items-center justify-center">
                                    {categoryIcons[ex.category || 'general']}
                                </div>
                                <CardContent className="p-4 flex flex-col flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="capitalize">{ex.type.replace(/_/g, ' ')}</Badge>
                                        {getDifficultyBadge(ex.difficulty)}
                                    </div>
                                    <CardTitle className="text-base font-semibold leading-relaxed h-12 line-clamp-2">
                                        {ex.type === 'fill_in_the_blanks'
                                            ? ex.questionParts.join(' ___ ')
                                            : ex.type === 'code'
                                                ? ex.title
                                                : ex.question}
                                    </CardTitle>
                                    <div className="flex-grow my-4">
                                        {ex.tags && ex.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {ex.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 mt-auto">
                                        <Button asChild className="w-full"><Link href={`/dashboard/practice/${ex.id}`}><Pencil className="mr-2 h-4 w-4" />Solve</Link></Button>
                                        <Button size="icon" variant="outline" onClick={() => onDiscard(ex.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Alert><AlertTitle>No pending exercises!</AlertTitle><AlertDescription>Use the generator above to create new practice problems.</AlertDescription></Alert>
                )}
            </section>

            <section>
                <h3 className="text-lg font-semibold mt-8 mb-3">Recently Completed ({completedExercises.length})</h3>
                {completedExercises.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {completedExercises.map(ex => {
                            const response = responses.get(ex.id);
                            return (
                                <Card key={ex.id} className="overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 opacity-80">
                                    <div className="relative h-24 bg-gradient-to-br from-muted to-secondary flex items-center justify-center">
                                        {categoryIcons[ex.category || 'general']}
                                        {response?.isCorrect && (
                                            <div className="absolute top-2 right-2 p-1 bg-green-500/80 backdrop-blur-sm rounded-full text-white">
                                                <CheckCircle className="h-4 w-4" />
                                            </div>
                                        )}
                                    </div>
                                    <CardContent className="p-4 flex flex-col flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className="capitalize">{ex.type.replace(/_/g, ' ')}</Badge>
                                            {getDifficultyBadge(ex.difficulty)}
                                        </div>
                                        <CardTitle className="text-base font-semibold leading-relaxed h-12 line-clamp-2">
                                            {ex.type === 'fill_in_the_blanks'
                                                ? ex.questionParts.join(' ___ ')
                                                : ex.type === 'code'
                                                    ? (ex as any).title
                                                    : (ex as any).question}
                                        </CardTitle>
                                        <div className="flex-grow my-4">
                                            {ex.tags && ex.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {ex.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                                </div>
                                            )}
                                        </div>
                                        <Button asChild variant="secondary" className="w-full mt-auto"><Link href={`/dashboard/practice/${ex.id}`}><Eye className="mr-2 h-4 w-4" />View Solution</Link></Button>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    <Alert><AlertTitle>No completed exercises yet.</AlertTitle><AlertDescription>Once you solve a pending exercise, it will appear here.</AlertDescription></Alert>
                )}
            </section>
        </div>
    );
}
