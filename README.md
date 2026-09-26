# Kanban Board

A real-time collaborative Kanban board application for managing workspaces, boards, tasks, team members, comments, and notifications.

## Features

- User Registration and Login
- JWT Authentication
- Access and Refresh Tokens
- Workspace Management
- Workspace Members and Roles
- Board Management
- Task Management
- Task Assignment
- Task Status Management
- Drag and Drop Task Movement
- Comments
- Real-Time Notifications
- Task Assignment Notifications
- Task Status Notifications
- Due Date Notifications
- Search and Filters
- Online/Offline User Presence
- Real-Time Collaboration
- Redis and BullMQ Background Jobs

## Project Structure

```text
kanban-board/
│
├── backend/
│   ├── src/
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md