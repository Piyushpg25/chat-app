const express = require("express");
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");

const router = express.Router();

// Protected - access only by logged user
router.get('/me', protect, async (req, res) => {
  // attach middleware in req.user
  res.json({
    id: req.user._id,
    username: req.user.username,
    email: req.user.email,
  });
});

// every user list
router.get('/all', protect, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
