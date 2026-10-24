const mongoose = require('mongoose');
const Project = require('../models/Project');

// Loads :projectId and makes sure the logged-in user is a member of it
module.exports = async function loadProject(req, res, next) {
  const id = req.params.projectId;
  if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: 'Project not found.' });
  const project = await Project.findById(id);
  if (!project) return res.status(404).json({ message: 'Project not found.' });
  if (!project.members.some((m) => m.equals(req.user.id)))
    return res.status(403).json({ message: "You're not a member of this project." });
  req.project = project;
  next();
};
