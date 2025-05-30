import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PercentageDistributionChartProps {
  data: {
    name: string;
    value: number;
  }[];
}

const COLORS = ['#8884d8', '#82ca9d', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919', '#19FFAF', '#19AF19'];

export function PercentageDistributionChart({ data }: PercentageDistributionChartProps) {
  const maxPercentageEntry = data.reduce((prev, current) => (prev.value > current.value ? prev : current), data[0]);

  return (
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl">Distribuição Percentual</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="40%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="#000"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend layout="horizontal" align="center" verticalAlign="bottom" />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
