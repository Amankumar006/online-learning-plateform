
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CheckCircle, Eye, XCircle } from "lucide-react";
import Link from "next/link";

interface SolutionHistoryItem {
  id: string;
  exerciseId: string;
  question: string;
  lessonTitle: string;
  isCorrect: boolean;
  submittedAt: number;
  attempts: number;
}

interface SolutionBoardProps {
  history: SolutionHistoryItem[];
}

export default function SolutionBoard({ history }: SolutionBoardProps) {
  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Solution History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground p-8">
            <p>No solution history found.</p>
            <p className="text-sm mt-2">
              Attempt some exercises to see your history here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solution History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Lesson</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Attempted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium max-w-sm truncate">{item.question}</TableCell>
                <TableCell>{item.lessonTitle}</TableCell>
                <TableCell>
                  {item.isCorrect ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                        <CheckCircle className="mr-1.5 h-3 w-3" />
                        Correct
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                        <XCircle className="mr-1.5 h-3 w-3" />
                        Incorrect
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{item.attempts || 1}</Badge>
                </TableCell>
                <TableCell>{format(new Date(item.submittedAt), "PPP")}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/practice/${item.exerciseId}`}>
                      <Eye className="mr-2 h-4 w-4"/>
                      Review
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
