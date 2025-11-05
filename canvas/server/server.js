import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "../client")));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const users = new Map();

io.on("connection", (socket) => {
  console.log("✅ user connected:", socket.id);

  socket.on("user:join", ({ username }) => {
    users.set(socket.id, { username });
    io.emit("user:list", Array.from(users.values()));
    socket.broadcast.emit("user:joined", username);
  });

  socket.on("cursor:move", ({ x, y }) => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit("cursor:move", {
        id: socket.id,
        x,
        y,
        username: user.username,
      });
    }
  });

  socket.on("draw:start", (data) => socket.broadcast.emit("draw:start", data));
  socket.on("draw:point", (data) => socket.broadcast.emit("draw:point", data));
  socket.on("draw:end", () => socket.broadcast.emit("draw:end"));
  socket.on("draw:clear", () => socket.broadcast.emit("draw:clear"));

  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (user) socket.broadcast.emit("user:leftNotify", user.username);
    users.delete(socket.id);
    io.emit("user:left", socket.id);
    io.emit("user:list", Array.from(users.values()));
    console.log("❌ user disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
