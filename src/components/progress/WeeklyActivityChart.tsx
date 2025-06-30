
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

interface WeeklyActivityChartProps {
    data: { week: string; skillsMastered: number; timeSpent: number }[];
}

const chartConfig = {
    skillsMastered: {
      label: "Skills Mastered",
      color: "hsl(var(--chart-1))",
    },
    timeSpent: {
      label: "Time Spent (hrs)",
      color: "hsl(var(--chart-2))",
    },
};

export default function WeeklyActivityChart({ data }: WeeklyActivityChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[250px] text-muted-foreground">
                <p>No weekly activity data to display yet.</p>
            </div>
        );
    }

  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="week"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.substring(0, 3)}
                />
                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar yAxisId="left" dataKey="skillsMastered" fill="var(--color-skillsMastered)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="timeSpent" fill="var(--color-timeSpent)" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}
