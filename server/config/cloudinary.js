const cloudinary = require("cloudinary").v2; // ← .v2 add kiya
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Images
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "chat-app/images",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 1200, quality: "auto" }], // ← spelling fix
  },
});

// Videos
const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: "chat-app/videos",
    resource_type: "video",
    allowed_formats: ["mp4", "mov", "avi", "mkv", "webm"],
  }),
});

// Files (PDF, docs, zip)
const fileStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: "chat-app/files",
    resource_type: "raw",
    allowed_formats: ["pdf", "doc", "docx", "xls", "xlsx", "txt", "zip"],
  }),
});

// Size Limits
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});
const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
});
const uploadFile = multer({
  storage: fileStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

module.exports = { uploadImage, uploadVideo, uploadFile, cloudinary };