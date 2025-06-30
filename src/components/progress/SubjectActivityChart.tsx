
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { CardDescription } from "@/components/ui/card";

interface SubjectActivityChartProps {
  data: { subject: string; mastery: number }[];
}

const chartConfig = {
  subjects: {
    label: "Subjects",
  },
  biology: {
    label: "Biology",
    color: "hsl(var(--chart-1))",
  },
  algebra: {
    label: "Algebra",
    color: "hsl(var(--chart-2))",
  },
  python: {
    label: "Python",
    color: "hsl(var(--chart-3))",
  },
  factoring: {
    label: "Factoring",
    color: "hsl(var(--chart-4))",
  },
  calculus: {
    label: "Calculus",
    color: "hsl(var(--chart-5))",
  }
};


export default function SubjectActivityChart({ data }: SubjectActivityChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[250px] text-muted-foreground">
                <p>No subject data available to display.</p>
            </div>
        );
    }
    
    const chartData = data.map(item => ({
        name: item.subject,
        value: item.mastery,
        fill: chartConfig[item.subject.toLowerCase() as keyof typeof chartConfig]?.color || "hsl(var(--muted))"
    }));

  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
        <ResponsiveContainer width="100%" height={250}>
            <PieChart>
                <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    labelLine={false}
                    label={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        value,
                        index,
                    }) => {
                        const RADIAN = Math.PI / 180
                        const radius = 25 + innerRadius + (outerRadius - innerRadius)
                        const x = cx + radius * Math.cos(-midAngle * RADIAN)
                        const y = cy + radius * Math.sin(-midAngle * RADIAN)

                        return (
                        <text
                            x={x}
                            y={y}
                            fill="hsl(var(--foreground))"
                            textAnchor={x > cx ? "start" : "end"}
                            dominantBaseline="central"
                            className="text-xs"
                        >
                            {value}%
                        </text>
                        )
                    }}
                >
                    {chartData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                </Pie>
                <Legend />
            </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
