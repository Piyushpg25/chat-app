const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    // get token from header
    const authHeader = req.headers.authorization;

    // Check token is present or not
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ message: "No Token, access denied" });
    }

    //get token only from Bearer token
    const token = authHeader.split(" ")[1];

    // Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // attach user in req
    req.user = await User.findById(decoded.id).select("-password");

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = protect;
