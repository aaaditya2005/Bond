# Bond – Real-Time Chat Application

## 🎯 Vision & Motivation

**Bond** is a modern, real-time chat application designed to bring people closer through seamless, secure, and engaging conversations. We believe that meaningful connections thrive when communication is instant, reliable, and intuitive. Bond combines contemporary web technologies with thoughtful user experience to create a warm, welcoming space where friends, family, and communities can connect authentically.

## ✨ Key Features

- **Private Sessions** – Messages auto-expire in 24 hours for privacy-conscious users
- **Secure Authentication** – Email OTP verification and Google Sign-In integration
- **Social Connectivity** – Friend requests, blocking, and user presence indicators
- **Multiple Chat Modes** – Direct one-on-one chats and group conversations
- **Rich Interaction** – Typing indicators, read receipts, emoji picker, and default avatars
- **Smart Notifications** – Live notification toasts and audio alerts for new messages
- **Beautiful UI** – Clean, intuitive interface built with modern React patterns

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI library for interactive components |
| **Vite** | Lightning-fast build tool and dev server |
| **Socket.IO Client** | Real-time bidirectional communication |
| **Lucide React** | Beautiful, consistent icon library |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express.js** | Fast, scalable server framework |
| **Socket.IO** | WebSocket-based real-time events |
| **MongoDB + Mongoose** | Flexible document database with schema validation |
| **JWT (jsonwebtoken)** | Secure stateless authentication |
| **bcryptjs** | Password hashing and security |
| **Google Auth Library** | OAuth 2.0 Google Sign-In integration |
| **Nodemailer** | Email delivery for OTP verification |
| **Multer** | File upload handling |
| **Helmet** | HTTP security headers |
| **Express Rate Limiting** | Protection against brute-force attacks |

### DevOps & Deployment
- **render.yaml** – Cloud deployment configuration
- **Nodemon** – Development server auto-reload
- **Concurrently** – Run multiple npm scripts simultaneously

## 📊 Architecture

Bond follows a **monorepo structure** with separated frontend and backend:

```
bond/
├── client/          # React + Vite frontend
├── server/          # Express.js backend with Socket.IO
├── package.json     # Root workspace configuration
└── render.yaml      # Deployment configuration
```

## 🔐 Security & Privacy

- **24-hour message expiration** for automatic privacy
- **Password hashing** with bcryptjs (Argon2 equivalent strength)
- **JWT-based sessions** with secure HTTP-only cookies
- **OAuth 2.0 compliance** with Google authentication
- **Rate limiting** to prevent abuse
- **Security headers** via Helmet middleware
- **CORS protection** with configurable origins

## 🌟 User Experience Highlights

- **Typing Indicators** – See when others are composing messages
- **Presence Awareness** – Know when contacts are online
- **Emoji Support** – Quick emoji picker for expressive communication
- **Audio Notifications** – Gentle chime alerts for new messages
- **Default Avatars** – Auto-generated, no external storage needed
- **Intuitive Design** – Responsive UI that works across devices
