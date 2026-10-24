// Fills the database with demo data:  npm run seed
// Demo logins (password for all: password123): alice@example.com, bob@example.com,
// carol@example.com, and the additional demo users listed below.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Comment = require('./models/Comment');
const Notification = require('./models/Notification');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User, Project, Task, Comment, Notification].map((m) => m.deleteMany({})));

  const password = await bcrypt.hash('password123', 12);
  const users = await User.create([
    { name: 'Alice Johnson', email: 'alice@example.com', password },
    { name: 'Bob Martin', email: 'bob@example.com', password },
    { name: 'Carol Singh', email: 'carol@example.com', password },
    { name: 'Diego Alvarez', email: 'diego@example.com', password },
    { name: 'Maya Chen', email: 'maya@example.com', password },
    { name: 'Noah Williams', email: 'noah@example.com', password },
    { name: 'Priya Nair', email: 'priya@example.com', password },
    { name: 'Owen Brooks', email: 'owen@example.com', password },
    { name: 'Zara Khan', email: 'zara@example.com', password },
    { name: 'Liam Carter', email: 'liam@example.com', password },
    { name: 'Sofia Rossi', email: 'sofia@example.com', password },
    { name: 'Ethan Okafor', email: 'ethan@example.com', password },
    { name: 'Nora Petrova', email: 'nora@example.com', password },
  ]);
  const [alice, bob, carol] = users;

  const project = await Project.create({
    name: 'Website Redesign',
    description: 'Revamp the company website for the new launch.',
    owner: alice._id,
    members: [alice._id, bob._id, carol._id],
    columns: [{ name: 'To Do' }, { name: 'In Progress' }, { name: 'Done' }],
  });
  const [todo, doing, done] = project.columns.map((c) => c._id);

  const t = (column, position, title, extra = {}) =>
    ({ project: project._id, column, position, title, createdBy: alice._id, ...extra });
  const tasks = await Task.create([
    t(todo, 0, 'Write copy for the About page', { assignee: carol._id, priority: 'low' }),
    t(todo, 1, 'Collect customer testimonials', { priority: 'medium' }),
    t(doing, 0, 'Design new homepage hero', { assignee: bob._id, priority: 'high', dueDate: new Date(Date.now() + 3 * 864e5), description: 'Needs a mobile version too.' }),
    t(doing, 1, 'Set up analytics', { assignee: alice._id, priority: 'medium' }),
    t(done, 0, 'Pick colour palette', { assignee: bob._id, priority: 'medium' }),
  ]);

  await Comment.create({ task: tasks[2]._id, project: project._id, author: alice._id, text: 'Can we try a darker background for the hero?' });
  await Comment.create({ task: tasks[2]._id, project: project._id, author: bob._id, text: 'Sure, I will share two options tomorrow.' });
  await Task.updateOne({ _id: tasks[2]._id }, { commentsCount: 2 });

  const demoProjects = [
    ['Mobile App Launch', 'Coordinate the launch of the next-generation mobile experience.'],
    ['Q4 Content Engine', 'Plan, produce, and publish the next quarter content calendar.'],
    ['Customer Research Hub', 'Turn customer conversations into clear product decisions.'],
    ['Growth Experiments', 'Run focused experiments to improve acquisition and activation.'],
    ['Team Offsite 2026', 'Make the next team gathering thoughtful, useful, and memorable.'],
    ['Design System 2.0', 'Create a shared visual language for every product surface.'],
    ['FinOps Dashboard', 'Make cloud spend understandable and actionable for everyone.'],
    ['Community Festival', 'Bring the community together with workshops and live sessions.'],
    ['AI Assistant Beta', 'Prepare a responsible beta launch for the new AI assistant.'],
    ['Sustainability Sprint', 'Ship practical improvements to reduce our environmental impact.'],
  ];
  const taskTemplates = [
    'Define the success metric',
    'Create the first draft',
    'Review with the team',
    'Share the final update',
    'Collect feedback from stakeholders',
  ];

  for (let index = 0; index < demoProjects.length; index += 1) {
    const owner = users[index + 3];
    const members = [owner._id, users[(index + 4) % users.length]._id, users[(index + 7) % users.length]._id];
    const project = await Project.create({
      name: demoProjects[index][0],
      description: demoProjects[index][1],
      owner: owner._id,
      members: [...new Set(members.map(String))],
      columns: [{ name: 'Ideas' }, { name: 'In progress' }, { name: 'Complete' }],
    });
    const [ideas, inProgress, complete] = project.columns.map((column) => column._id);
    const projectTasks = taskTemplates.map((title, taskIndex) => ({
      project: project._id,
      column: taskIndex < 2 ? ideas : taskIndex === 2 ? inProgress : complete,
      title,
      createdBy: owner._id,
      assignee: users[(index + taskIndex + 3) % users.length]._id,
      priority: ['low', 'medium', 'high'][taskIndex % 3],
      position: taskIndex,
      dueDate: taskIndex === 2 ? new Date(Date.now() + (index + 2) * 864e5) : null,
    }));
    await Task.create(projectTasks);
  }

  console.log(`Seeded ${users.length} users and ${demoProjects.length + 1} projects.`);
  console.log('All demo accounts use password123. Start with alice@example.com.');
  await mongoose.disconnect();
})();
