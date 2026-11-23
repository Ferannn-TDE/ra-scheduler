import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { Shift } from "../utils/scheduler";

interface FairnessChartProps {
  schedule: Shift[];
  ras: { id: string; name: string }[];
}

export default function FairnessChart({ schedule, ras }: FairnessChartProps) {
  const data = useMemo(() => {
    if (schedule.length === 0 || ras.length === 0)
      return { chartData: [], average: 0 };

    const counts: Record<string, number> = {};
    ras.forEach((r) => (counts[r.id] = 0));

    schedule.forEach((slot) => {
      slot.assignedRaIds.forEach((id) => {
        if (counts[id] !== undefined) counts[id]++;
      });
    });

    const totalShifts = Object.values(counts).reduce((a, b) => a + b, 0);
    const average = Math.round(totalShifts / ras.length);

    const chartData = ras
      .map((r) => ({
        // FIX 1: Use Full Name as the unique key so Recharts doesn't merge duplicates
        uniqueName: r.name,
        // We calculate initials just for the label display
        initials: r.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 3),
        shifts: counts[r.id],
      }))
      .sort((a, b) => b.shifts - a.shifts);

    return { chartData, average };
  }, [schedule, ras]);

  if (!data || data.chartData.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow mb-8 border-l-4 border-indigo-500">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <span aria-hidden="true">📊</span> Fairness Analysis
        </h3>
        <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-1 rounded">
          Target Average: {data.average} Shifts
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.chartData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis
              dataKey="uniqueName" // FIX 2: Use unique name for data map
              tickFormatter={(val) => {
                // FIX 3: Convert to initials dynamically for the display label
                return val
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 3);
              }}
              tick={{ fill: "#64748b", fontSize: 12, fontWeight: "bold" }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value: any) => [`${value} shifts`, ""]}
              // FIX 4: Tooltip now just reads the dataKey (uniqueName) directly
              labelFormatter={(label) => label}
            />
            <ReferenceLine
              y={data.average}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              label={{
                value: "Avg",
                fill: "#f59e0b",
                fontSize: 10,
                position: "right",
              }}
            />
            <Bar
              dataKey="shifts"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
              barSize={30}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
