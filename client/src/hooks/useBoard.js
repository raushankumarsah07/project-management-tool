import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// Loads one project board and keeps it in sync with everyone else through WebSockets
export default function useBoard(projectId) {
  const socket = useSocket();
  const nav = useNavigate();
  const toast = useToast();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [online, setOnline] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/projects/${projectId}`);
      setProject(data.project);
      setTasks(data.tasks);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [projectId]);

  useEffect(() => {
    setProject(null);
    setTasks([]);
    load();
  }, [load]);

  // merge changed tasks into the list (works for new, edited and moved tasks)
  const upsert = useCallback((list) => {
    setTasks((prev) => {
      const map = new Map(prev.map((t) => [t._id, t]));
      list.forEach((t) => map.set(t._id, t));
      return [...map.values()];
    });
  }, []);

  const removeTask = useCallback((id) => setTasks((prev) => prev.filter((t) => t._id !== id)), []);

  useEffect(() => {
    if (!socket) return;
    const join = () => socket.emit('project:join', { projectId });
    const onReconnect = () => { join(); load(); }; // catch up on anything missed while offline

    if (socket.connected) join();
    socket.on('connect', onReconnect);
    socket.on('tasks:upsert', ({ tasks: list }) => upsert(list));
    socket.on('task:deleted', ({ taskId }) => removeTask(taskId));
    socket.on('project:updated', ({ project: p }) => { if (p._id === projectId) setProject(p); });
    socket.on('presence', (p) => { if (p.projectId === projectId) setOnline(p.online); });
    socket.on('project:removed', ({ projectId: id }) => {
      if (id === projectId) {
        toast('You no longer have access to that project.');
        nav('/');
      }
    });

    return () => {
      socket.emit('project:leave', { projectId });
      socket.off('connect', onReconnect);
      socket.off('tasks:upsert');
      socket.off('task:deleted');
      socket.off('project:updated');
      socket.off('presence');
      socket.off('project:removed');
    };
  }, [socket, projectId, load, upsert, removeTask, nav, toast]);

  return { project, setProject, tasks, setTasks, upsert, removeTask, online, error };
}
