<div align="center">

# 💬 ChatApp

### A modern real-time MERN chat application with AI-powered smart replies

<p align="center">
  <img src="https://img.shields.io/badge/MERN-Stack-00ED64?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.io-RealTime-black?style=for-the-badge&logo=socket.io" />
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

<p align="center">
  <img src="https://img.shields.io/github/license/your-username/chat-app?style=flat-square" />
  <img src="https://img.shields.io/github/stars/your-username/chat-app?style=flat-square" />
  <img src="https://img.shields.io/github/forks/your-username/chat-app?style=flat-square" />
</p>

### 🚀 Lightweight WhatsApp-style chat app for the web  
Built while learning the MERN stack — powered by Socket.io, AI, and beautiful UI animations.

</div>

---

## ✨ Overview

This project started as a simple chat application and evolved into a **full real-time communication platform**.

It includes:

- ⚡ Real-time messaging with Socket.io
- 🤖 AI-generated smart replies using Groq + Llama 3
- 📁 Media sharing with Cloudinary
- 🌌 3D animated particle backgrounds
- 🔐 Secure JWT authentication
- 🎨 Premium dark UI with smooth animations

> Honestly, this project taught me more than tutorials ever could.

---

# 🌐 Live Demo

> 🚧 Coming Soon

---

# 📸 Preview

> Screenshots will be added soon

---

# 🚀 Features

## 🔐 Authentication
- Register & login system
- JWT-based authentication
- Password hashing with bcrypt
- Token expiration (7 days)
- Protected routes

---

## ⚡ Real-Time Messaging
- Instant messaging using Socket.io
- Real-time room synchronization
- Live typing indicators
- Online users tracking

---

## 🧠 AI Smart Reply
Generate intelligent reply suggestions using:

- ✨ Groq API
- 🦙 Llama 3 model

Click the sparkle button and get:
- 3 AI-generated responses
- Fast and completely free suggestions

---

## 🖼️ Media Sharing
Upload and share:

- Images
- Videos
- Files

Powered by Cloudinary storage.

---

## 🎭 UI & Animations
- Beautiful dark theme
- 3D particle background
- Framer Motion animations
- Smooth page transitions
- Modern chat experience

---

## 🛡️ Backend Security
Production-level backend features:

- Helmet security headers
- API rate limiting
- Zod validation
- Global error handling
- Winston logging

---

# 🛠️ Tech Stack

# ⚙️ Backend

| Technology | Purpose |
|------------|---------|
| **Node.js + Express** | REST APIs & backend server |
| **MongoDB + Mongoose** | Database & schemas |
| **Socket.io** | Real-time communication |
| **JWT + Bcrypt** | Authentication & security |
| **Zod** | Validation |
| **Cloudinary** | Media storage |
| **Winston** | Logging |
| **Helmet** | Security headers |
| **express-rate-limit** | Brute force protection |

---

# 🎨 Frontend

| Technology | Purpose |
|------------|---------|
| **React + Vite** | Frontend framework |
| **Tailwind CSS v4** | Styling |
| **Shadcn/ui** | UI components |
| **Framer Motion** | Animations |
| **Three.js + R3F** | 3D particle effects |
| **Zustand** | State management |
| **Socket.io-client** | Real-time connection |
| **React Hook Form + Zod** | Forms & validation |
| **Groq API (Llama 3)** | AI reply suggestions |

---

# 📂 Project Structure

```bash
chat-app/
│
├── server/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── schemas/
│   ├── socket/
│   └── server.js
│
└── client/
    └── src/
        ├── components/
        ├── hooks/
        ├── lib/
        ├── pages/
        └── store/
```

---

# ⚙️ Getting Started

# 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/chat-app.git

cd chat-app
```

---

# 2️⃣ Setup Backend

```bash
cd server

npm install
```

Create `.env` inside `server/`

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=pick_any_long_random_string
CLIENT_URL=http://localhost:5173
NODE_ENV=development

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Run server:

```bash
npm run dev
```

Expected output:

```bash
✅ MongoDB connected!
✅ Server running on port 5000
```

---

# 3️⃣ Setup Frontend

```bash
cd ../client

npm install
```

Create `.env` inside `client/`

```env
VITE_GROQ_API_KEY=your_groq_api_key
```

Run frontend:

```bash
npm run dev
```

Open:

```bash
http://localhost:5173
```

---

# 🌍 Environment Variables

## 🖥️ server/.env

| Variable | Description |
|----------|-------------|
| `PORT` | Server port |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `CLIENT_URL` | Frontend URL |
| `NODE_ENV` | development / production |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

---

## 💻 client/.env

| Variable | Description |
|----------|-------------|
| `VITE_GROQ_API_KEY` | Groq API key |

---

# 🔄 Real-Time Message Flow

```text
User sends message
        ↓
ChatInput emits "send_message"
        ↓
Server stores message in MongoDB
        ↓
Socket.io broadcasts "receive_message"
        ↓
All connected users receive update instantly
```

---

# 📚 What I Learned

This project helped me understand:

- How Socket.io rooms/events work
- JWT middleware architecture
- File uploads with Multer + Cloudinary
- AI API integrations
- Zustand state management
- Zod validation patterns
- Backend security best practices
- Real-world MERN project structure

---

# ⚠️ Known Issues

- Socket reconnect delay on refresh
- Slow video uploads on Cloudinary free tier
- Messages auto-delete after 24 hours (TTL index)
- Multiple tabs share auth state

---

# 🛣️ Roadmap

- [ ] 🎤 Voice messages
- [ ] 👍 Message reactions
- [ ] 💬 Reply to specific messages
- [ ] 👤 User profiles & avatars
- [ ] 🚀 Deploy to Render & Vercel
- [ ] 📱 Mobile responsive optimization
- [ ] 🔔 Push notifications

---

# 🤝 Contributing

Contributions are always welcome!

```bash
Fork the repo
Create your feature branch
Commit your changes
Push to the branch
Open a Pull Request
```

---

# ⭐ Support

If you like this project:

- ⭐ Star the repository
- 🍴 Fork the project
- 🐛 Report bugs
- 💡 Suggest new features

---

<div align="center">

# 💙 Built with MERN + Socket.io + AI

### Made while learning full-stack development 🚀

</div>