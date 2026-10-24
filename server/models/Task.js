const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    column: { type: mongoose.Schema.Types.ObjectId, required: true }, // _id of a column inside the project
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date, default: null },
    position: { type: Number, default: 0 }, // order inside its column
    commentsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
