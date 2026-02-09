const jwt = require("jsonwebtoken");
const User = require("../../models/user.model");

async function createAccount(req, res) {
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

  const accessToken = jwt.sign({ _id: user._id, email: email }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "36000s",
  });

  return res.json({
    error: false,
    user,
    accessToken,
    message: "Registeration Successfull",
  });
}

async function login(req, res) {
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

    const accessToken = jwt.sign({ _id: userInfo._id, email: email }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "3600s",
    });
    const refreshToken = jwt.sign({ _id: userInfo._id, email: email }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });

    return res.json({
      error: false,
      user,
      accessToken,
      refreshToken,
      message: "Login Successfull",
    });
  }

  return res.status(400).json({
    error: true,
    message: "Invalid Credentails",
  });
}

function refreshToken(req, res) {
  const refreshTokenValue = req.body.refreshToken;
  if (!refreshTokenValue) return res.sendStatus(401);

  jwt.verify(
    refreshTokenValue,
    process.env.REFRESH_TOKEN_SECRET,
    (err, decoded) => {
      if (err) return res.sendStatus(403);
      const accessToken = jwt.sign({ _id: decoded._id, email: decoded.email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "3600s",
      });
      res.json({ accessToken });
    }
  );
}

module.exports = {
  createAccount,
  login,
  refreshToken,
};

