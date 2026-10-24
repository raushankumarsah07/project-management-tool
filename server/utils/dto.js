const Project = require('../models/Project');

const TASK_POPULATE = [
  { path: 'assignee', select: 'name email' },
  { path: 'createdBy', select: 'name' },
];

const getProjectDto = (id) => Project.findById(id).populate('members', 'name email').lean();

// trims and limits user text; non-strings become ''
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

module.exports = { TASK_POPULATE, getProjectDto, str };
