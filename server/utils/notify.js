const Notification = require('../models/Notification');

// Saves a notification for each user (except the person who caused it) and pushes it live
async function notifyMany(io, actorId, userIds, { type, message, project, task }) {
  const ids = [...new Set(userIds.filter(Boolean).map(String))].filter((id) => id !== String(actorId));
  for (const user of ids) {
    const n = await Notification.create({ user, type, message, project, task });
    io.to(`user:${user}`).emit('notification', n.toObject());
  }
}

module.exports = { notifyMany };
