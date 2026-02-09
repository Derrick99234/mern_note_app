const jwt = require("jsonwebtoken");
const User = require("../../models/user.model");

function sanitizeUser(userDoc) {
  if (!userDoc) return null;
  const obj = typeof userDoc.toObject === "function" ? userDoc.toObject() : { ...userDoc };
  delete obj.password;
  return obj;
}

function isBcryptHash(value) {
  const v = String(value || "");
  return v.startsWith("$2a$") || v.startsWith("$2b$") || v.startsWith("$2y$");
}

function cookieOptions() {
  const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
  };
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  const base = cookieOptions();
  if (accessToken) {
    res.cookie("accessToken", accessToken, { ...base, maxAge: 15 * 60 * 1000 });
  }
  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
  }
}

function clearAuthCookies(res) {
  const base = cookieOptions();
  res.clearCookie("accessToken", base);
  res.clearCookie("refreshToken", base);
}

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
    expiresIn: "15m",
  });
  const refreshTokenValue = jwt.sign(
    { _id: user._id, email: email },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: "7d",
    }
  );

  setAuthCookies(res, { accessToken, refreshToken: refreshTokenValue });

  return res.json({
    error: false,
    user: sanitizeUser(user),
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

  const isValid = await userInfo.comparePassword(password);
  if (isValid) {
    if (!isBcryptHash(userInfo.password)) {
      userInfo.password = password;
      await userInfo.save();
    }

    const accessToken = jwt.sign(
      { _id: userInfo._id, email: email },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15m",
      }
    );
    const refreshTokenValue = jwt.sign(
      { _id: userInfo._id, email: email },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      }
    );
    setAuthCookies(res, { accessToken, refreshToken: refreshTokenValue });

    return res.json({
      error: false,
      user: sanitizeUser(userInfo),
      message: "Login Successfull",
    });
  }

  return res.status(400).json({
    error: true,
    message: "Invalid Credentails",
  });
}

function refreshToken(req, res) {
  const refreshTokenValue = req.cookies?.refreshToken || req.body.refreshToken;
  if (!refreshTokenValue) return res.sendStatus(401);

  jwt.verify(
    refreshTokenValue,
    process.env.REFRESH_TOKEN_SECRET,
    (err, decoded) => {
      if (err) return res.sendStatus(403);
      const accessToken = jwt.sign(
        { _id: decoded._id, email: decoded.email },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: "15m",
        }
      );
      setAuthCookies(res, { accessToken });
      res.json({ error: false });
    }
  );
}

function logout(req, res) {
  clearAuthCookies(res);
  return res.json({ error: false });
}

module.exports = {
  createAccount,
  login,
  refreshToken,
  logout,
};
