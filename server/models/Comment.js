const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);
