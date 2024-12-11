import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import pool from "./db";
import authRoutes from "./routes/authRoutes";
import bodyParser from "body-parser";
import session from "express-session";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import http from "http";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Create an HTTP server to attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "*", "http://localhost:8080"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Middlewares
app.use(
  cors({
    origin: ["http://localhost:5173", "*", "http://localhost:8080"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: "fcd73615efdf1e5483def1256c0b0a31a5b45e7508aeb43aec5e8008598f67ea",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true },
  })
);

app.use((req, res, next) => {
  console.log("Session object:", req.session);
  next();
});

// Routes
app.use("/api/auth", authRoutes);

app.get("/", (_req, res) => {
  res.send("Welcome to the API!");
});

app.get("/test-db", async (_req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    res.json({ success: true, time: result.rows[0].now });
    client.release();
  } catch (error) {
    console.error("Database connection error", error);
    res
      .status(500)
      .json({ success: false, error: "Database connection failed" });
  }
});

// Socket.IO setup
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Emit notifications to connected clients
  setInterval(() => {
    const notification = {
      title: "Notification Title",
      message: "This is a static notification.",
      timestamp: new Date(),
    };
    socket.emit("notification", notification);
  }, 5000);

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
