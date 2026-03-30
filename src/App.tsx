import React, { useState, useEffect, useMemo } from 'react';
import { Task, Completions, Reminder } from './types';
import { HabitTable } from './components/HabitTable';
import { HabitChart } from './components/HabitChart';
import { Reminders } from './components/Reminders';
import { Profile } from './components/Profile';
import { t } from './translations';
import { subDays, format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Layers, ChevronLeft, ChevronRight, Trophy, Sun, Moon, BellRing, Home, BarChart2, Bell, LogOut, User } from 'lucide-react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Login } from './components/Login';
import { ProfileSetupModal } from './components/ProfileSetupModal';
import { auth, db } from './firebase';
import { ALARM_SOUNDS } from './constants';
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './utils/firebaseUtils';
import { playAlarmSound } from './utils/audio';
import confetti from 'canvas-confetti';

const playCelebrationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    const playTone = (freq: number, type: OscillatorType, time: number, duration: number, vol: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + time);
      
      gain.gain.setValueAtTime(vol, audioCtx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + time + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(audioCtx.currentTime + time);
      osc.stop(audioCtx.currentTime + time + duration);
    };

    // Tada chord
    playTone(523.25, 'sine', 0, 0.2, 0.3); // C5
    playTone(659.25, 'sine', 0, 0.2, 0.3); // E5
    playTone(783.99, 'sine', 0, 0.2, 0.3); // G5
    
    playTone(523.25, 'sine', 0.2, 0.6, 0.3); // C5
    playTone(659.25, 'sine', 0.2, 0.6, 0.3); // E5
    playTone(783.99, 'sine', 0.2, 0.6, 0.3); // G5
    playTone(1046.50, 'sine', 0.2, 0.6, 0.3); // C6
  } catch (e) {
    console.warn('Audio playback failed', e);
  }
};

export default function App() {
  const [user, setUser] = useState(auth.currentUser);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasCelebratedToday, setHasCelebratedToday] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('habit_theme');
    return saved ? saved === 'dark' : true;
  });

  const [activeTab, setActiveTab] = useState<'home' | 'overview' | 'reminders' | 'profile'>('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completions>({});
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeAlarm, setActiveAlarm] = useState<Reminder | null>(null);
  const [snoozeDuration, setSnoozeDuration] = useState<number>(10);
  const [alarmSoundId, setAlarmSoundId] = useState<string>('default');
  const [language, setLanguage] = useState<string>('en');
  const [userData, setUserData] = useState<any>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const activeAudioRef = React.useRef<{ stop: () => void } | null>(null);
  const reminderTimeouts = React.useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Load data from Firestore
  useEffect(() => {
    if (!user) {
      // Clear state when logged out
      setTasks([]);
      setCompletions({});
      setReminders([]);
      setUserData(null);
      setShowProfileSetup(false);
      return;
    }

    const userId = user.uid;

    const userUnsub = onSnapshot(doc(db, `users/${userId}`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        
        // Show profile setup if dob is missing, or if it's a guest/google login without a name
        if (!data.dob || (!data.displayName && data.isAnonymous)) {
          setShowProfileSetup(true);
        } else {
          setShowProfileSetup(false);
        }
      } else {
        // User document doesn't exist, force profile setup to create it
        setShowProfileSetup(true);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${userId}`));

    const tasksUnsub = onSnapshot(collection(db, `users/${userId}/tasks`), (snapshot) => {
      const newTasks: Task[] = [];
      snapshot.forEach(doc => newTasks.push(doc.data() as Task));
      setTasks(newTasks);
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${userId}/tasks`));

    const completionsUnsub = onSnapshot(collection(db, `users/${userId}/completions`), (snapshot) => {
      const newCompletions: Completions = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!newCompletions[data.taskId]) {
          newCompletions[data.taskId] = {};
        }
        newCompletions[data.taskId][data.date] = data.completed;
      });
      setCompletions(newCompletions);
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${userId}/completions`));

    const remindersUnsub = onSnapshot(collection(db, `users/${userId}/reminders`), (snapshot) => {
      const newReminders: Reminder[] = [];
      snapshot.forEach(doc => newReminders.push(doc.data() as Reminder));
      setReminders(newReminders);
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${userId}/reminders`));

    const profileUnsub = onSnapshot(doc(db, `users/${userId}/settings/profile`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.alarmSound) setAlarmSoundId(data.alarmSound);
        if (data.language) setLanguage(data.language);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${userId}/settings/profile`));

    return () => {
      userUnsub();
      tasksUnsub();
      completionsUnsub();
      remindersUnsub();
      profileUnsub();
    };
  }, [user]);

  // Sync to local storage as backup
  useEffect(() => {
    localStorage.setItem('habit_theme', isDark ? 'dark' : 'light');
    document.body.style.backgroundColor = isDark ? '#0B1120' : '#f8fafc';
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('habit_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('habit_completions', JSON.stringify(completions));
  }, [completions]);

  useEffect(() => {
    localStorage.setItem('habit_reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Firestore write helpers
  const saveTaskToFirestore = async (task: Task) => {
    if (!user) return;
    try {
      await setDoc(doc(db, `users/${user.uid}/tasks/${task.id}`), { ...task, uid: user.uid });
    } catch (e) {
      console.error("Failed to save task", e);
    }
  };

  const deleteTaskFromFirestore = async (taskId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/tasks/${taskId}`));
      // Also delete related completions
      const completionsQuery = query(collection(db, `users/${user.uid}/completions`));
      const snapshot = await getDocs(completionsQuery);
      snapshot.forEach(async (docSnapshot) => {
        if (docSnapshot.data().taskId === taskId) {
          await deleteDoc(docSnapshot.ref);
        }
      });
    } catch (e) {
      console.error("Failed to delete task", e);
    }
  };

  const saveCompletionToFirestore = async (taskId: string, dateStr: string, completed: boolean) => {
    if (!user) return;
    const completionId = `${taskId}_${dateStr}`;
    try {
      await setDoc(doc(db, `users/${user.uid}/completions/${completionId}`), {
        id: completionId,
        uid: user.uid,
        taskId,
        date: dateStr,
        completed
      });
    } catch (e) {
      console.error("Failed to save completion", e);
    }
  };

  const saveReminderToFirestore = async (reminder: Reminder) => {
    if (!user) return;
    try {
      await setDoc(doc(db, `users/${user.uid}/reminders/${reminder.id}`), { ...reminder, uid: user.uid });
    } catch (e) {
      console.error("Failed to save reminder", e);
    }
  };

  const deleteReminderFromFirestore = async (reminderId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/reminders/${reminderId}`));
    } catch (e) {
      console.error("Failed to delete reminder", e);
    }
  };

  useEffect(() => {
    const unlockAudio = () => {
      // Just initialize audio context on first interaction
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        ctx.resume();
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const dismissAlarm = (completeTask: boolean = false) => {
    if (activeAudioRef.current) {
      activeAudioRef.current.stop();
      activeAudioRef.current = null;
    }
    
    if (completeTask && activeAlarm) {
      const id = activeAlarm.id;
      setReminders(prev => {
        const reminder = prev.find(r => r.id === id);
        if (!reminder || reminder.completed) return prev;
        
        reminderTimeouts.current[id] = setTimeout(() => {
          setReminders(currentReminders => currentReminders.filter(r => r.id !== id));
          delete reminderTimeouts.current[id];
          deleteReminderFromFirestore(id);
        }, 5000);
        
        const updated = { ...reminder, completed: true };
        saveReminderToFirestore(updated);
        return prev.map(r => r.id === id ? updated : r);
      });
    }
    
    setActiveAlarm(null);
  };

  useEffect(() => {
    // Request Web Notification permissions
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(e => console.warn('Notification permission request failed:', e));
      }
    } catch (e) {
      console.warn('Notification API blocked:', e);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered'))
        .catch(err => console.error('SW registration failed', err));
    }

    // Handle Capacitor Local Notification taps and request permissions
    let listenerHandle: any = null;
    (async () => {
      try {
        // Request permissions for Capacitor Local Notifications
        const permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }

        // Create high-priority channel for alarms
        await LocalNotifications.createChannel({
          id: 'alarm_channel',
          name: 'Alarms',
          description: 'High priority alarms',
          importance: 5, // Importance.High (heads-up notification)
          visibility: 1, // Visibility.Public
          vibration: true,
        });

        // Register action types (buttons on the notification)
        await LocalNotifications.registerActionTypes({
          types: [
            {
              id: 'ALARM_ACTIONS',
              actions: [
                { id: 'dismiss', title: 'Dismiss', destructive: true },
                { id: 'snooze', title: 'Snooze (10m)' }
              ]
            }
          ]
        });

        listenerHandle = await LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
          const numericId = notificationAction.notification.id;
          const actionId = notificationAction.actionId;
          
          setReminders(prev => {
            const reminder = prev.find(r => {
              const id = Math.abs(r.id.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
              }, 0));
              return id === numericId;
            });
            
            if (reminder && !reminder.completed) {
              if (actionId === 'dismiss') {
                // Mark as completed
                const updated = { ...reminder, completed: true };
                saveReminderToFirestore(updated);
                return prev.map(r => r.id === reminder.id ? updated : r);
              } else if (actionId === 'snooze') {
                // Snooze for 10 minutes
                const now = new Date();
                const snoozeTime = new Date(now.getTime() + 10 * 60000);
                const newDate = format(snoozeTime, 'yyyy-MM-dd');
                const newTime = format(snoozeTime, 'HH:mm');
                const updatedReminder = { ...reminder, date: newDate, time: newTime, notified: false };
                
                // Reschedule
                setTimeout(() => {
                  scheduleNotification(updatedReminder);
                }, 100);
                
                saveReminderToFirestore(updatedReminder);
                return prev.map(r => r.id === reminder.id ? updatedReminder : r);
              } else {
                // Default tap, open app and show alarm modal
                setActiveAlarm(reminder);
              }
            }
            return prev;
          });
        });
      } catch (e) {
        console.warn('Capacitor LocalNotifications listener failed:', e);
      }
    })();

    return () => {
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove();
      }
    };
  }, []);

  const cancelNotification = async (id: string) => {
    try {
      const numericId = Math.abs(id.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0));
      await LocalNotifications.cancel({ notifications: [{ id: numericId }] });
    } catch (e) {
      console.warn('Failed to cancel local notification:', e);
    }
  };

  const scheduleNotification = async (reminder: Reminder) => {
    if (!reminder.date || !reminder.time) return;

    const reminderTime = new Date(`${reminder.date}T${reminder.time}`).getTime();
    if (reminderTime <= Date.now()) return;

    try {
      // Use Capacitor Local Notifications if available
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        const requestStatus = await LocalNotifications.requestPermissions();
        if (requestStatus.display !== 'granted') return;
      }

      // Generate a numeric ID from the string ID
      const numericId = Math.abs(reminder.id.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0));

      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'TaskMaster Reminder',
            body: reminder.text,
            id: numericId,
            schedule: { at: new Date(reminderTime), allowWhileIdle: true },
            sound: 'beep.wav',
            channelId: 'alarm_channel',
            actionTypeId: 'ALARM_ACTIONS',
            extra: null
          }
        ]
      });
    } catch (e) {
      console.warn('Capacitor LocalNotifications failed, falling back to Web API:', e);
      // Fallback to Web API
      try {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
        
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          if ('showTrigger' in Notification.prototype && 'TimestampTrigger' in window) {
            const soundUrl = ALARM_SOUNDS.find(s => s.id === alarmSoundId)?.url || ALARM_SOUNDS[0].url;
            await registration.showNotification('TaskMaster Reminder', {
              body: reminder.text,
              icon: '/vite.svg',
              tag: reminder.id,
              // @ts-ignore
              sound: soundUrl,
              // @ts-ignore
              showTrigger: new window.TimestampTrigger(reminderTime)
            });
          }
        }
      } catch (err) {
        console.error('Failed to schedule notification', err);
      }
    }
  };

  useEffect(() => {
    const playAlarm = (reminder: Reminder) => {
      if (activeAudioRef.current) {
        activeAudioRef.current.stop();
      }
      activeAudioRef.current = playAlarmSound(alarmSoundId, true);
      setActiveAlarm(reminder);
    };

    const checkReminders = () => {
      const now = new Date();

      setReminders(prev => {
        let updated = false;
        const next = prev.map(reminder => {
          if (!reminder.completed && !reminder.notified && reminder.date && reminder.time) {
            const reminderTime = new Date(`${reminder.date}T${reminder.time}`).getTime();
            const timeDiff = now.getTime() - reminderTime;
            
            // Trigger if due now or within the last 15 minutes (compensates for WebView sleep)
            if (timeDiff >= 0 && timeDiff < 15 * 60 * 1000) {
              playAlarm(reminder);
              
              (async () => {
                try {
                  // Check if Capacitor is available by checking permissions
                  // If it is, we don't need to fire an immediate notification because
                  // the scheduled one will fire.
                  const permStatus = await LocalNotifications.checkPermissions();
                  if (permStatus.display === 'granted') {
                    // Already handled by OS schedule
                    return;
                  } else {
                    throw new Error('Capacitor not available or no permission');
                  }
                } catch (capError) {
                  // Fallback to Web API
                  try {
                    if ('Notification' in window && Notification.permission === 'granted') {
                      if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.ready.then(registration => {
                          registration.showNotification('TaskMaster Reminder', {
                            body: reminder.text,
                            icon: '/vite.svg',
                            tag: reminder.id,
                          });
                        });
                      } else {
                        new Notification('TaskMaster Reminder', {
                          body: reminder.text,
                          icon: '/vite.svg',
                          tag: reminder.id,
                        });
                      }
                    }
                  } catch (e) {
                    console.warn('Notification failed:', e);
                  }
                }
              })();
              
              updated = true;
              const updatedReminder = { ...reminder, notified: true };
              saveReminderToFirestore(updatedReminder);
              return updatedReminder;
            }
          }
          return reminder;
        });
        return updated ? next : prev;
      });
    };

    const interval = setInterval(checkReminders, 10000);
    return () => clearInterval(interval);
  }, [alarmSoundId]);

  const handleToggle = (taskId: string, dateStr: string) => {
    setCompletions(prev => {
      const isCompleted = !(prev[taskId]?.[dateStr]);
      saveCompletionToFirestore(taskId, dateStr, isCompleted);
      
      const newCompletions = {
        ...prev,
        [taskId]: {
          ...(prev[taskId] || {}),
          [dateStr]: isCompleted
        }
      };

      // Check for celebration
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      if (isCompleted && dateStr === todayStr && tasks.length > 0) {
        const allCompleted = tasks.every(t => newCompletions[t.id]?.[todayStr]);
        if (allCompleted) {
          setShowCelebration(true);
          playCelebrationSound();
          
          // Multiple party popups (confetti bursts)
          const duration = 3000;
          const end = Date.now() + duration;

          const frame = () => {
            confetti({
              particleCount: 5,
              angle: 60,
              spread: 55,
              origin: { x: 0 },
              colors: ['#4F8AFB', '#FFD700', '#FF6B6B', '#4CAF50']
            });
            confetti({
              particleCount: 5,
              angle: 120,
              spread: 55,
              origin: { x: 1 },
              colors: ['#4F8AFB', '#FFD700', '#FF6B6B', '#4CAF50']
            });

            if (Date.now() < end) {
              requestAnimationFrame(frame);
            }
          };
          frame();
          
          // Hide popup and clear confetti after 3 seconds
          setTimeout(() => {
            setShowCelebration(false);
            confetti.reset();
          }, 3000);
        }
      }

      return newCompletions;
    });
  };

  const handleAddTask = () => {
    const newId = Date.now().toString() + Math.random().toString(36).substring(2);
    const newTask = { 
      id: newId, 
      uid: user?.uid || 'local-user',
      title: 'New Task',
      createdAt: new Date().toISOString()
    };
    
    setTasks(prev => [...prev, newTask]);
    saveTaskToFirestore(newTask);
    return newId;
  };

  const handleUpdateTask = (id: string, title: string) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, title } : t);
      const task = updated.find(t => t.id === id);
      if (task && title.trim().length > 0) {
        saveTaskToFirestore(task);
      }
      return updated;
    });
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setCompletions(prev => {
      const newCompletions = { ...prev };
      delete newCompletions[id];
      return newCompletions;
    });
    deleteTaskFromFirestore(id);
  };

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleAddReminder = (text: string, date: string, time: string) => {
    const newReminder: Reminder = {
      id: Date.now().toString() + Math.random().toString(36).substring(2),
      uid: user?.uid || 'local-user',
      text,
      date,
      time,
      completed: false,
      notified: false
    };
    setReminders(prev => [...prev, newReminder]);
    scheduleNotification(newReminder);
    saveReminderToFirestore(newReminder);
  };

  const handleToggleReminder = (id: string) => {
    setReminders(prev => {
      const reminder = prev.find(r => r.id === id);
      if (!reminder) return prev;
      
      const isNowCompleted = !reminder.completed;
      
      if (isNowCompleted) {
        cancelNotification(id);
        // Set a timeout to delete it after 5 seconds
        reminderTimeouts.current[id] = setTimeout(() => {
          setReminders(currentReminders => currentReminders.filter(r => r.id !== id));
          delete reminderTimeouts.current[id];
          deleteReminderFromFirestore(id);
        }, 5000);
      } else {
        // Un-toggled, clear the timeout if it exists
        if (reminderTimeouts.current[id]) {
          clearTimeout(reminderTimeouts.current[id]);
          delete reminderTimeouts.current[id];
        }
        // Reschedule if it's in the future
        scheduleNotification({ ...reminder, completed: false });
      }

      const updated = { ...reminder, completed: isNowCompleted };
      saveReminderToFirestore(updated);
      return prev.map(r => r.id === id ? updated : r);
    });
  };

  const handleDeleteReminder = (id: string) => {
    if (reminderTimeouts.current[id]) {
      clearTimeout(reminderTimeouts.current[id]);
      delete reminderTimeouts.current[id];
    }
    cancelNotification(id);
    setReminders(prev => prev.filter(r => r.id !== id));
    deleteReminderFromFirestore(id);
  };

  const handleUpdateReminder = (id: string, text: string, date: string, time: string) => {
    setReminders(prev => {
      const updated = prev.map(r => {
        if (r.id === id) {
          const updatedReminder = { ...r, text, date, time, notified: false };
          scheduleNotification(updatedReminder);
          saveReminderToFirestore(updatedReminder);
          return updatedReminder;
        }
        return r;
      });
      return updated;
    });
  };

  const snoozeAlarm = () => {
    if (activeAlarm) {
      const now = new Date();
      const snoozeTime = new Date(now.getTime() + snoozeDuration * 60000); // snoozeDuration minutes from now
      const newDate = format(snoozeTime, 'yyyy-MM-dd');
      const newTime = format(snoozeTime, 'HH:mm');

      const updatedReminder = { ...activeAlarm, date: newDate, time: newTime, notified: false };
      
      setReminders(prev => prev.map(r => 
        r.id === activeAlarm.id ? updatedReminder : r
      ));
      
      saveReminderToFirestore(updatedReminder);
      scheduleNotification(updatedReminder);
    }
    dismissAlarm(false);
  };

  const dates = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className={`h-[100dvh] overflow-hidden font-sans transition-colors duration-300 flex flex-col ${isDark ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Celebration Popup */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`p-8 rounded-2xl shadow-2xl transform animate-in zoom-in-95 duration-500 flex flex-col items-center gap-4 ${isDark ? 'bg-[#151C2C] text-white' : 'bg-white text-slate-900'}`}>
            <div className="w-20 h-20 bg-yellow-400/20 rounded-full flex items-center justify-center text-4xl">
              🎉
            </div>
            <h2 className="text-3xl font-bold text-center">{t(language, 'home.congratulations') || 'Congratulations! 🥳'}</h2>
            <p className={`text-center max-w-[250px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t(language, 'home.all_tasks_completed') || "You've completed all your daily tasks! Time to celebrate your amazing consistency. 🎊"}
            </p>
            <button 
              onClick={() => {
                setShowCelebration(false);
                confetti.reset();
              }}
              className="mt-4 px-6 py-2 bg-[#4F8AFB] hover:bg-blue-600 text-white font-medium rounded-full transition-colors"
            >
              {t(language, 'home.awesome') || 'Awesome'}
            </button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className={`w-full px-4 py-2 flex justify-between items-center shrink-0 transition-colors duration-300 ${isDark ? 'bg-[#0B1120]' : 'bg-white'}`}>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#4F8AFB]" />
          <span className="font-bold tracking-wide">TaskMaster</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsDark(!isDark)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col p-4 sm:p-6 shadow-2xl bg-white/5 dark:bg-black/20 min-h-0">
          
          {/* Header (Month Navigation) */}
          <div className="flex items-center justify-between mb-4 px-2 shrink-0">
            <div className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shrink-0 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <button onClick={handlePrevMonth} className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-300'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleToday} className="text-[10px] sm:text-xs font-bold px-2 sm:px-4 uppercase tracking-wider whitespace-nowrap">
                {currentMonth.toLocaleDateString(language, { month: 'long', year: 'numeric' })}
              </button>
              <button onClick={handleNextMonth} className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-300'}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={handleToday} 
              className={`px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors shrink-0 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
            >
              {t(language, 'nav.today')}
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
            {activeTab === 'home' && (
              <HabitTable 
                tasks={tasks}
                completions={completions}
                dates={dates}
                onToggle={handleToggle}
                onAdd={handleAddTask}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
                isDark={isDark}
                language={language}
              />
            )}
            {activeTab === 'overview' && (
              <HabitChart 
                completions={completions}
                currentMonth={currentMonth}
                totalTasks={tasks.length}
                isDark={isDark}
                language={language}
              />
            )}
            {activeTab === 'reminders' && (
              <Reminders
                reminders={reminders}
                onAdd={handleAddReminder}
                onToggle={handleToggleReminder}
                onDelete={handleDeleteReminder}
                onUpdate={handleUpdateReminder}
                isDark={isDark}
                language={language}
              />
            )}
            {activeTab === 'profile' && (
              <Profile isDark={isDark} user={user} userData={userData} language={language} />
            )}
          </div>
          
          <div className="text-center mt-4 pt-2 pb-2 space-y-1 shrink-0">
            <p className={`text-[10px] font-medium transition-colors ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Developed by RK</p>
          </div>

        {/* Bottom Navigation */}
        <div className={`shrink-0 flex items-center justify-around py-1.5 border-t mt-auto ${isDark ? 'border-slate-800 bg-[#0B1120]' : 'border-slate-200 bg-slate-50'}`}>
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-0.5 p-1 transition-colors ${activeTab === 'home' ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t(language, 'nav.home')}</span>
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center gap-0.5 p-1 transition-colors ${activeTab === 'overview' ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
          >
            <BarChart2 className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t(language, 'nav.overview')}</span>
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className={`flex flex-col items-center gap-0.5 p-1 transition-colors ${activeTab === 'reminders' ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
          >
            <Bell className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t(language, 'nav.reminders')}</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-0.5 p-1 transition-colors ${activeTab === 'profile' ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t(language, 'nav.profile')}</span>
          </button>
        </div>

      </div>

      {/* Alarm Modal */}
      {activeAlarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <BellRing className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {activeAlarm.time}
              </h2>
              <p className={`text-lg mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {activeAlarm.text}
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => dismissAlarm(true)}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                  {t(language, 'alarm.mark_completed') || 'Mark as Completed'}
                </button>
                
                <div className="flex gap-2">
                  <select 
                    value={snoozeDuration}
                    onChange={(e) => setSnoozeDuration(Number(e.target.value))}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium outline-none transition-colors ${isDark ? 'bg-slate-800 text-white border-slate-700 focus:border-blue-500' : 'bg-slate-100 text-slate-900 border-slate-200 focus:border-blue-500'} border`}
                  >
                    <option value={5}>5 {t(language, 'alarm.min') || 'min'}</option>
                    <option value={10}>10 {t(language, 'alarm.min') || 'min'}</option>
                    <option value={15}>15 {t(language, 'alarm.min') || 'min'}</option>
                    <option value={30}>30 {t(language, 'alarm.min') || 'min'}</option>
                  </select>
                  <button
                    onClick={snoozeAlarm}
                    className={`flex-[2] py-3 px-4 rounded-xl font-medium transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
                  >
                    {t(language, 'alarm.snooze') || 'Snooze'}
                  </button>
                </div>
                
                <button
                  onClick={() => dismissAlarm(false)}
                  className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${isDark ? 'bg-transparent hover:bg-slate-800 text-slate-400' : 'bg-transparent hover:bg-slate-100 text-slate-500'}`}
                >
                  {t(language, 'alarm.dismiss') || 'Dismiss'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Profile Setup Modal */}
      {showProfileSetup && user && (
        <ProfileSetupModal 
          user={user} 
          userData={userData} 
          onComplete={() => setShowProfileSetup(false)} 
        />
      )}
    </div>
  );
}
