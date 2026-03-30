import React, { useState } from 'react';
import { Reminder } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, Bell, Calendar, Edit2, X, Check } from 'lucide-react';
import { DateTimePickerModal } from './DateTimePickerModal';
import { t } from '../translations';

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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className={`p-4 rounded-xl border mb-4 shrink-0 shadow-sm ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
        <form onSubmit={handleAdd} noValidate className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={t(language, 'reminders.task_name')}
            className={`flex-1 px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#4F8AFB] ${isDark ? 'bg-slate-900 text-white placeholder-slate-500 border-slate-700' : 'bg-slate-50 text-slate-900 placeholder-slate-400 border-slate-200'} border`}
          />
          <div className="flex flex-col xs:flex-row sm:flex-row gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsNewDatePickerOpen(true)}
              className={`w-full sm:w-auto px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#4F8AFB] ${isDark ? 'bg-slate-900 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'} border min-h-[48px] text-left flex items-center justify-between`}
            >
              <span className={newDateTime ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-500' : 'text-slate-400')}>
                {newDateTime ? formatDateTime(newDateTime.split('T')[0], newDateTime.split('T')[1]) : (t(language, 'reminders.select_date_time') || 'Select Date & Time')}
              </span>
              <Calendar className="w-5 h-5 ml-2 opacity-50" />
            </button>
            <button
              type="submit"
              disabled={!newText.trim() || !newDateTime}
              className="w-full sm:w-auto px-4 py-3 bg-[#4F8AFB] text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center justify-center min-h-[48px]"
            >
              <Plus className="w-6 h-6" />
              <span className="ml-2 sm:hidden">{t(language, 'reminders.add')}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-2">
        {reminders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Bell className={`w-8 h-8 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
            </div>
            <p className={`text-lg font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t(language, 'reminders.no_reminders')}</p>
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{t(language, 'reminders.add_to_get_started')}</p>
          </div>
        ) : (
          reminders.map(reminder => (
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
          ))
        )}
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
    </div>
  );
}
