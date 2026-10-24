import { useRef, useState } from 'react';
import TaskCard from './TaskCard.jsx';

export default function Column({ column, tasks, dragId, isLast, onOpen, onAddTask, onRename, onDelete, onDragStart, onDragEnd, onMove }) {
  const bodyRef = useRef(null);
  const [over, setOver] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);

  // where in the column should the dropped card land? (compare mouse position to each card's middle)
  const dropIndex = (e) => {
    const cards = [...bodyRef.current.querySelectorAll('[data-task]:not(.dragging)')];
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) return i;
    }
    return cards.length;
  };

  const submitTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onAddTask(column._id, title);
    setTitle('');
  };

  const saveName = () => {
    setEditing(false);
    if (name.trim() && name.trim() !== column.name) onRename(column._id, name.trim());
    else setName(column.name);
  };

  return (
    <section
      className={`column ${over ? 'over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData('text/plain');
        if (id) onMove(id, column._id, dropIndex(e));
        onDragEnd();
      }}
    >
      <header className="col-head">
        {editing ? (
          <input
            className="col-input"
            autoFocus
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setName(column.name); setEditing(false); } }}
          />
        ) : (
          <h3 onDoubleClick={() => setEditing(true)} title="Double-click to rename">{column.name}</h3>
        )}
        <span className="count-pill">{tasks.length}</span>
        <span className="grow" />
        <button className="icon-btn small-btn" onClick={() => setEditing(true)} aria-label={`Rename ${column.name}`}>✎</button>
        <button className="icon-btn small-btn" onClick={() => onDelete(column)} aria-label={`Delete ${column.name}`}>✕</button>
      </header>

      <div className="col-body" ref={bodyRef}>
        {tasks.map((t) => (
          <TaskCard
            key={t._id}
            task={t}
            isDone={isLast}
            dragging={dragId === t._id}
            onOpen={() => onOpen(t._id)}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>

      {adding ? (
        <form className="add-task" onSubmit={submitTask}>
          <textarea
            autoFocus
            rows={2}
            maxLength={120}
            placeholder="Task title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submitTask(e); if (e.key === 'Escape') setAdding(false); }}
          />
          <div className="row">
            <button className="btn small" disabled={!title.trim()}>Add task</button>
            <button type="button" className="btn ghost small" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="add-btn" onClick={() => setAdding(true)}>+ Add a task</button>
      )}
    </section>
  );
}
