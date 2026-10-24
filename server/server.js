require("dotenv").config();
require("express-async-errors");
const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error("Set a long JWT_SECRET in server/.env");
  process.exit(1);
}

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CLIENT_URL } });
app.set("io", io);

app.use(helmet());
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts. Try again in a few minutes." },
  }),
  require("./routes/auth"),
);
app.use("/api/projects", require("./routes/projects"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/notifications", require("./routes/notifications"));
app.use((req, res) => res.status(404).json({ message: "Route not found." }));

app.use((err, req, res, next) => {
  if (err.name === "CastError")
    return res.status(400).json({ message: "Invalid id." });
  console.error(err);
  res.status(500).json({ message: "Something went wrong on our side." });
});

require("./socket")(io);

const PORT = process.env.PORT || 8080;
connectDB().then(() =>
  server.listen(PORT, () =>
    console.log(`Flowboard API on http://localhost:${PORT}`),
  ),
);
