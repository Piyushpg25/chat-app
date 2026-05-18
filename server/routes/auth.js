const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const validateRequest = require("../middleware/validateRequest");
const { registerSchema, loginSchema } = require("../schemas/authSchema");
const { authLimiter } = require("../middleware/rateLimiter");
const logger = require("../config/logger");

const router = express.Router();

// // ✅ REGISTER — validation + rate limit
router.post(
  "/register",
  authLimiter,
  validateRequest(registerSchema),
  async (req, res) => {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.email === email
            ? "Email already registered"
            : "Username already taken",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  },
);

// ✅ LOGIN — validation + rate limit
router.post(
  "/login",
  authLimiter,
  validateRequest(loginSchema),
  async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn(`Failed login attempt for: ${email}`);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    logger.info(`User logged in: ${email}`);

    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  },
);

module.exports = router;
