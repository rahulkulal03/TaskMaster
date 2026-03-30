import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { t } from '../translations';

interface DateTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dateTime: string) => void;
  initialDateTime: string;
  isDark: boolean;
  language: string;
}

export function DateTimePickerModal({ isOpen, onClose, onConfirm, initialDateTime, isDark, language }: DateTimePickerModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialDateTime) {
        const [d, t] = initialDateTime.split('T');
        const date = new Date(d);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
          setCurrentMonth(date);
        }
        setSelectedTime(t || '');
      } else {
        setSelectedDate(null);
        setSelectedTime('');
        setCurrentMonth(new Date());
      }
    }
  }, [isOpen, initialDateTime]);

  if (!isOpen) return null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayNames = (locale: string) => {
    try {
      const baseDate = new Date(Date.UTC(2017, 0, 1)); // A Sunday
      const dayNames = [];
      for(let i = 0; i < 7; i++) {
        dayNames.push(baseDate.toLocaleDateString(locale, { weekday: 'short' }));
        baseDate.setDate(baseDate.getDate() + 1);
      }
      return dayNames;
    } catch (e) {
      return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    }
  };

  const dayNames = getDayNames(language);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      onConfirm(`${dateStr}T${selectedTime}`);
    } else if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      onConfirm(`${dateStr}T00:00`);
    } else {
      onConfirm('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
      <div className={`w-full max-w-sm rounded-2xl p-5 ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-xl flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t(language, 'reminders.select_date_time') || 'Select Date & Time'}
          </h3>
          <button onClick={onClose} className={`p-2 rounded-full ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className={`p-2 rounded-full ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {currentMonth.toLocaleDateString(language, { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className={`p-2 rounded-full ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day, i) => (
              <div key={i} className={`text-center text-xs font-medium py-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 mb-6">
            {days.map((day, i) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isTodayDate = isToday(day);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    aspect-square flex items-center justify-center rounded-full text-sm transition-colors
                    ${!isCurrentMonth ? (isDark ? 'text-slate-600' : 'text-slate-300') : ''}
                    ${isSelected ? 'bg-[#4F8AFB] text-white font-medium' : ''}
                    ${!isSelected && isTodayDate ? (isDark ? 'bg-slate-700 text-blue-400' : 'bg-blue-50 text-blue-600') : ''}
                    ${!isSelected && !isTodayDate && isCurrentMonth ? (isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100') : ''}
                  `}
                >
                  {format(day, dateFormat)}
                </button>
              );
            })}
          </div>

          {/* Time Selection */}
          <div className="mb-2">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {t(language, 'reminders.time') || 'Time'}
            </label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#4F8AFB] ${isDark ? 'bg-slate-900 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'} border`}
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex gap-3 shrink-0 border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {t(language, 'alarm.dismiss') || 'Cancel'}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedTime}
            className="flex-1 py-3 bg-[#4F8AFB] text-white rounded-xl font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t(language, 'reminders.confirm') || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
