import React, { useState, useEffect, useMemo } from 'react';
import { Task, Completions } from './types';
import { HabitTable } from './components/HabitTable';
import { HabitChart } from './components/HabitChart';
import { subDays, format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Layers, ChevronLeft, ChevronRight, Trophy, Sun, Moon } from 'lucide-react';

export default function App() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasCelebratedToday, setHasCelebratedToday] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('habit_theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    localStorage.setItem('habit_theme', isDark ? 'dark' : 'light');
    document.body.style.backgroundColor = isDark ? '#0B1120' : '#f8fafc';
  }, [isDark]);

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('habit_tasks_v2');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Morning Workout' },
      { id: '2', title: 'Read 20 pages' },
      { id: '3', title: 'Drink 2L Water' },
      { id: '4', title: 'Test Task' },
      { id: '5', title: 'tk' },
      { id: '6', title: 'ysk' },
    ];
  });

  const [completions, setCompletions] = useState<Completions>(() => {
    const saved = localStorage.getItem('habit_completions_v2');
    if (saved) return JSON.parse(saved);
    
    // Mock some initial data to match the screenshot vibe
    const mock: Completions = {};
    const today = new Date();
    
    // Helper to generate a date string for N days ago
    const d = (daysAgo: number) => format(subDays(today, daysAgo), 'yyyy-MM-dd');
    
    mock['1'] = { [d(4)]: true, [d(3)]: true };
    mock['2'] = { [d(4)]: true, [d(3)]: true };
    mock['3'] = { [d(4)]: true, [d(3)]: true };
    mock['4'] = { [d(4)]: true, [d(3)]: true };
    mock['5'] = { [d(4)]: true, [d(3)]: true };
    mock['6'] = { [d(4)]: true };

    return mock;
  });

  useEffect(() => {
    localStorage.setItem('habit_tasks_v2', JSON.stringify(tasks));
    localStorage.setItem('habit_completions_v2', JSON.stringify(completions));
  }, [tasks, completions]);

  useEffect(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (tasks.length > 0) {
      const allDone = tasks.every(t => completions[t.id]?.[todayStr]);
      if (allDone && !hasCelebratedToday) {
        setShowCelebration(true);
        setHasCelebratedToday(true);
      } else if (!allDone) {
        setHasCelebratedToday(false);
      }
    }
  }, [completions, tasks, hasCelebratedToday]);

  const tableDates = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const handleToggle = (taskId: string, dateStr: string) => {
    setCompletions(prev => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || {}),
        [dateStr]: !(prev[taskId]?.[dateStr])
      }
    }));
  };

  const handleAddTask = () => {
    const newTask = { id: Date.now().toString() + Math.random().toString(36).substring(2), title: 'New Task' };
    setTasks([...tasks, newTask]);
  };

  const handleUpdateTask = (id: string, title: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, title } : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    const newCompletions = { ...completions };
    delete newCompletions[id];
    setCompletions(newCompletions);
  };

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleToday = () => setCurrentMonth(new Date());

  return (
    <div className={`min-h-screen font-sans flex items-center justify-center p-4 sm:p-8 transition-colors duration-300 ${isDark ? 'bg-neutral-950 text-slate-200' : 'bg-slate-200 text-slate-800'}`}>
      {/* Mobile Device Mockup */}
      <div className={`w-full max-w-[380px] aspect-[9/16] rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-[8px] relative overflow-hidden flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#0B1120] border-neutral-900' : 'bg-slate-50 border-slate-300'}`}>
        
        {/* Dynamic Island / Notch area */}
        <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-50 pointer-events-none">
          <div className={`w-32 h-6 rounded-b-2xl transition-colors duration-300 ${isDark ? 'bg-neutral-900' : 'bg-slate-300'}`}></div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-10 pb-8 px-4 flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#4F8AFB]" />
              <h1 className={`text-xl font-bold tracking-wide transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>TaskMaster</h1>
            </div>
            <button 
              onClick={() => setIsDark(!isDark)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6 px-2">
            <button onClick={handlePrevMonth} className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-200'}`}>
              <ChevronLeft className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
            </button>
            <h2 className={`text-lg font-bold transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={handleNextMonth} className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-200'}`}>
                <ChevronRight className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
              </button>
              <button onClick={handleToday} className={`px-3 py-1 text-xs font-medium border rounded-md transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-slate-300 hover:bg-slate-200 text-slate-700'}`}>
                Today
              </button>
            </div>
          </div>

          <HabitChart completions={completions} currentMonth={currentMonth} totalTasks={tasks.length} isDark={isDark} />
          
          <HabitTable
            tasks={tasks}
            completions={completions}
            dates={tableDates}
            onToggle={handleToggle}
            onAdd={handleAddTask}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
            isDark={isDark}
          />
          
          <div className="text-center mt-auto pt-12 space-y-3">
            <p className={`font-bold italic text-[15px] tracking-wide transition-colors ${isDark ? 'text-white' : 'text-slate-800'}`}>
              "Success is the product of daily habits"
            </p>
            <p className={`text-xs font-medium transition-colors ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Developed by RK</p>
          </div>
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none z-50">
          <div className={`w-32 h-1 rounded-full transition-colors ${isDark ? 'bg-slate-600/50' : 'bg-slate-400/50'}`}></div>
        </div>

        {/* Celebration Modal */}
        {showCelebration && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity">
            <div className={`border rounded-3xl p-6 w-full shadow-2xl flex flex-col items-center text-center transform transition-all scale-100 opacity-100 ${isDark ? 'bg-[#151C2C] border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                <Trophy className="w-10 h-10 text-emerald-400 animate-bounce" />
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>All Done!</h2>
              <p className={`mb-6 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>You've completed all your tasks for today. Great job staying consistent!</p>
              <button 
                onClick={() => setShowCelebration(false)}
                className="w-full py-3 bg-[#4F8AFB] hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
              >
                Awesome
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
