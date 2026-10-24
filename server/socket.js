const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');

const room = (id) => `project:${id}`;

// Who is currently looking at this board?
async function broadcastPresence(io, projectId) {
  const sockets = await io.in(room(projectId)).fetchSockets();
  const online = [...new Set(sockets.map((s) => s.data.user._id))];
  io.to(room(projectId)).emit('presence', { projectId: String(projectId), online });
}

module.exports = function setupSocket(io) {
  // Only logged-in users may connect
  io.use(async (socket, next) => {
    try {
      const { id } = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
      const user = await User.findById(id).select('name');
      if (!user) throw new Error('no user');
      socket.data.user = { _id: String(user._id), name: user.name };
      next();
    } catch {
      next(new Error('Authentication failed. Please log in again.'));
    }
  });

  io.on('connection', (socket) => {
    // personal room: notifications are pushed here
    socket.join(`user:${socket.data.user._id}`);

    // project room: live board updates (members only)
    socket.on('project:join', async ({ projectId } = {}) => {
      if (!mongoose.isValidObjectId(projectId)) return;
      const ok = await Project.exists({ _id: projectId, members: socket.data.user._id });
      if (!ok) return;
      socket.join(room(projectId));
      broadcastPresence(io, projectId);
    });

    socket.on('project:leave', ({ projectId } = {}) => {
      if (!mongoose.isValidObjectId(projectId)) return;
      socket.leave(room(projectId));
      broadcastPresence(io, projectId);
    });

    socket.on('disconnecting', () => {
      for (const r of socket.rooms) {
        if (r.startsWith('project:')) setTimeout(() => broadcastPresence(io, r.slice(8)), 50);
      }
    });
  });
};
