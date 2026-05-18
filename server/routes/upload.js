const express = require("express");
const {
  uploadImage,
  uploadVideo,
  uploadFile,
} = require("../config/cloudinary");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Image Upload
router.post("/image", protect, uploadImage.single("file"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "Image upload failed" });
  res.json({
    url: req.file.path,
    type: "image",
    name: req.file.originalname,
    size: req.file.size,
  });
});

// Video Upload
router.post("/video", protect, uploadVideo.single("file"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "Video upload failed" });
  res.json({
    url: req.file.path,
    type: "video",
    name: req.file.originalname,
    size: req.file.size,
  });
});

// File Upload
router.post("/file", protect, uploadFile.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "File upload failed" });
  res.json({
    url: req.file.path,
    type: 'file',
    name: req.file.originalname,
    size: req.file.size
  })
});

module.exports = router;