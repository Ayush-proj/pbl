# GuruConnect - Mentorship Platform

A full-stack mentorship platform connecting mentors with candidates for personalized learning sessions. Features AI-powered skill verification, real-time chat, video sessions, and seamless payment integration.

![GuruConnect](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![React](https://img.shields.io/badge/React-18.3-61dafb.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)

## 🌟 Features

### For Candidates
- Browse and search mentors by skills, location, and availability
- Book demo and paid sessions with verified mentors
- Real-time chat with mentors
- Video sessions with screen sharing
- Rate and review mentors after sessions
- Help center support system

### For Mentors
- AI-powered skill verification test (Gemini API)
- Profile creation with skills, bio, and availability
- Calendar-based scheduling
- Wallet system for earnings
- Session management dashboard
- Video session hosting with timer
- Student management

### Technical Features
- **AI Test Generation**: Dynamic MCQ generation based on mentor's skills using Google Gemini
- **Real-time Chat**: Socket.io powered instant messaging
- **Video Sessions**: WebRTC-based video calls with session timer
- **Payments**: Razorpay integration for secure transactions
- **State Management**: Zustand for predictable state
- **Responsive Design**: Mobile-first Tailwind CSS

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Ayush-proj/pbl.git
cd pbl

# Install backend dependencies
cd BACKEND
npm install

# Install frontend dependencies
cd ../Frontend
npm install
```

### Configuration

#### Backend (.env)
```bash
cd BACKEND
cp .env.example .env

# Edit .env with your values:
# - MONGO_URI: MongoDB connection string
# - JWT_SECRET: Your secure JWT secret
# - GEMINI_API_KEY: Google AI API key (for mentor test)
# - RAZORPAY_KEY_ID/SECRET: Payment gateway credentials
```

#### Frontend
The frontend uses Vite proxy to connect to backend. For production, set:
```bash
VITE_API_URL=https://your-backend-domain.com
```

### Running Development

```bash
# Terminal 1 - Backend (port 5000)
cd BACKEND
npm run dev

# Terminal 2 - Frontend (port 5173)
cd Frontend
npm run dev
```

Visit `http://localhost:5173`

## 📁 Project Structure

```
pbl/
├── BACKEND/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # API routes
│   │   ├── services/       # Business logic & AI
│   │   ├── socket/         # Socket.io handlers
│   │   ├── app.js          # Express app
│   │   └── server.js       # Server entry
│   ├── uploads/            # User uploads (gitignored)
│   └── package.json
│
├── Frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/ # React components
│   │   │   ├── hooks/      # Custom hooks
│   │   │   ├── pages/     # Page components
│   │   │   ├── services/  # API calls
│   │   │   ├── store/     # Zustand stores
│   │   │   └── App.jsx    # Main app
│   │   ├── components/    # UI components
│   │   ├── hooks/         # Global hooks
│   │   └── main.jsx       # Entry point
│   ├── index.html
│   └── package.json
│
├── DEPLOYMENT.md           # Deployment guide
└── README.md
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/notifications` | Get notifications |

### Mentor
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mentor/profile` | Create mentor profile |
| GET | `/api/mentor/profile` | Get mentor profile |
| GET | `/api/mentor/search` | Search mentors |
| GET | `/api/mentor/slots` | Get available slots |
| GET | `/api/mentor/test` | Get verification test |
| POST | `/api/mentor/test/submit` | Submit test answers |

### Candidate
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/candidate/profile` | Create candidate profile |
| GET | `/api/candidate/profile` | Get candidate profile |

### Booking
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/booking` | Create booking |
| GET | `/api/booking/my` | Get my bookings |
| PATCH | `/api/booking/:id/status` | Update booking status |

### Payment
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/order/:id` | Create order |
| POST | `/api/payment/verify` | Verify payment |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/conversation` | Create/get conversation |
| GET | `/api/chat/conversations` | Get all conversations |
| GET | `/api/chat/messages/:id` | Get messages |

## 🔧 Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Socket.io Client** - Real-time
- **React Hook Form** - Forms
- **Framer Motion** - Animations
- **Radix UI** - UI primitives
- **Sonner** - Toast notifications

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB + Mongoose** - Database
- **Socket.io** - Real-time
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File uploads
- **Razorpay** - Payments
- **Google Gemini** - AI test generation

## 🤖 AI Mentor Verification

The platform uses Google Gemini to generate dynamic MCQ tests based on each mentor's skills and role:

```javascript
// Example: Mentor with skills ["React", "Node.js", "MongoDB"]
// Gets 5 relevant MCQ questions generated by AI
```

**Features:**
- Skill-based question generation
- Role context awareness
- Rate limiting & fallback
- 70% passing threshold

## 📱 Screenshots

(Add screenshots here)

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy Options
1. **Render.com** - Recommended (free tier)
2. **Railway.app** - Modern PaaS
3. **Vercel** - Frontend + separate backend
4. **VPS** - DigitalOcean/Ubuntu with PM2

## 🔒 Environment Variables

### Backend
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/guruconnect
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret
FRONTEND_URL=http://localhost:5173
```

### Frontend
```env
VITE_API_URL=http://localhost:5000
```

## 🧪 Testing

```bash
# Backend syntax check
cd BACKEND
node --check server.js

# Frontend build
cd Frontend
npm run build
```

## 📝 License

MIT License - see LICENSE file

## 👨‍💻 Author

**Ayush Bhosale**
- GitHub: [@Ayush-proj](https://github.com/Ayush-proj)

## 🙏 Acknowledgments

- [Google Gemini](https://ai.google.dev/) - AI question generation
- [Razorpay](https://razorpay.com/) - Payment processing
- [Socket.io](https://socket.io/) - Real-time communication
- [Vercel](https://vercel.com/) - Hosting

---

<p align="center">
  Made with ❤️ for mentors and learners everywhere
</p>