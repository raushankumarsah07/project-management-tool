import { useEffect, useState } from 'react';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PRIORITIES, dateInput, timeAgo } from '../utils';
import Modal from './Modal.jsx';
import Avatar from './Avatar.jsx';

export default function TaskModal({ taskId, tasks, project, upsert, removeTask, onMove, onClose }) {
  const { user } = useAuth();
  const socket = useSocket();
  const toast = useToast();
  const task = tasks.find((t) => t._id === taskId);

  const [title, setTitle] = useState(task?.title || '');
  const [desc, setDesc] = useState(task?.description || '');
  const [comments, setComments] = useState(null);
  const [text, setText] = useState('');

  // task was deleted by someone else while open
  useEffect(() => { if (!task) onClose(); }, [task, onClose]);

  useEffect(() => {
    setComments(null);
    api.get(`/tasks/${taskId}/comments`).then((r) => setComments(r.data)).catch((e) => toast(errorMessage(e)));
  }, [taskId, toast]);

  // comments from teammates appear live
  useEffect(() => {
    if (!socket) return;
    const created = ({ comment }) => {
      if (comment.task === taskId) setComments((c) => (c && !c.some((x) => x._id === comment._id) ? [...c, comment] : c));
    };
    const deleted = ({ taskId: id, commentId }) => {
      if (id === taskId) setComments((c) => c && c.filter((x) => x._id !== commentId));
    };
    socket.on('comment:created', created);
    socket.on('comment:deleted', deleted);
    return () => { socket.off('comment:created', created); socket.off('comment:deleted', deleted); };
  }, [socket, taskId]);

  if (!task) return null;

  const save = async (patch) => {
    try {
      const { data } = await api.put(`/tasks/${taskId}`, patch);
      upsert([data]);
    } catch (err) { toast(errorMessage(err)); }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const { data } = await api.post(`/tasks/${taskId}/comments`, { text });
      setComments((c) => (c.some((x) => x._id === data._id) ? c : [...c, data]));
      setText('');
    } catch (err) { toast(errorMessage(err)); }
  };

  const deleteComment = async (id) => {
    try {
      await api.delete(`/tasks/${taskId}/comments/${id}`);
      setComments((c) => c.filter((x) => x._id !== id));
    } catch (err) { toast(errorMessage(err)); }
  };

  const deleteTask = async () => {
    if (!window.confirm('Delete this task and its comments?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      removeTask(taskId);
      onClose();
    } catch (err) { toast(errorMessage(err)); }
  };

  const changeColumn = (columnId) => {
    const index = tasks.filter((t) => t.column === columnId && t._id !== taskId).length; // end of column
    onMove(taskId, columnId, index);
  };

  return (
    <Modal title="Task details" onClose={onClose} wide>
      <div className="task-layout">
        <div className="task-main">
          <input
            className="title-input"
            value={title}
            maxLength={120}
            aria-label="Task title"
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => (title.trim() && title.trim() !== task.title ? save({ title }) : setTitle(task.title))}
          />

          <label>Description
            <textarea
              rows={4}
              value={desc}
              maxLength={2000}
              placeholder="Add more detail…"
              onChange={(e) => setDesc(e.target.value)}
              onBlur={() => desc !== task.description && save({ description: desc })}
            />
          </label>

          <h3 className="sub">Comments</h3>
          <div className="comments">
            {comments === null && <p className="muted small">Loading…</p>}
            {comments?.length === 0 && <p className="muted small">No comments yet. Start the discussion.</p>}
            {comments?.map((c) => (
              <div className="comment" key={c._id}>
                <Avatar name={c.author.name} size={28} />
                <div className="grow">
                  <div><span className="strong">{c.author.name}</span> <span className="muted small">{timeAgo(c.createdAt)}</span></div>
                  <p>{c.text}</p>
                </div>
                {c.author._id === user._id && <button className="link-btn" onClick={() => deleteComment(c._id)}>Delete</button>}
              </div>
            ))}
          </div>
          <form className="row" onSubmit={addComment}>
            <input value={text} maxLength={1000} placeholder="Write a comment…" onChange={(e) => setText(e.target.value)} />
            <button className="btn small" disabled={!text.trim()}>Send</button>
          </form>
        </div>

        <aside className="task-side">
          <label>Status
            <select value={task.column} onChange={(e) => changeColumn(e.target.value)}>
              {project.columns.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </label>
          <label>Assigned to
            <select value={task.assignee?._id || ''} onChange={(e) => save({ assignee: e.target.value || null })}>
              <option value="">Unassigned</option>
              {project.members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          </label>
          <label>Priority
            <select value={task.priority} onChange={(e) => save({ priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
            </select>
          </label>
          <label>Due date
            <input type="date" value={dateInput(task.dueDate)} onChange={(e) => save({ dueDate: e.target.value || null })} />
          </label>
          <p className="muted small">Created by {task.createdBy?.name || 'someone'} · {timeAgo(task.createdAt)}</p>
          <button className="btn danger wide" onClick={deleteTask}>Delete task</button>
        </aside>
      </div>
    </Modal>
  );
}
