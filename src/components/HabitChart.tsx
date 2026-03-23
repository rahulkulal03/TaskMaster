import React, { useMemo } from 'react';
import { Completions } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';

export function HabitChart({ completions, currentMonth, totalTasks, isDark }: { completions: Completions, currentMonth: Date, totalTasks: number, isDark: boolean }) {
  const data = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      let count = 0;
      Object.values(completions).forEach(taskCompletions => {
        if (taskCompletions[dateStr]) count++;
      });
      return { date: format(day, 'd'), count, fullDate: day };
    });
  }, [completions, currentMonth]);

  const totalCompletions = useMemo(() => {
    return data.reduce((sum, day) => sum + day.count, 0);
  }, [data]);

  const today = new Date();
  const displayDate = isSameMonth(today, currentMonth) ? today : startOfMonth(currentMonth);

  return (
    <div className={`w-full rounded-[24px] border shadow-lg p-5 mb-2 flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#151C2C] border-slate-800/60' : 'bg-white border-slate-200'}`}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <LineChartIcon className={`w-6 h-6 ${isDark ? 'text-slate-200' : 'text-slate-700'}`} />
          <h2 className={`text-lg font-bold leading-tight transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Monthly<br/>Overview
          </h2>
        </div>
        <div className={`text-sm text-right max-w-[120px] transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {totalCompletions} Completions This Month
        </div>
      </div>

      <div className="flex flex-col items-center mb-6">
        <span className={`text-sm font-semibold tracking-widest uppercase mb-1 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {format(displayDate, 'EEEE')}
        </span>
        <span className={`text-4xl font-bold transition-colors ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          {format(displayDate, 'MMM d')}
        </span>
      </div>

      <div className="w-full h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F8AFB" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#4F8AFB" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke={isDark ? "#1e293b" : "#e2e8f0"} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} 
              minTickGap={10} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} 
              allowDecimals={false} 
              domain={[0, Math.max(totalTasks, 1)]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isDark ? '#1e293b' : '#ffffff', 
                border: isDark ? 'none' : '1px solid #e2e8f0', 
                borderRadius: '8px', 
                color: isDark ? '#f8fafc' : '#0f172a' 
              }} 
            />
            <Area 
              type="monotone" 
              dataKey="count" 
              stroke="#4F8AFB" 
              strokeWidth={2} 
              fillOpacity={1} 
              fill="url(#colorCount)" 
              dot={{ r: 3, fill: '#10B981', stroke: isDark ? '#151C2C' : '#ffffff', strokeWidth: 1 }} 
              activeDot={{ r: 5, fill: '#4F8AFB', stroke: isDark ? '#151C2C' : '#ffffff' }} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
