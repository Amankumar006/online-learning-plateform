"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { UserProgress } from "@/lib/data";

const chartConfig = {
  mastery: {
    label: "Mastery",
    color: "hsl(var(--primary))",
  },
};

interface ProgressChartProps {
  chartData: UserProgress['subjectsMastery'];
}

export default function ProgressChart({ chartData }: ProgressChartProps) {
  if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
            <p>No progress data available to display.</p>
        </div>
      );
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="subject"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(value) => `${value}%`}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar dataKey="mastery" fill="var(--color-mastery)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
