const User = require("../../models/user.model");

async function getUserFromRequest(req) {
  const email = typeof req.user === "string" ? req.user : req.user?.email;
  const user = await User.findOne({ email });
  if (!user) return null;
  return user;
}

module.exports = { getUserFromRequest };
