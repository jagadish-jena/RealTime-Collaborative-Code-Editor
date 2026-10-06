# Real-Time Collaborative Code Editor

A browser-based code editor where people can join a shared room and edit the same document in real time. The frontend is built with React, Vite, and Monaco Editor. Yjs synchronizes document changes and editor metadata through a Socket.IO server.

## Features

- Create a private room and invite collaborators with its six-digit room ID.
- Join an existing room with a name and room ID.
- Edit a shared document in Monaco; concurrent edits are synchronized by Yjs.
- See who is online and when another participant is typing.
- Change the programming language for everyone in the room: JavaScript, Python, Java, or C++.
- Copy the room ID to share it.

## Requirements

- Node.js and npm
- Two terminal windows to run the backend and frontend

## Run locally

Install dependencies and start the backend:

```powershell
cd backend
npm ci
npm start
```

In a second terminal, install dependencies and start the frontend:

```powershell
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite (by default, `http://localhost:5173`). Keep both processes running while using the app. The frontend calls the backend at `http://localhost:3000`.

## How to collaborate

1. Enter your name and create a room.
2. Share the six-digit room ID with collaborators.
3. Collaborators enter their names and the room ID under **Join Existing Room**.
4. Edit the document together. The user list, typing indicators, and selected language update for room participants.

## Project structure

```text
backend/
  server.js          Express API and Socket.IO/Yjs server
frontend/
  src/app/App.jsx    Room flow and collaborative editor UI
  src/app/App.css    App styles
  src/main.jsx       React entry point
```

## Useful commands

Run these from the relevant folder:

| Folder | Command | Purpose |
| --- | --- | --- |
| `backend` | `npm start` | Start the API and collaboration server on port 3000 |
| `frontend` | `npm run dev` | Start the Vite development server |
| `frontend` | `npm run build` | Create a production frontend build |
| `frontend` | `npm run lint` | Run ESLint |
| `frontend` | `npm run preview` | Preview the production build locally |

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Check that the backend is running |
| `POST` | `/api/rooms` | Create a room; request body: `{ "name": "Ada" }` |
| `POST` | `/api/rooms/join` | Join a room; request body: `{ "roomId": "123456", "name": "Ada" }` |

Room endpoints return JSON. Creating a room responds with its `roomId`; joining requires an existing six-digit room ID.

## Current limitations

- Room records are held in backend process memory. Restarting the backend clears them; no database-backed room or document persistence is configured.
- Rooms have no authentication or authorization. Anyone with a room ID can join.
- The frontend currently targets `http://localhost:3000`, and the backend allows the Vite origin `http://localhost:5173`. Update these addresses and the backend CORS origin when deploying to other hosts.
- This project is configured for local development and should not be exposed publicly without adding appropriate security, persistence, and production deployment configuration.
