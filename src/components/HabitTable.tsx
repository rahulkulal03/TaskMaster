import React, { useState, useRef, useEffect } from 'react';
import { Task, Completions } from '../types';
import { format, isToday } from 'date-fns';
import { Plus, Pencil, Trash2, Check, LayoutGrid } from 'lucide-react';

interface Props {
  tasks: Task[];
  completions: Completions;
  dates: Date[];
  onToggle: (taskId: string, dateStr: string) => void;
  onAdd: () => void;
  onUpdate: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  isDark: boolean;
}

export function HabitTable({ tasks, completions, dates, onToggle, onAdd, onUpdate, onDelete, isDark }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(1);
  
  // Drag to scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Slider drag state
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  useEffect(() => {
    if (scrollRef.current && dates.length > 0) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      let targetDateStr = todayStr;
      
      const todayIndex = dates.findIndex(d => format(d, 'yyyy-MM-dd') === todayStr);
      if (todayIndex === -1) {
        targetDateStr = format(dates[Math.floor(dates.length / 2)], 'yyyy-MM-dd');
      }

      setTimeout(() => {
        const targetEl = document.getElementById(`date-col-${targetDateStr}`);
        if (targetEl && scrollRef.current) {
          const container = scrollRef.current;
          const scrollPos = targetEl.offsetLeft - (container.clientWidth / 2) + (targetEl.clientWidth / 2);
          container.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
        }
      }, 50);
    }
  }, [dates]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        setScrollProgress(scrollLeft / maxScroll);
      } else {
        setScrollProgress(0);
      }
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = 150;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !scrollRef.current) return;
      e.preventDefault();
      const x = e.pageX - scrollRef.current.offsetLeft;
      const walk = (x - startX) * 2; // Scroll speed multiplier
      scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDragging, startX, scrollLeft]);

  const handleSliderPointerDown = (e: React.PointerEvent) => {
    setIsDraggingSlider(true);
    handleSliderMove(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleSliderPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingSlider) return;
    handleSliderMove(e);
  };

  const handleSliderPointerUp = (e: React.PointerEvent) => {
    setIsDraggingSlider(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleSliderMove = (e: React.PointerEvent) => {
    if (!sliderRef.current || !scrollRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));
    
    // Calculate progress based on the center of the thumb
    const thumbWidth = 40;
    const availableWidth = rect.width - thumbWidth;
    const adjustedX = Math.max(0, Math.min(x - thumbWidth / 2, availableWidth));
    const progress = availableWidth > 0 ? adjustedX / availableWidth : 0;
    
    const { scrollWidth, clientWidth } = scrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    scrollRef.current.scrollLeft = progress * maxScroll;
  };

  return (
    <div className={`relative rounded-[24px] border shadow-xl overflow-visible mt-8 flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#151C2C] border-slate-800/60' : 'bg-white border-slate-200'}`}>
      <div 
        className={`p-4 flex items-center gap-3 border-b pr-16 rounded-t-[24px] transition-colors duration-300 select-none ${isDark ? 'bg-[#1A233A] border-slate-800/60' : 'bg-slate-50 border-slate-200'} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
      >
        <LayoutGrid className={`w-5 h-5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`} />
        <h2 className={`text-base font-bold tracking-wide transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>Daily Tasks Tracker</h2>
      </div>

      <button
        onClick={onAdd}
        className="absolute -top-6 right-4 w-14 h-14 bg-[#4F8AFB] hover:bg-blue-400 text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(79,138,251,0.5)] transition-all z-10"
      >
        <Plus className="w-7 h-7" strokeWidth={2.5} />
      </button>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        className={`overflow-x-auto custom-scrollbar ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <table className="w-full text-sm text-left border-collapse select-none">
          <thead className={`text-xs border-b transition-colors duration-300 ${isDark ? 'text-slate-400 border-slate-800/60 bg-[#1A233A]' : 'text-slate-500 border-slate-200 bg-slate-50'}`}>
            <tr>
              <th className={`px-4 py-3 font-medium min-w-[120px] sticky left-0 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] transition-colors duration-300 ${isDark ? 'bg-[#1A233A] border-slate-800/60' : 'bg-slate-50 border-slate-200'}`}>Task Name</th>
              {dates.map(date => {
                const isCurrent = isToday(date);
                const dateStr = format(date, 'yyyy-MM-dd');
                return (
                  <th key={dateStr} id={`date-col-${dateStr}`} className={`px-1 py-3 text-center font-medium min-w-[44px] border-r last:border-0 transition-colors duration-300 ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                    <div className={`flex flex-col items-center gap-1 ${isCurrent ? 'text-[#4F8AFB]' : ''}`}>
                      <span className="text-sm font-bold">{format(date, 'dd')}</span>
                      <span className="text-[10px] uppercase font-bold">{format(date, 'EEEEE')}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className={`divide-y transition-colors duration-300 ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
            {tasks.map(task => (
              <tr key={task.id} className={`transition-colors group ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-100'}`}>
                <td className={`px-4 py-3 border-r sticky left-0 z-10 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] ${isDark ? 'bg-[#151C2C] group-hover:bg-[#1c253a] border-slate-800/60' : 'bg-white group-hover:bg-slate-100 border-slate-200'}`}>
                  <div className="flex items-center justify-between gap-2">
                    {editingId === task.id ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={task.title}
                        onChange={(e) => onUpdate(task.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                        className={`border rounded px-2 py-1 text-sm w-full outline-none focus:border-[#4F8AFB] transition-colors ${isDark ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                      />
                    ) : (
                      <span className={`font-medium truncate max-w-[100px] transition-colors ${isDark ? 'text-slate-200' : 'text-slate-800'}`} title={task.title}>
                        {task.title}
                      </span>
                    )}
                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingId(task.id)} className="text-slate-500 hover:text-slate-300">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDelete(task.id)} className="text-slate-500 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </td>
                {dates.map(date => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isCompleted = completions[task.id]?.[dateStr] || false;
                  const isCurrent = isToday(date);
                  return (
                    <td key={dateStr} className={`px-1 py-3 text-center border-r last:border-0 transition-colors duration-300 ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                      <button
                        onClick={() => isCurrent && onToggle(task.id, dateStr)}
                        disabled={!isCurrent}
                        className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 ${
                          isCompleted
                            ? `bg-[#10B981] text-white ${isCurrent ? 'shadow-[0_0_10px_rgba(16,185,129,0.5)]' : ''}`
                            : `${isDark ? 'bg-[#1E293B] border-slate-700/50' : 'bg-slate-100 border-slate-300'} border ${isCurrent && isDark ? 'hover:border-slate-500' : isCurrent && !isDark ? 'hover:border-slate-400 hover:bg-slate-200' : ''}`
                        } ${!isCurrent ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        {isCompleted && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Custom Slider Footer */}
      <div className={`flex items-center justify-between px-4 py-2 rounded-b-[24px] border-t transition-colors duration-300 ${isDark ? 'bg-[#151C2C] border-slate-800/60' : 'bg-white border-slate-200'}`}>
        <button onClick={() => scroll('left')} className="text-slate-600 hover:text-slate-400 p-1 transition-colors">
          <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 10L0 5L8 0V10Z" />
          </svg>
        </button>
        
        <div 
          ref={sliderRef}
          onPointerDown={handleSliderPointerDown}
          onPointerMove={handleSliderPointerMove}
          onPointerUp={handleSliderPointerUp}
          className={`flex-1 mx-4 h-4 rounded-full relative transition-colors duration-300 cursor-pointer flex items-center ${isDark ? 'bg-slate-800/50' : 'bg-slate-200'}`}
        >
          <div 
            className={`absolute h-1.5 rounded-full transition-all duration-100 ${isDraggingSlider ? 'scale-y-150' : ''} ${isDark ? 'bg-slate-500' : 'bg-slate-400'}`} 
            style={{ 
              width: '40px', 
              left: `calc(${scrollProgress * 100}% - ${scrollProgress * 40}px)` 
            }} 
          />
        </div>

        <button onClick={() => scroll('right')} className="text-slate-600 hover:text-slate-400 p-1 transition-colors">
          <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0L8 5L0 10V0Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
