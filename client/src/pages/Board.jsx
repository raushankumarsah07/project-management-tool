import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useBoard from '../hooks/useBoard.js';
import { applyMove } from '../utils';
import Column from '../components/Column.jsx';
import TaskModal from '../components/TaskModal.jsx';
import MembersModal from '../components/MembersModal.jsx';
import Avatar from '../components/Avatar.jsx';

export default function Board() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { project, setProject, tasks, setTasks, upsert, removeTask, online, error } = useBoard(id);

  const [openTask, setOpenTask] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [newCol, setNewCol] = useState('');
  const [addingCol, setAddingCol] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [projName, setProjName] = useState('');
  const [query, setQuery] = useState('');

  if (error)
    return (
      <main className="container"><div className="card center"><h2>Can't open this project</h2><p className="error">{error}</p>
        <button className="btn" onClick={() => nav('/')}>Back to projects</button></div></main>
    );
  if (!project) return <p className="center muted pad">Loading board…</p>;

  const isOwner = project.owner === user._id;
  const call = async (fn) => { try { return await fn(); } catch (err) { toast(errorMessage(err)); } };

  // drag & drop: update the screen instantly, then tell the server (roll back if it fails)
  const move = async (taskId, columnId, index) => {
    const before = tasks;
    setTasks(applyMove(tasks, taskId, columnId, index));
    try {
      await api.put(`/tasks/${taskId}/move`, { columnId, index });
    } catch (err) {
      setTasks(before);
      toast(errorMessage(err));
    }
  };

  const addTask = (columnId, title) =>
    call(async () => { const { data } = await api.post(`/projects/${id}/tasks`, { title, columnId }); upsert([data]); });

  const renameColumn = (colId, name) =>
    call(async () => { const { data } = await api.put(`/projects/${id}/columns/${colId}`, { name }); setProject(data); });

  const deleteColumn = (col) => {
    if (!window.confirm(`Delete the column “${col.name}”?`)) return;
    call(async () => { const { data } = await api.delete(`/projects/${id}/columns/${col._id}`); setProject(data); });
  };

  const addColumn = async (e) => {
    e.preventDefault();
    if (!newCol.trim()) return;
    await call(async () => { const { data } = await api.post(`/projects/${id}/columns`, { name: newCol }); setProject(data); });
    setNewCol('');
    setAddingCol(false);
  };

  const saveProjectName = async () => {
    setRenaming(false);
    if (projName.trim() && projName.trim() !== project.name)
      call(async () => { const { data } = await api.put(`/projects/${id}`, { name: projName }); setProject(data); });
  };

  const deleteProject = () => {
    if (!window.confirm('Delete this project, all its tasks and comments? This cannot be undone.')) return;
    call(async () => { await api.delete(`/projects/${id}`); nav('/'); });
  };

  const visible = mineOnly ? tasks.filter((t) => t.assignee?._id === user._id) : tasks;
  const searched = query.trim() ? visible.filter((task) => task.title.toLowerCase().includes(query.toLowerCase())) : visible;
  const lastColumnId = project.columns[project.columns.length - 1]?._id;
  const completed = tasks.filter((task) => task.column === lastColumnId).length;
  const overdue = tasks.filter((task) => task.dueDate && task.column !== lastColumnId && new Date(task.dueDate) < new Date()).length;

  return (
    <div className="board-page">
      <div className="board-head">
        <div>
          <p className="eyebrow">PROJECT BOARD <span className={online.length ? 'live-dot' : ''}>● {online.length ? 'LIVE' : 'OFFLINE'}</span></p>
          {renaming ? (
            <input
              className="proj-input"
              autoFocus
              value={projName}
              maxLength={80}
              onChange={(e) => setProjName(e.target.value)}
              onBlur={saveProjectName}
              onKeyDown={(e) => e.key === 'Enter' && saveProjectName()}
            />
          ) : (
            <h1 onDoubleClick={() => { if (isOwner) { setProjName(project.name); setRenaming(true); } }} title={isOwner ? 'Double-click to rename' : undefined}>
              {project.name}
            </h1>
          )}
          {project.description && <p className="muted small">{project.description}</p>}
        </div>

        <div className="row wrap">
          <div className="board-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a task…" aria-label="Find a task" /></div>
          <label className="check">
            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} /> Only my tasks
          </label>
          <div className="avatars" aria-label="Project members">
            {project.members.map((m) => <Avatar key={m._id} name={m.name} size={30} online={online.includes(m._id)} />)}
          </div>
          <div className="board-insights">
            <span><b>{tasks.length}</b> total tasks</span><span className="stat-green"><b>{completed}</b> completed</span><span className="stat-red"><b>{overdue}</b> overdue</span>
            {query && <span className="filter-note">Showing matches for “{query}”</span>}
          </div>
          <button className="btn ghost small" onClick={() => setShowMembers(true)}>Members</button>
          {isOwner && <button className="btn ghost small danger-text" onClick={deleteProject}>Delete project</button>}
        </div>
      </div>

      <div className="board">
        {project.columns.map((col) => (
          <Column
            key={col._id}
            column={col}
            tasks={searched.filter((t) => t.column === col._id).sort((a, b) => a.position - b.position)}
            dragId={dragId}
            isLast={col._id === lastColumnId}
            onOpen={setOpenTask}
            onAddTask={addTask}
            onRename={renameColumn}
            onDelete={deleteColumn}
            onDragStart={(tid) => setTimeout(() => setDragId(tid), 0)}
            onDragEnd={() => setDragId(null)}
            onMove={move}
          />
        ))}

        <div className="column add-col">
          {addingCol ? (
            <form onSubmit={addColumn}>
              <input autoFocus value={newCol} maxLength={40} placeholder="Column name" onChange={(e) => setNewCol(e.target.value)} />
              <div className="row">
                <button className="btn small" disabled={!newCol.trim()}>Add</button>
                <button type="button" className="btn ghost small" onClick={() => setAddingCol(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button className="add-btn" onClick={() => setAddingCol(true)}>+ Add column</button>
          )}
        </div>
      </div>

      {openTask && (
        <TaskModal
          taskId={openTask}
          tasks={tasks}
          project={project}
          upsert={upsert}
          removeTask={removeTask}
          onMove={move}
          onClose={() => setOpenTask(null)}
        />
      )}
      {showMembers && (
        <MembersModal project={project} online={online} setProject={setProject} onClose={() => setShowMembers(false)} onLeft={() => nav('/')} />
      )}
    </div>
  );
}
