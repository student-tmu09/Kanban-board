# Kanban Frontend

Complete React/Vite frontend for the provided Kanban backend.

## Setup

1. Copy `.env.example` to `.env`.
2. Confirm:
   VITE_API_URL=http://localhost:3000/api
   VITE_SOCKET_URL=http://localhost:3000
3. Run:
   npm install
   npm run dev

Open http://localhost:5173.

## Backend requirements

- Backend API must run on http://localhost:3000.
- Backend CORS must allow http://localhost:5173 with credentials.
- If auth uses cookies, backend must set cookies with settings compatible with localhost.
- Socket.IO must be initialized on the same HTTP server, not a separate `app.listen()` server.
- Socket auth currently assumes cookie-based auth because axios/socket use credentials. If your socket middleware only accepts `socket.handshake.auth.token`, change it to also read the `Accesstoken` cookie.

## Main UI flow

Login/Register -> Dashboard -> Workspace -> Overview/Boards/Members -> Board -> Tasks/Drag & Drop/Comments -> Notifications.

If your ApiResponse shape differs, adjust `src/utils/response.js`.
