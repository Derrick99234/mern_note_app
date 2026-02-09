const User = require("../../models/user.model");

async function getUserFromRequest(req) {
  const email = req.user;
  const user = await User.findOne({ email });
  if (!user) return null;
  return user;
}

module.exports = { getUserFromRequest };
