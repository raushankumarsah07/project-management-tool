# Flowboard – Project Management Tool (MERN)

A Trello/Asana-style collaboration tool built with **React, Node.js/Express, MongoDB and Socket.io**.

## Features
| Requirement | Implementation |
|---|---|
| Auth system | Register / login, bcrypt password hashing, JWT (HTTP + WebSocket) |
| Create group projects | Create projects, invite teammates by email, owner/member roles, leave or remove members |
| Project boards | Kanban columns (default To Do / In Progress / Done). Add, rename, delete columns |
| Task cards | Title, description, priority, due date, assignee, drag & drop between and within columns |
| Assign tasks | Assign any project member; "Only my tasks" filter |
| Comment & communicate | Comment thread inside every task, comment counts on cards |
| **Bonus: notifications** | Bell with unread count + toast when you're assigned a task, added to a project, someone comments on or moves your task |
| **Bonus: real-time updates** | WebSockets keep every open board in sync (tasks, moves, comments, columns, members) and show who is online |

## Database collections
| Collection | Key fields |
|---|---|
| `users` | name, email, password (hashed) |
| `projects` | name, description, owner, members[], columns[] |
| `tasks` | project, column, title, description, assignee, createdBy, priority, dueDate, position, commentsCount |
| `comments` | task, project, author, text |
| `notifications` | user, type, message, project, task, read |

## Run locally
Requirements: Node 18+ and MongoDB (local or Atlas).

```bash
# 1) Backend
cd server
npm install
cp .env.example .env        # set MONGO_URI and JWT_SECRET
npm run seed                # optional: demo users and a sample project
npm run dev                 # http://localhost:5000

# 2) Frontend (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

Demo logins after seeding (password `password123`): `alice@example.com`, `bob@example.com`, `carol@example.com`.

### See the real-time features
Log in as Alice in one browser and Bob in another (or an incognito window), open the same project, then drag a card, add a comment or assign a task. The other window updates instantly and Bob gets a notification.

## How real-time works
- The client opens one Socket.io connection after login (JWT verified by the server).
- Each user joins a private room `user:<id>` (notifications) and, on opening a board, `project:<id>` (only if they are a member).
- Whenever a REST request changes data, the server saves it and emits an event to the project room: `tasks:upsert`, `task:deleted`, `comment:created`, `comment:deleted`, `project:updated`, `presence`.
- Drag & drop updates the UI immediately (optimistic update) and rolls back if the server rejects it.

## REST API
All routes except register/login need `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Auth |
| GET | `/api/auth/me` | Current user |
| GET / POST | `/api/projects` | My projects / create |
| GET / PUT / DELETE | `/api/projects/:id` | Board data / rename / delete (owner) |
| POST / DELETE | `/api/projects/:id/members[/:userId]` | Add by email / remove or leave |
| POST / PUT / DELETE | `/api/projects/:id/columns[/:columnId]` | Manage columns |
| POST | `/api/projects/:id/tasks` | Create task |
| GET / PUT / DELETE | `/api/tasks/:id` | Read / edit / delete task |
| PUT | `/api/tasks/:id/move` | Move/reorder `{columnId, index}` |
| GET / POST | `/api/tasks/:id/comments` | List / add comments |
| DELETE | `/api/tasks/:id/comments/:commentId` | Delete own comment |
| GET | `/api/notifications` | Latest notifications + unread count |
| PUT | `/api/notifications/read-all`, `/api/notifications/:id/read` | Mark read |

## Security notes
Passwords hashed with bcrypt, JWT auth on REST and WebSockets, project membership checked on every project/task/comment request and every socket room join, Helmet, CORS limited to the client URL, auth rate limiting, input trimming/length limits, and type checks on user input.

## Folder structure
```
server/  config/ models/ middleware/ routes/ utils/ socket.js server.js seed.js
client/  src/{pages, components, hooks/useBoard.js, context, utils.js}
```

## Notes
- Drag & drop uses the browser's native HTML5 API (no extra library). On touch screens, use the **Status** dropdown inside the task card to move it.
