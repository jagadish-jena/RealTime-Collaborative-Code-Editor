import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { YSocketIO } from "y-socket.io/dist/server";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const ySocketIO = new YSocketIO(io);

ySocketIO.initialize();

const rooms = new Map();

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

app.post("/api/rooms", (req, res) => {
  const { name } = req.body;

  // Validate name
  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Name is required",
    });
  }

  let roomId;

  // Generate a unique 6-digit room ID
  do {
    roomId = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(roomId));

  rooms.set(roomId, {
    roomId,
    createdBy: name.trim(),
    createdAt: new Date(),
  });

  console.log(`Room created: ${roomId} by ${name.trim()}`);

  return res.status(201).json({
    success: true,
    roomId,
  });
});

app.post("/api/rooms/join", (req, res) => {
  const { roomId, name } = req.body;

  // Validate name
  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Name is required",
    });
  }

  // Validate room ID exists
  if (!roomId) {
    return res.status(400).json({
      success: false,
      message: "Room ID is required",
    });
  }

  const normalizedRoomId = roomId.trim();

  // Room ID must contain exactly 6 digits
  if (!/^\d{6}$/.test(normalizedRoomId)) {
    return res.status(400).json({
      success: false,
      message: "Room ID must be exactly 6 digits",
    });
  }

  // Check if room exists
  if (!rooms.has(normalizedRoomId)) {
    return res.status(404).json({
      success: false,
      message: "Room does not exist",
    });
  }

  console.log(`${name.trim()} joined room ${normalizedRoomId}`);

  return res.status(200).json({
    success: true,
    roomId: normalizedRoomId,
  });
});

httpServer.listen(3000, () => {
  console.log("Server running on port 3000!");
});
