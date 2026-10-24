const router = require('express').Router();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const auth = require('../middleware/auth');
const loadProject = require('../middleware/project');
const { TASK_POPULATE, getProjectDto, str } = require('../utils/dto');
const { notifyMany } = require('../utils/notify');

router.use(auth);

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Done'];
const room = (id) => `project:${id}`;
const isOwner = (project, userId) => String(project.owner) === String(userId);

// Tell everyone currently viewing the board that project info changed
async function broadcastProject(req) {
  const project = await getProjectDto(req.project._id);
  req.app.get('io').to(room(project._id)).emit('project:updated', { project });
  return project;
}

// ---- My projects (with progress) ----
router.get('/', async (req, res) => {
  const projects = await Project.find({ members: req.user.id }).sort({ updatedAt: -1 }).populate('members', 'name').lean();
  const counts = await Task.aggregate([
    { $match: { project: { $in: projects.map((p) => p._id) } } },
    { $group: { _id: { project: '$project', column: '$column' }, n: { $sum: 1 } } },
  ]);

  res.json(
    projects.map((p) => {
      const mine = counts.filter((c) => String(c._id.project) === String(p._id));
      const lastCol = p.columns[p.columns.length - 1]?._id;
      return {
        _id: p._id,
        name: p.name,
        description: p.description,
        owner: p.owner,
        members: p.members,
        total: mine.reduce((s, c) => s + c.n, 0),
        done: mine.filter((c) => String(c._id.column) === String(lastCol)).reduce((s, c) => s + c.n, 0),
      };
    })
  );
});

// ---- Create a project ----
router.post('/', async (req, res) => {
  const name = str(req.body.name, 80);
  if (!name) return res.status(400).json({ message: 'Give your project a name.' });
  const project = await Project.create({
    name,
    description: str(req.body.description, 300),
    owner: req.user.id,
    members: [req.user.id],
    columns: DEFAULT_COLUMNS.map((n) => ({ name: n })),
  });
  res.status(201).json({ _id: project._id });
});

// ---- Board: project + all its tasks ----
router.get('/:projectId', loadProject, async (req, res) => {
  const [project, tasks] = await Promise.all([
    getProjectDto(req.project._id),
    Task.find({ project: req.project._id }).sort({ position: 1 }).populate(TASK_POPULATE).lean(),
  ]);
  res.json({ project, tasks });
});

// ---- Rename / edit (owner) ----
router.put('/:projectId', loadProject, async (req, res) => {
  if (!isOwner(req.project, req.user.id)) return res.status(403).json({ message: 'Only the project owner can do this.' });
  const name = req.body.name !== undefined ? str(req.body.name, 80) : req.project.name;
  if (!name) return res.status(400).json({ message: 'Project name cannot be empty.' });
  req.project.name = name;
  if (req.body.description !== undefined) req.project.description = str(req.body.description, 300);
  await req.project.save();
  res.json(await broadcastProject(req));
});

// ---- Delete project (owner) ----
router.delete('/:projectId', loadProject, async (req, res) => {
  if (!isOwner(req.project, req.user.id)) return res.status(403).json({ message: 'Only the project owner can delete it.' });
  const io = req.app.get('io');
  const id = req.project._id;
  const members = req.project.members.map(String);

  await Promise.all([
    Task.deleteMany({ project: id }),
    Comment.deleteMany({ project: id }),
    Notification.deleteMany({ project: id }),
    Project.deleteOne({ _id: id }),
  ]);
  members.forEach((m) => io.to(`user:${m}`).emit('project:removed', { projectId: String(id) }));
  io.in(room(id)).socketsLeave(room(id));
  res.json({ message: 'Project deleted.' });
});

// ---- Members ----
router.post('/:projectId/members', loadProject, async (req, res) => {
  if (!isOwner(req.project, req.user.id)) return res.status(403).json({ message: 'Only the owner can add members.' });
  const email = str(req.body.email, 120).toLowerCase();
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'No account found with that email. Ask them to sign up first.' });
  if (req.project.members.some((m) => m.equals(user._id))) return res.status(409).json({ message: 'They are already in this project.' });

  req.project.members.push(user._id);
  await req.project.save();
  await notifyMany(req.app.get('io'), req.user.id, [user._id], {
    type: 'added',
    message: `${req.user.name} added you to the project “${req.project.name}”`,
    project: req.project._id,
  });
  res.status(201).json(await broadcastProject(req));
});

router.delete('/:projectId/members/:userId', loadProject, async (req, res) => {
  const { userId } = req.params;
  const self = userId === req.user.id;
  if (!self && !isOwner(req.project, req.user.id)) return res.status(403).json({ message: 'Only the owner can remove members.' });
  if (isOwner(req.project, userId)) return res.status(400).json({ message: 'The owner cannot leave. Delete the project instead.' });
  if (!mongoose.isValidObjectId(userId) || !req.project.members.some((m) => m.equals(userId)))
    return res.status(404).json({ message: 'That person is not a member.' });

  const io = req.app.get('io');
  req.project.members.pull(userId);
  await req.project.save();

  // their tasks become unassigned
  const affected = await Task.find({ project: req.project._id, assignee: userId }).select('_id');
  if (affected.length) {
    await Task.updateMany({ _id: { $in: affected.map((t) => t._id) } }, { assignee: null });
    const tasks = await Task.find({ _id: { $in: affected.map((t) => t._id) } }).populate(TASK_POPULATE).lean();
    io.to(room(req.project._id)).emit('tasks:upsert', { tasks });
  }

  io.to(`user:${userId}`).emit('project:removed', { projectId: String(req.project._id) });
  io.in(`user:${userId}`).socketsLeave(room(req.project._id));
  if (!self)
    await notifyMany(io, req.user.id, [userId], {
      type: 'removed',
      message: `${req.user.name} removed you from “${req.project.name}”`,
      project: req.project._id,
    });
  res.json(await broadcastProject(req));
});

// ---- Columns ----
router.post('/:projectId/columns', loadProject, async (req, res) => {
  const name = str(req.body.name, 40);
  if (!name) return res.status(400).json({ message: 'Give the column a name.' });
  if (req.project.columns.length >= 8) return res.status(400).json({ message: 'A board can have at most 8 columns.' });
  req.project.columns.push({ name });
  await req.project.save();
  res.status(201).json(await broadcastProject(req));
});

router.put('/:projectId/columns/:columnId', loadProject, async (req, res) => {
  const column = req.project.columns.id(req.params.columnId);
  if (!column) return res.status(404).json({ message: 'Column not found.' });
  const name = str(req.body.name, 40);
  if (!name) return res.status(400).json({ message: 'Column name cannot be empty.' });
  column.name = name;
  await req.project.save();
  res.json(await broadcastProject(req));
});

router.delete('/:projectId/columns/:columnId', loadProject, async (req, res) => {
  const column = req.project.columns.id(req.params.columnId);
  if (!column) return res.status(404).json({ message: 'Column not found.' });
  if (req.project.columns.length <= 1) return res.status(400).json({ message: 'A board needs at least one column.' });
  if (await Task.exists({ project: req.project._id, column: column._id }))
    return res.status(400).json({ message: 'Move or delete the tasks in this column first.' });
  req.project.columns.pull(column._id);
  await req.project.save();
  res.json(await broadcastProject(req));
});

// ---- Create a task in a column ----
router.post('/:projectId/tasks', loadProject, async (req, res) => {
  const title = str(req.body.title, 120);
  if (!title) return res.status(400).json({ message: 'Give the task a title.' });
  const column = req.project.columns.id(req.body.columnId);
  if (!column) return res.status(400).json({ message: 'Choose a valid column.' });

  const position = await Task.countDocuments({ project: req.project._id, column: column._id });
  const task = await Task.create({ project: req.project._id, column: column._id, title, createdBy: req.user.id, position });
  const populated = await Task.findById(task._id).populate(TASK_POPULATE).lean();

  req.app.get('io').to(room(req.project._id)).emit('tasks:upsert', { tasks: [populated] });
  res.status(201).json(populated);
});

module.exports = router;
