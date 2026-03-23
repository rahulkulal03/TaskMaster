import React, { useState, useEffect, useMemo } from 'react';
import { Task, Completions } from './types';
import { HabitTable } from './components/HabitTable';
import { HabitChart } from './components/HabitChart';
import { subDays, format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Layers, ChevronLeft, ChevronRight, Trophy, Sun, Moon, LogOut, LogIn } from 'lucide-react';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, getDocFromServer } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './utils/errorHandling';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasCelebratedToday, setHasCelebratedToday] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('habit_theme');
    return saved ? saved === 'dark' : true;
  });

  const [activeTab, setActiveTab] = useState<'home' | 'overview'>('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completions>({});

  useEffect(() => {
    localStorage.setItem('habit_theme', isDark ? 'dark' : 'light');
    document.body.style.backgroundColor = isDark ? '#0B1120' : '#f8fafc';
  }, [isDark]);

  // Test connection on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Data Fetching
  useEffect(() => {
    if (!isAuthReady || !user) {
      setTasks([]);
      setCompletions({});
      return;
    }

    const tasksRef = collection(db, `users/${user.uid}/tasks`);
    const unsubscribeTasks = onSnapshot(tasksRef, (snapshot) => {
      const fetchedTasks: Task[] = [];
      snapshot.forEach((doc) => {
        fetchedTasks.push(doc.data() as Task);
      });
      // Sort by createdAt locally if needed, or just use order
      fetchedTasks.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      setTasks(fetchedTasks);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/tasks`);
    });

    const completionsRef = collection(db, `users/${user.uid}/completions`);
    const unsubscribeCompletions = onSnapshot(completionsRef, (snapshot) => {
      const newCompletions: Completions = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!newCompletions[data.taskId]) {
          newCompletions[data.taskId] = {};
        }
        newCompletions[data.taskId][data.date] = data.completed;
      });
      setCompletions(newCompletions);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/completions`);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeCompletions();
    };
  }, [user, isAuthReady]);

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

  const handleToggle = async (taskId: string, dateStr: string) => {
    if (!user) return;
    const isCompleted = !(completions[taskId]?.[dateStr]);
    const completionId = `${taskId}_${dateStr}`;
    const path = `users/${user.uid}/completions/${completionId}`;
    
    // Optimistic update
    setCompletions(prev => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || {}),
        [dateStr]: isCompleted
      }
    }));

    try {
      await setDoc(doc(db, path), {
        id: completionId,
        uid: user.uid,
        taskId,
        date: dateStr,
        completed: isCompleted
      });
    } catch (error) {
      // Revert on failure
      setCompletions(prev => ({
        ...prev,
        [taskId]: {
          ...(prev[taskId] || {}),
          [dateStr]: !isCompleted
        }
      }));
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleAddTask = () => {
    if (!user) return;
    const newId = Date.now().toString() + Math.random().toString(36).substring(2);
    const newTask = { 
      id: newId, 
      uid: user.uid,
      title: 'New Task',
      createdAt: new Date().toISOString()
    };
    
    const path = `users/${user.uid}/tasks/${newId}`;
    
    // Optimistic update
    setTasks(prev => [...prev, newTask]);
    
    setDoc(doc(db, path), newTask).catch(error => {
      setTasks(prev => prev.filter(t => t.id !== newId));
      handleFirestoreError(error, OperationType.WRITE, path);
    });
    
    return newId;
  };

  const handleUpdateTask = async (id: string, title: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const path = `users/${user.uid}/tasks/${id}`;
    
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, title } : t));
    
    try {
      await setDoc(doc(db, path), { ...task, title }, { merge: true });
    } catch (error) {
      setTasks(prev => prev.map(t => t.id === id ? task : t));
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/tasks/${id}`;
    
    // Optimistic update
    const previousTasks = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== id));
    
    try {
      await deleteDoc(doc(db, path));
      // Optionally delete completions as well, but for now just deleting task is fine
    } catch (error) {
      setTasks(previousTasks);
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className={`h-[100dvh] flex items-center justify-center ${isDark ? 'bg-[#0B1120]' : 'bg-slate-50'}`}>
        <div className="w-8 h-8 border-4 border-[#4F8AFB] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`h-[100dvh] flex items-center justify-center font-sans transition-colors duration-300 ${isDark ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
        <div className={`max-w-md w-full p-8 rounded-3xl shadow-2xl text-center border ${isDark ? 'bg-[#151C2C] border-slate-800/60' : 'bg-white border-slate-200'}`}>
          <div className="w-16 h-16 bg-[#4F8AFB]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Layers className="w-8 h-8 text-[#4F8AFB]" />
          </div>
          <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>TaskMaster</h1>
          <p className={`mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Track your daily habits and achieve your goals. Sign in to sync your progress across devices.</p>
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#4F8AFB] hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] overflow-hidden font-sans transition-colors duration-300 ${isDark ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      <div className="max-w-6xl mx-auto w-full h-full flex flex-col p-4 sm:p-6 shadow-2xl bg-white/5 dark:bg-black/20">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4 px-2 shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#4F8AFB]" />
              <h1 className={`text-xl font-bold tracking-wide transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>TaskMaster</h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsDark(!isDark)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => signOut(auth)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-red-400' : 'bg-slate-200 text-slate-600 hover:bg-slate-300 hover:text-red-500'}`}
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mb-6 px-2 shrink-0">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'home' ? 'bg-[#4F8AFB] text-white' : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-200 text-slate-600 hover:text-slate-900'}`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-[#4F8AFB] text-white' : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-200 text-slate-600 hover:text-slate-900'}`}
            >
              Overview
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6 px-2 shrink-0">
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

          <div className="flex flex-col flex-1 min-h-0">
            {activeTab === 'home' ? (
              <div className="flex-1 flex flex-col min-h-0 animate-in fade-in zoom-in-95 duration-200">
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
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 animate-in fade-in zoom-in-95 duration-200">
                <HabitChart completions={completions} currentMonth={currentMonth} totalTasks={tasks.length} isDark={isDark} />
              </div>
            )}
          </div>
          
          <div className="text-center mt-auto pt-4 pb-2 space-y-1 shrink-0">
            <p className={`font-bold italic text-[13px] tracking-wide transition-colors ${isDark ? 'text-white' : 'text-slate-800'}`}>
              "Kill the boy, let the man be born."
            </p>
            <p className={`text-[10px] font-medium transition-colors ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Developed by RK</p>
          </div>

        {/* Celebration Modal */}
        {showCelebration && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity">
            <div className={`border rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center transform transition-all scale-100 opacity-100 ${isDark ? 'bg-[#151C2C] border-slate-700' : 'bg-white border-slate-200'}`}>
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
