export interface Task {
  id: string;
  uid?: string;
  title: string;
  createdAt?: string;
}

export interface Reminder {
  id: string;
  uid?: string;
  text: string;
  date: string;
  time: string;
  completed: boolean;
  notified?: boolean;
}

export type Completions = Record<string, Record<string, boolean>>;
