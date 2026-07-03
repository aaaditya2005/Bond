import "dotenv/config";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { Server } from "socket.io";
import routes from "./routes.js";
import { socketAuth } from "./auth.js";
import { User } from "./models.js";
import path from "path";
import { fileURLToPath } from "url";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
await mongoose.connect(process.env.MONGO_URI);
const allowedOrigins = [process.env.CLIENT_URL, process.env.RENDER_EXTERNAL_URL]
  .filter(Boolean)
  .flatMap((x) => x.split(","))
  .map((x) => x.trim());
const app = express(),
  server = http.createServer(app),
  io = new Server(server, {
    cors: { origin: allowedOrigins, credentials: true },
  });
app.set("trust proxy", 1);
app.set("io", io);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://accounts.google.com", "blob:"],
        connectSrc: ["'self'", "https://accounts.google.com"],
        styleSrc: ["'self'", "https:", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'", "https:", "data:"],
        frameSrc: ["'self'", "https://accounts.google.com"],
        childSrc: ["'self'", "https://accounts.google.com", "blob:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
  }),
);
app.use(
  cors({
    origin: (origin, cb) =>
      !origin || allowedOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error("Origin not allowed")),
    credentials: true,
  }),
);
app.use(express.json({ limit: "4mb" }));
app.use(cookieParser());
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
app.use("/api", routes);
app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(500)
    .json({
      message:
        process.env.NODE_ENV === "production"
          ? "Something went wrong."
          : err.message,
    });
});
const online = new Map();
io.use(socketAuth);
io.on("connection", (socket) => {
  socket.join(`user:${socket.userId}`);
  online.set(socket.userId, (online.get(socket.userId) || 0) + 1);
  socket.emit("presence:init", Array.from(online.keys()));
  io.emit("presence", { userId: socket.userId, online: true });
  socket.on("typing", ({ conversationId, isTyping }) =>
    socket
      .to(`conversation:${conversationId}`)
      .emit("typing", { conversationId, userId: socket.userId, isTyping }),
  );
  socket.on("conversation:join", (id) => socket.join(`conversation:${id}`));
  socket.on("disconnect", async () => {
    const count = (online.get(socket.userId) || 1) - 1;
    if (count <= 0) {
      online.delete(socket.userId);
      await User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() });
      io.emit("presence", { userId: socket.userId, online: false });
    } else online.set(socket.userId, count);
  });
});
app.get("/health", (req, res) => res.json({ ok: true }));
if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../client/dist",
  );
  app.use(express.static(clientDist));
  app.get("/{*splat}", (req, res) =>
    res.sendFile(path.join(clientDist, "index.html")),
  );
}
server.listen(process.env.PORT || 5000, () =>
  console.log(`Bond server listening on ${process.env.PORT || 5000}`),
);
