const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const noteRoutes = require("./routes/noteRoutes");
const aiRoutes = require("./routes/aiRoutes");
const storyRoutes = require("./routes/storyRoutes");
const devRoutes = require("./routes/devRoutes");

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://mern-note-app-theta.vercel.app",
      ];
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.get("/", (req, res) => {
  res.send("Backend is configured correctly");
});

app.use(authRoutes);
app.use(userRoutes);
app.use(categoryRoutes);
app.use(noteRoutes);
app.use(aiRoutes);
app.use(storyRoutes);
app.use(devRoutes);

module.exports = app;
