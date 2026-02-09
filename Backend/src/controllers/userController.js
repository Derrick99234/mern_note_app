async function getUser(req, res, user) {
  try {
    return res.json({
      user: {
        fullname: user.fullname,
        email: user.email,
        _id: user._id,
        createdOn: user.createdOn,
      },
      message: "This is from the backend just no",
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { getUser };
