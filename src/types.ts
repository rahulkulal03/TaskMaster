export interface Task {
  id: string;
  title: string;
}

export type Completions = Record<string, Record<string, boolean>>;
