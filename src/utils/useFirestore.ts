import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, getDocs } from 'firebase/firestore';
import { Task, Completions, Reminder } from '../types';
import { handleFirestoreError, OperationType } from './firebaseUtils';

export function useFirestore() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completions>({});
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (!u) {
        setTasks([]);
        setCompletions({});
        setReminders([]);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const userId = user.uid;

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
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${userId}/reminders`));

    return () => {
      tasksUnsub();
      completionsUnsub();
      remindersUnsub();
    };
  }, [user]);

  const addTask = async (task: Task) => {
    if (!user) return;
    try {
      await setDoc(doc(db, `users/${user.uid}/tasks/${task.id}`), { ...task, uid: user.uid });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/tasks/${task.id}`);
    }
  };

  const updateTask = async (task: Task) => {
    if (!user) return;
    try {
      await setDoc(doc(db, `users/${user.uid}/tasks/${task.id}`), { ...task, uid: user.uid }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/tasks/${task.id}`);
    }
  };

  const deleteTask = async (taskId: string) => {
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
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/tasks/${taskId}`);
    }
  };

  const toggleCompletion = async (taskId: string, dateStr: string, completed: boolean) => {
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
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/completions/${completionId}`);
    }
  };

  const addReminder = async (reminder: Reminder) => {
    if (!user) return;
    try {
      await setDoc(doc(db, `users/${user.uid}/reminders/${reminder.id}`), { ...reminder, uid: user.uid });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/reminders/${reminder.id}`);
    }
  };

  const updateReminder = async (reminder: Reminder) => {
    if (!user) return;
    try {
      await setDoc(doc(db, `users/${user.uid}/reminders/${reminder.id}`), { ...reminder, uid: user.uid }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/reminders/${reminder.id}`);
    }
  };

  const deleteReminder = async (reminderId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/reminders/${reminderId}`));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/reminders/${reminderId}`);
    }
  };

  return {
    user,
    loading,
    tasks,
    completions,
    reminders,
    addTask,
    updateTask,
    deleteTask,
    toggleCompletion,
    addReminder,
    updateReminder,
    deleteReminder
  };
}
