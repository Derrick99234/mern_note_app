const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

const app = express();

mongoose.connect(process.env.DBURI);

const jwt = require("jsonwebtoken");
const { authenticateToken } = require("./utilities");

const User = require("./models/user.model");
const Note = require("./models/note.model");

app.use(express.json());

const corsOptions = {
  origin: "*",
};

app.use(cors(corsOptions));

// app.use((req, res, next) => {
//   console.log("Request headers:", req.headers); // Log all headers
//   next();
// });

// home
app.get("/", (req, res) => {
  res.send("Backend is configured correctly");
});

// create account
app.post("/create_acct", async (req, res) => {
  const { fullname, email, password } = req.body;

  if (!fullname) {
    return res
      .status(400)
      .json({ error: true, message: "Full Name is required" });
  }

  if (!email) {
    return res.status(400).json({
      error: true,
      message: "User email Name is required for registeration",
    });
  }

  if (!password) {
    return res
      .status(400)
      .json({ error: true, message: "Please provide a valid password" });
  }

  const isUser = await User.findOne({ email: email });

  if (isUser) {
    console.log(isUser);
    return res.json({
      error: true,
      message: "User already exist",
    });
  }

  const user = new User({
    fullname,
    email,
    password,
  });

  await user.save();

  const accessToken = jwt.sign(
    { email: email },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "36000s",
    }
  );

  return res.json({
    error: false,
    user,
    accessToken,
    message: "Registeration Successfull",
  });
});

// login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({
      error: true,
      message: "Email is required",
    });
  }

  if (!password) {
    return res
      .status(400)
      .json({ error: true, message: "Please provide a valid password" });
  }

  const userInfo = await User.findOne({ email: email });

  if (!userInfo) {
    return res.status(400).json({
      message: "User not found",
    });
  }

  if (userInfo.email == email && userInfo.password == password) {
    const user = { user: userInfo };

    // Inside your login route handler
    const accessToken = jwt.sign(
      { email: email },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "3600s",
      }
    ); // Access token expiry: 1 hour
    const refreshToken = jwt.sign(
      { email: email },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      }
    ); // Refresh token expiry: 7 days

    return res.json({
      error: false,
      user,
      accessToken,
      refreshToken,
      message: "Login Successfull",
    });
  } else {
    return res.status(400).json({
      error: true,
      message: "Invalid Credentails",
    });
  }
});

// refresh token
app.post("/refresh_token", (req, res) => {
  const refreshToken = req.body.refreshToken;
  if (!refreshToken) return res.sendStatus(401);

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "3600s",
    });
    res.json({ accessToken });
  });
});

// get user
app.get("/get_user", authenticateToken, async (req, res) => {
  const user = req.user; // Access user information from the request object

  // Use the user information to perform operations
  try {
    const isUser = await User.findOne({ email: user });

    if (!isUser) {
      return res.sendStatus(401);
    }

    return res.json({
      user: {
        fullname: isUser.fullname,
        email: isUser.email,
        _id: isUser._id,
        createdOn: isUser.createdOn,
      },
      message: "This is from the backend just no",
    });
  } catch (error) {
    console.error("Error retrieving user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// add note
app.post("/add_note", authenticateToken, async (req, res) => {
  const usr = req.user;
  const user = await User.findOne({ email: usr });
  const { title, content, tags } = req.body;

  if (!title) {
    return res.status(400).json({ error: true, message: "Title is Required" });
  }

  if (!content) {
    return res
      .status(400)
      .json({ error: true, message: "Content is Required" });
  }

  try {
    const note = new Note({
      title,
      content,
      tags: tags || [],
      userId: user._id,
    });

    await note.save();

    return res.json({
      error: false,
      note,
      message: "Note added successfully",
    });
  } catch (e) {
    return res.status(500).json({
      error: true,
      message: `Internal server Error: ${e}`,
    });
  }
});

// edit note
app.put("/edit_note/:noteID", authenticateToken, async (req, res) => {
  const noteID = req.params.noteID;
  const { title, content, tags, isPinned } = req.body;

  const usr = req.user;
  const user = await User.findOne({ email: usr });

  if (!title && !content && !tags) {
    return res
      .status(400)
      .json({ error: true, message: "No changes Provided" });
  }

  try {
    const note = await Note.findOne({ _id: noteID, userId: user._id });

    if (!note) {
      return res.status(400).json({
        error: true,
        message: "Note not found",
      });
    }

    if (title) note.title = title;
    if (content) note.content = content;
    if (tags) note.tags = tags;
    if (isPinned) note.isPinned = isPinned;

    await note.save();
    res.json({
      error: false,
      note,
      message: "Note updated successfully",
    });
  } catch (e) {
    res.status(500).json({
      error: true,
      message: "Internal server Error",
    });
  }
});

// get all notes
app.get("/get_all_notes", authenticateToken, async (req, res) => {
  const usr = req.user;
  const user = await User.findOne({ email: usr });

  try {
    const notes = await Note.find({ userId: user._id }).sort({ isPinned: -1 });

    return res.json({
      error: false,
      notes,
      message: "All Notes Retrived succcessfully",
    });
  } catch (e) {
    return res.status(500).json({
      error: true,
      message: "Internal Server error",
    });
  }
});

// Delete note
app.delete("/delete_note/:noteID", authenticateToken, async (req, res) => {
  const usr = req.user;
  const user = await User.findOne({ email: usr });
  const noteID = req.params.noteID;

  try {
    const note = await Note.findOne({ _id: noteID, userId: user._id });

    if (!note) {
      return res.status(404).json({ error: true, message: "Note not found" });
    }

    await Note.deleteOne({ _id: noteID, userId: user._id });

    return res.json({
      error: false,
      message: "Note deleted successfully",
    });
  } catch (e) {
    return res.status(500).json({
      error: true,
      message: "Internal server error",
    });
  }
});

// update note pinned
app.put("/update_note_pinned/:noteID", authenticateToken, async (req, res) => {
  const noteID = req.params.noteID;
  const { isPinned } = req.body;
  const usr = req.user;
  const user = await User.findOne({ email: usr });

  try {
    const note = await Note.findOne({ _id: noteID, userId: user._id });

    if (!note) {
      return res.status(400).json({
        error: true,
        message: "Note not found",
      });
    }

    note.isPinned = isPinned;

    await note.save();
    res.json({
      error: false,
      note,
      message: "Note updated successfully",
    });
  } catch (e) {
    res.status(500).json({
      error: true,
      message: "Internal server Error",
    });
  }
});

// Search note
app.get("/search_notes/", authenticateToken, async (req, res) => {
  const usr = req.user;
  const user = await User.findOne({ email: usr });

  const { query } = req.query;

  if (!query) {
    return res.status(400).json({
      error: true,
      message: "Search query is required",
    });
  }
  try {
    const matching_note = await Note.find({
      userId: user._id,
      $or: [
        { title: { $regex: new RegExp(query, "i") } },
        { content: { $regex: new RegExp(query, "i") } },
      ],
    });

    return res.json({
      error: false,
      notes: matching_note,
      message: "Notes match the search query retrieved succussfully",
    });
  } catch (e) {
    res.status(500).json({
      error: true,
      message: "Internal server Error",
    });
  }
});
app.listen(8000, () => console.log(`Listening on port ${8000}`));

module.exports = app;
