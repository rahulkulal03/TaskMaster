import React, { useState } from 'react';
import { Reminder } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, Bell, Calendar, Edit2, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { DateTimePickerModal } from './DateTimePickerModal';
import { t } from '../translations';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, isSameDay } from 'date-fns';

interface RemindersProps {
  reminders: Reminder[];
  onAdd: (text: string, date: string, time: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, text: string, date: string, time: string) => void;
  isDark: boolean;
  language: string;
}

export function Reminders({ reminders, onAdd, onToggle, onDelete, onUpdate, isDark, language }: RemindersProps) {
  const [newText, setNewText] = useState('');
  const [newDateTime, setNewDateTime] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editDateTime, setEditDateTime] = useState('');

  const [isNewDatePickerOpen, setIsNewDatePickerOpen] = useState(false);
  const [isEditDatePickerOpen, setIsEditDatePickerOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newText.trim()) {
      let date = '';
      let time = '';
      if (newDateTime) {
        const [d, t] = newDateTime.split('T');
        date = d;
        time = t;
      }
      onAdd(newText.trim(), date, time);
      setNewText('');
      setNewDateTime('');
      setShowAddForm(false);
    }
  };

  const formatTime12Hour = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const formatDateTime = (date: string, time: string) => {
    const formattedTime = time ? formatTime12Hour(time) : '';
    if (date && time) return `${date} ${t(language, 'reminders.at')} ${formattedTime}`;
    if (date) return date;
    if (time) return formattedTime;
    return null;
  };

  const handleEditStart = (reminder: Reminder) => {
    setEditingId(reminder.id);
    setEditText(reminder.text);
    if (reminder.date && reminder.time) {
      setEditDateTime(`${reminder.date}T${reminder.time}`);
    } else {
      setEditDateTime('');
    }
  };

  const handleEditSave = (id: string) => {
    if (editText.trim() && onUpdate) {
      let date = '';
      let time = '';
      if (editDateTime) {
        const [d, t] = editDateTime.split('T');
        date = d;
        time = t;
      }
      onUpdate(id, editText.trim(), date, time);
    }
    setEditingId(null);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedReminders = reminders.filter(r => !r.date || r.date === selectedDateStr).sort((a, b) => {
    if (a.date === b.date) {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      return 0;
    }
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  const renderReminderItem = (reminder: Reminder) => (
    <div 
      key={reminder.id}
      className={`group flex items-center gap-3 p-3 rounded-xl border transition-all ${isDark ? 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}
    >
      {editingId === reminder.id ? (
        <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8AFB] ${isDark ? 'bg-slate-900 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'} border`}
          />
          <div className="flex flex-col xs:flex-row sm:flex-row gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsEditDatePickerOpen(true)}
              className={`w-full sm:w-auto px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8AFB] ${isDark ? 'bg-slate-900 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'} border text-left flex items-center justify-between`}
            >
              <span className={editDateTime ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-500' : 'text-slate-400')}>
                {editDateTime ? formatDateTime(editDateTime.split('T')[0], editDateTime.split('T')[1]) : (t(language, 'reminders.select_date_time') || 'Select Date & Time')}
              </span>
              <Calendar className="w-4 h-4 ml-2 opacity-50" />
            </button>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleEditSave(reminder.id)}
                disabled={!editText.trim() || !editDateTime}
                className="flex-1 sm:flex-none p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center justify-center shrink-0"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditingId(null)}
                className={`flex-1 sm:flex-none p-2 rounded-lg transition-colors flex items-center justify-center shrink-0 ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <button 
            onClick={() => onToggle(reminder.id)}
            className={`shrink-0 transition-colors ${reminder.completed ? 'text-green-500' : isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500'}`}
          >
            {reminder.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
          </button>
          
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${reminder.completed ? (isDark ? 'text-slate-500 line-through' : 'text-slate-400 line-through') : (isDark ? 'text-slate-200' : 'text-slate-700')}`}>
              {reminder.text}
            </p>
            {(reminder.date || reminder.time) && (
              <p className={`text-xs mt-0.5 flex items-center gap-1 ${reminder.completed ? (isDark ? 'text-slate-600' : 'text-slate-400') : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>
                {reminder.date ? <Calendar className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                {formatDateTime(reminder.date, reminder.time)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleEditStart(reminder)}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'}`}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(reminder.id)}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-500 hover:text-red-400 hover:bg-slate-800' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex-1 flex flex-col h-full overflow-y-auto animate-in fade-in zoom-in-95 duration-200 pr-2 pb-20">
        {showAddForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200 backdrop-blur-sm">
            <div className={`w-full max-w-sm p-5 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold cursor-default">New Reminder</h2>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className={`p-2 rounded-full transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAdd} noValidate className="flex flex-col gap-3">
                <input
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder={t(language, 'reminders.task_name')}
                  className={`w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#4F8AFB] ${isDark ? 'bg-slate-800 text-white placeholder-slate-500 border-slate-700' : 'bg-slate-50 text-slate-900 placeholder-slate-400 border-slate-200'} border`}
                />
                <button
                  type="button"
                  onClick={() => setIsNewDatePickerOpen(true)}
                  className={`w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#4F8AFB] ${isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'} border text-left flex items-center justify-between`}
                >
                  <span className={newDateTime ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-500' : 'text-slate-400')}>
                    {newDateTime ? formatDateTime(newDateTime.split('T')[0], newDateTime.split('T')[1]) : (t(language, 'reminders.select_date_time') || 'Select Date & Time')}
                  </span>
                  <Calendar className="w-5 h-5 ml-2 opacity-50" />
                </button>
                <button
                  type="submit"
                  disabled={!newText.trim() || !newDateTime}
                  className="w-full mt-2 px-4 py-3 bg-[#4F8AFB] text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center font-medium"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {t(language, 'reminders.add')}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className={`p-4 rounded-xl border mb-4 shrink-0 shadow-sm ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePrevMonth} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
          <button onClick={handleNextMonth} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-center text-[10px] sm:text-xs font-semibold text-slate-500 py-1 uppercase tracking-wider">
              {day}
            </div>
          ))}
          {calendarDays.map((date, i) => {
            const isSelected = isSameDay(date, selectedDate);
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const dateStr = format(date, 'yyyy-MM-dd');
            const dayReminders = reminders.filter(r => r.date === dateStr);
            const hasReminders = dayReminders.length > 0;
            const allCompleted = hasReminders && dayReminders.every(r => r.completed);
            
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(date)}
                className={`aspect-square flex flex-col items-center justify-center p-1 rounded-lg text-sm relative transition-colors ${
                  !isCurrentMonth ? 'opacity-30' : ''
                } ${
                  isSelected ? 'bg-blue-500 text-white font-bold' : 
                  isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span>{format(date, 'd')}</span>
                {hasReminders && (
                  <div className={`mt-0.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : allCompleted ? 'bg-green-500' : 'bg-blue-500'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-[200px] mb-4 space-y-2">
        <h3 className={`text-sm font-semibold uppercase tracking-wider px-1 mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h3>
        
        {selectedReminders.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <CheckCircle2 className={`w-6 h-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
            </div>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No reminders for this date</p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {selectedReminders.map(renderReminderItem)}
          </div>
        )}
      </div>
    </div>
    
      <DateTimePickerModal
        isOpen={isNewDatePickerOpen}
        onClose={() => setIsNewDatePickerOpen(false)}
        onConfirm={(dateTime) => {
          setNewDateTime(dateTime);
          setIsNewDatePickerOpen(false);
        }}
        initialDateTime={newDateTime}
        isDark={isDark}
        language={language}
      />

      <DateTimePickerModal
        isOpen={isEditDatePickerOpen}
        onClose={() => setIsEditDatePickerOpen(false)}
        onConfirm={(dateTime) => {
          setEditDateTime(dateTime);
          setIsEditDatePickerOpen(false);
        }}
        initialDateTime={editDateTime}
        isDark={isDark}
        language={language}
      />

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="absolute bottom-4 right-4 w-14 h-14 bg-[#4F8AFB] hover:bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-50 animate-in zoom-in duration-200"
          aria-label={t(language, 'reminders.add')}
        >
          <Plus className="w-8 h-8" />
        </button>
      )}
    </div>
  );
}
