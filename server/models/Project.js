const mongoose = require('mongoose');

// Board columns (To Do / In Progress / Done ...) live inside the project
const columnSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 40 },
});

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // everyone who can see the project (the owner is included)
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    columns: [columnSchema],
  },
  { timestamps: true }
);

projectSchema.index({ members: 1 });

module.exports = mongoose.model('Project', projectSchema);
