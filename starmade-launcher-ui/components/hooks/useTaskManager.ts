import { useState, useEffect, useRef } from 'react';
import { TaskState } from '@xmcl/runtime-api';

export interface TaskItem {
  id: string;
  taskId: string;
  time: Date;
  message: string;
  path: string;
  param: Record<string, any>;
  throughput: number;
  state: TaskState;
  progress: number;
  total: number;
  children: TaskItem[];
}

declare global {
  interface Window {
    taskMonitor: {
      on(
        event: 'task-update',
        listener: (payload: { adds: any[]; updates: any[] }) => void
      ): void;
      removeListener(
        event: 'task-update',
        listener: (payload: { adds: any[]; updates: any[] }) => void
      ): void;
      subscribe(): Promise<any[]>;
      unsubscribe(): void;
      pause(taskId: string): void;
      resume(taskId: string): void;
      cancel(taskId: string): void;
    };
  }
}

export function useTaskManager() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const cacheRef = useRef<Record<string, TaskItem>>({});

  useEffect(() => {
    const getTaskItem = (payload: any): TaskItem => ({
      id: `${payload.uuid}${payload.id}`,
      taskId: payload.uuid,
      time: new Date(payload.time),
      message:
        'error' in payload ? payload.error : payload.from ?? payload.to ?? '',
      path: payload.path,
      param: payload.param,
      throughput: 0,
      state: 'state' in payload ? payload.state : TaskState.Running,
      progress: 'progress' in payload ? payload.progress : 0,
      total: 'total' in payload ? payload.total : -1,
      children: [],
    });

    const onTaskUpdate = (payload: { adds: any[]; updates: any[] }) => {
      const { adds, updates } = payload;
      const cache = cacheRef.current;

      // Handle new tasks
      for (const add of adds) {
        const id = `${add.uuid}${add.id}`;
        if (cache[id]) continue;

        const item = getTaskItem(add);
        cache[id] = item;
        setTasks((prev) => [item, ...prev]);
      }

      // Handle updates to existing tasks
      for (const update of updates) {
        const id = `${update.uuid}${update.id}`;
        const item = cache[id];
        if (!item) continue;

        if (update.state !== undefined) item.state = update.state;
        if (update.progress !== undefined) item.progress = update.progress;
        if (update.total !== undefined) item.total = update.total;
        item.time = new Date(update.time);

        if (update.error || update.from || update.to) {
          item.message = update.error ?? update.from ?? update.to;
        }
      }

      // Force re-render
      setTasks((prev) => [...prev]);
    };

    window.taskMonitor.on('task-update', onTaskUpdate);
    window.taskMonitor.subscribe().then((payload) => {
      const initialTasks = payload.map(getTaskItem);
      initialTasks.forEach((t) => {
        cacheRef.current[t.id] = t;
      });
      setTasks(initialTasks);
    });

    return () => {
      window.taskMonitor.removeListener('task-update', onTaskUpdate);
      window.taskMonitor.unsubscribe();
    };
  }, []);

  const pause = (task: TaskItem) => window.taskMonitor.pause(task.taskId);
  const resume = (task: TaskItem) => window.taskMonitor.resume(task.taskId);
  const cancel = (task: TaskItem) => window.taskMonitor.cancel(task.taskId);

  return { tasks, pause, resume, cancel };
}
