const jwt = require("jsonwebtoken");
require("dotenv").config();

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const headerToken = authHeader ? authHeader.split(" ")[1] : null;
  const cookieToken = req.cookies?.accessToken;
  const token = headerToken || cookieToken;
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403);
    req.user = decoded;
    next();
  });
}

module.exports = { authenticateToken };
