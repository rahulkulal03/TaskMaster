export interface Task {
  id: string;
  uid?: string;
  title: string;
  createdAt?: string;
}

export type Completions = Record<string, Record<string, boolean>>;
