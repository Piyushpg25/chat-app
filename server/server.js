const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");

dotenv.config();

const logger = require("./config/logger");
const errorHandler = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const socketHandler = require("./socket/socketHandler");
const uploadRoutes = require('./routes/upload');


const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));
app.use("/api", apiLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("api/users", userRoutes);
app.use('/api/upload',uploadRoutes);


// Socket
socketHandler(io);

// Global error handler
app.use(errorHandler);

//
app.get("/", (req, res) => {
  res.send("Hello");
});
//

// DB connect + server start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    logger.info("MongoDB connected!");
    server.listen(process.env.PORT || 5000, () => {
      logger.info(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    logger.error("MongoDb connection failed:", err);
    process.exit(1);
  });
