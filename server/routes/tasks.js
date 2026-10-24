const router = require('express').Router();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { TASK_POPULATE, str } = require('../utils/dto');
const { notifyMany } = require('../utils/notify');

router.use(auth);

const room = (id) => `project:${id}`;

// Loads the task and its project, and checks the user belongs to that project
async function loadTask(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Task not found.' });
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  const project = await Project.findById(task.project);
  if (!project || !project.members.some((m) => m.equals(req.user.id)))
    return res.status(403).json({ message: "You don't have access to this task." });
  req.task = task;
  req.project = project;
  next();
}

const emitUpsert = (req, tasks) => req.app.get('io').to(room(req.project._id)).emit('tasks:upsert', { tasks });

// ---- Read one task ----
router.get('/:id', loadTask, async (req, res) => {
  res.json(await Task.findById(req.task._id).populate(TASK_POPULATE).lean());
});

// ---- Edit: title, description, assignee, priority, due date ----
router.put('/:id', loadTask, async (req, res) => {
  const { title, description, assignee, priority, dueDate } = req.body;
  const t = req.task;
  let newAssignee = null;

  if (title !== undefined) {
    const s = str(title, 120);
    if (!s) return res.status(400).json({ message: 'Title cannot be empty.' });
    t.title = s;
  }
  if (description !== undefined) t.description = str(description, 2000);
  if (priority !== undefined) {
    if (!['low', 'medium', 'high'].includes(priority)) return res.status(400).json({ message: 'Invalid priority.' });
    t.priority = priority;
  }
  if (dueDate !== undefined) {
    if (dueDate === null || dueDate === '') t.dueDate = null;
    else {
      const d = new Date(dueDate);
      if (isNaN(d)) return res.status(400).json({ message: 'Invalid due date.' });
      t.dueDate = d;
    }
  }
  if (assignee !== undefined) {
    if (assignee === null || assignee === '') t.assignee = null;
    else {
      if (!mongoose.isValidObjectId(assignee) || !req.project.members.some((m) => m.equals(assignee)))
        return res.status(400).json({ message: 'You can only assign people who are in this project.' });
      if (String(t.assignee) !== String(assignee)) newAssignee = assignee;
      t.assignee = assignee;
    }
  }
  await t.save();

  const populated = await Task.findById(t._id).populate(TASK_POPULATE).lean();
  emitUpsert(req, [populated]);
  if (newAssignee)
    await notifyMany(req.app.get('io'), req.user.id, [newAssignee], {
      type: 'assigned',
      message: `${req.user.name} assigned you “${t.title}” in ${req.project.name}`,
      project: req.project._id,
      task: t._id,
    });
  res.json(populated);
});

// ---- Move between columns / reorder (drag & drop) ----
router.put('/:id/move', loadTask, async (req, res) => {
  const column = req.project.columns.id(req.body.columnId);
  if (!column) return res.status(400).json({ message: 'Choose a valid column.' });

  const task = req.task;
  const fromColumn = String(task.column);
  const toColumn = String(column._id);

  // tasks already in the target column (without the one being moved), in order
  const target = await Task.find({ project: task.project, column: column._id, _id: { $ne: task._id } }).sort({ position: 1 }).select('_id');
  const index = Math.min(Math.max(parseInt(req.body.index, 10) || 0, 0), target.length);
  const ordered = [...target.slice(0, index).map((t) => t._id), task._id, ...target.slice(index).map((t) => t._id)];

  const ops = ordered.map((id, position) => ({
    updateOne: { filter: { _id: id }, update: { $set: { position, ...(String(id) === String(task._id) ? { column: column._id } : {}) } } },
  }));

  // close the gap in the column it came from
  if (fromColumn !== toColumn) {
    const source = await Task.find({ project: task.project, column: fromColumn, _id: { $ne: task._id } }).sort({ position: 1 }).select('_id');
    source.forEach((t, position) => ops.push({ updateOne: { filter: { _id: t._id }, update: { $set: { position } } } }));
  }
  await Task.bulkWrite(ops);

  const tasks = await Task.find({ project: task.project, column: { $in: [fromColumn, toColumn] } }).populate(TASK_POPULATE).lean();
  emitUpsert(req, tasks);

  if (fromColumn !== toColumn && task.assignee)
    await notifyMany(req.app.get('io'), req.user.id, [task.assignee], {
      type: 'moved',
      message: `${req.user.name} moved “${task.title}” to ${column.name}`,
      project: req.project._id,
      task: task._id,
    });
  res.json({ tasks });
});

// ---- Delete ----
router.delete('/:id', loadTask, async (req, res) => {
  const id = req.task._id;
  await Promise.all([Task.deleteOne({ _id: id }), Comment.deleteMany({ task: id }), Notification.deleteMany({ task: id })]);
  req.app.get('io').to(room(req.project._id)).emit('task:deleted', { taskId: String(id) });
  res.json({ message: 'Task deleted.' });
});

// ---- Comments ----
router.get('/:id/comments', loadTask, async (req, res) => {
  const comments = await Comment.find({ task: req.task._id }).sort({ createdAt: 1 }).populate('author', 'name').lean();
  res.json(comments);
});

router.post('/:id/comments', loadTask, async (req, res) => {
  const text = str(req.body.text, 1000);
  if (!text) return res.status(400).json({ message: 'Write a comment first.' });

  const comment = await Comment.create({ task: req.task._id, project: req.project._id, author: req.user.id, text });
  await Comment.populate(comment, { path: 'author', select: 'name' });
  const task = await Task.findByIdAndUpdate(req.task._id, { $inc: { commentsCount: 1 } }, { new: true }).populate(TASK_POPULATE).lean();

  const io = req.app.get('io');
  io.to(room(req.project._id)).emit('comment:created', { comment });
  emitUpsert(req, [task]);

  await notifyMany(io, req.user.id, [task.assignee?._id, task.createdBy?._id], {
    type: 'comment',
    message: `${req.user.name} commented on “${task.title}”`,
    project: req.project._id,
    task: task._id,
  });
  res.status(201).json(comment);
});

router.delete('/:id/comments/:commentId', loadTask, async (req, res) => {
  const comment = await Comment.findOne({ _id: req.params.commentId, task: req.task._id });
  if (!comment) return res.status(404).json({ message: 'Comment not found.' });
  if (String(comment.author) !== req.user.id) return res.status(403).json({ message: 'You can only delete your own comments.' });

  await comment.deleteOne();
  const task = await Task.findByIdAndUpdate(req.task._id, { $inc: { commentsCount: -1 } }, { new: true }).populate(TASK_POPULATE).lean();
  req.app.get('io').to(room(req.project._id)).emit('comment:deleted', { taskId: String(task._id), commentId: String(comment._id) });
  emitUpsert(req, [task]);
  res.json({ message: 'Comment deleted.' });
});

module.exports = router;
