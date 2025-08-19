import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emitWithAck } from '@/lib/socketClient';
import { Task } from '@/types';
import { useAuth } from '@/contexts/auth';

export default function TasksToday() {
  const [desc, setDesc] = useState('');
  const qc = useQueryClient();
  const { user } = useAuth();

  const listQuery = useQuery({
    queryKey: ['tasksToday'],
    queryFn: () => emitWithAck<unknown, { tasks: Task[] }>('tasks:listToday', {}).then((r) => r.tasks),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (description: string) => emitWithAck<{ description: string }, { task: Task }>('tasks:create', { description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasksToday'] });
      setDesc('');
    },
  });

  const disabled = desc.trim().length === 0 || desc.length > 280;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    createMutation.mutate(desc.trim());
  };

  if (listQuery.isLoading) return <div>Loading...</div>;
  if (listQuery.isError) return <div>Error loading tasks</div>;

  return (
    <div className="p-4 space-y-4">
      <form onSubmit={onSubmit} className="space-y-2">
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value.slice(0, 280))}
          className="border p-2 w-full"
          maxLength={280}
          aria-label="Task description"
        />
        <button type="submit" disabled={disabled} className="px-3 py-1 bg-blue-500 text-white disabled:opacity-50">
          Add Task
        </button>
      </form>
      {listQuery.data && listQuery.data.length === 0 && <div>No tasks for today</div>}
      {listQuery.data && listQuery.data.length > 0 && (
        <ul className="list-disc pl-5">
          {listQuery.data.map((t) => (
            <li key={t._id}>{t.description}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
