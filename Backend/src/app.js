const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const noteRoutes = require("./routes/noteRoutes");
const aiRoutes = require("./routes/aiRoutes");
const devRoutes = require("./routes/devRoutes");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);

app.get("/", (req, res) => {
  res.send("Backend is configured correctly");
});

app.use(authRoutes);
app.use(userRoutes);
app.use(categoryRoutes);
app.use(noteRoutes);
app.use(aiRoutes);
app.use(devRoutes);

module.exports = app;

