import Avatar from './Avatar.jsx';
import { formatDue, isOverdue } from '../utils';

export default function TaskCard({ task, dragging, onOpen, onDragStart, onDragEnd, isDone }) {
  const overdue = task.dueDate && !isDone && isOverdue(task.dueDate);
  return (
    <div
      className={`task ${dragging ? 'dragging' : ''}`}
      data-task={task._id}
      draggable
      tabIndex={0}
      role="button"
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task._id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(task._id);
      }}
      onDragEnd={onDragEnd}
    >
      <div className="task-title">{task.title}</div>
      <div className="task-meta">
        <span className={`chip prio-${task.priority}`}>{task.priority}</span>
        {task.dueDate && <span className={`chip ${overdue ? 'overdue' : ''}`}>{formatDue(task.dueDate)}</span>}
        {task.commentsCount > 0 && <span className="muted small">{task.commentsCount} comment{task.commentsCount > 1 ? 's' : ''}</span>}
        <span className="grow" />
        {task.assignee && <Avatar name={task.assignee.name} size={24} />}
      </div>
    </div>
  );
}
