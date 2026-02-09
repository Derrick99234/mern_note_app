const { getUserFromRequest } = require("../services/userService");

async function withUser(req, res, next) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.sendStatus(401);
    req.currentUser = user;
    next();
  } catch (e) {
    return res.sendStatus(401);
  }
}

module.exports = { withUser };
