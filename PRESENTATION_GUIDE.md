# PRESENTATION GUIDE - GuruConnect

---

## STEP 1: SYSTEM OVERVIEW (2 minutes)

**What is GuruConnect?**
A video session booking platform connecting mentors and students.

**Technology Stack:**
- Frontend: React
- Backend: Node.js + Express
- Database: MongoDB
- Real-time: Socket.io (WebSocket)
- Video: WebRTC (peer-to-peer)

---

## STEP 2: USER ROLES & WORKFLOW

### MENTOR WORKFLOW (2 minutes)

```
1. Login/Register
       ↓
2. Set Availability (which days & what times available)
       ↓
3. View Pending Booking Requests
       ↓
4. Approve/Reject Booking
       ↓
5. Join Video Session at scheduled time
       ↓
6. Session Ends → Get Paid
```

**Key Backend Files:**
- `models/Availability.js` - Stores mentor's available days/times
- `routes/bookingRoutes.js` - Handles approve/reject API
- `socket.js` - Real-time notifications

### STUDENT WORKFLOW (2 minutes)

```
1. Login/Register
       ↓
2. Browse Available Mentors
       ↓
3. Select Mentor → View Available Time Slots
       ↓
4. Book a Session (Demo=15min free OR Paid=60min)
       ↓
5. Wait for Approval
       ↓
6. Join Video Session at scheduled time
       ↓
7. Rate the Session
```

**Key Backend Files:**
- `routes/bookingRoutes.js` - GET /slots, POST /book
- `models/Booking.js` - Stores all booking data

---

## STEP 3: HOW BOOKING WORKS (3 minutes)

### Step 3a: Getting Available Slots

```
Student Requests:
GET /api/bookings/mentor/:mentorId/slots?date=2026-05-19

Backend Process:
1. Find mentor's availability for that day of week
2. Get all existing bookings for that date
3. Generate 30-minute slots (excluding booked ones)
4. Return available slots to student
```

### Step 3b: Creating a Booking

```
Student Sends:
POST /api/bookings
{
  "mentorId": "...",
  "studentId": "...",
  "sessionTypeSlug": "demo" or "deep",
  "scheduledAt": "2026-05-19T10:00:00"
}

Backend Process:
1. Validate session type exists
2. Check if free demo already used (if demo)
3. Create booking with unique roomId
4. Save to MongoDB
5. Notify mentor via Socket.io → "New booking request!"
```

### Step 3c: Approval Process

```
Mentor Approves:
PATCH /api/bookings/:id/approve

Backend:
1. Update status to 'approved'
2. Notify student via Socket.io → "Your booking is confirmed!"
3. Student gets roomId for video session
```

---

## STEP 4: HOW WEBSOCKET WORKS (3 minutes)

### What is WebSocket?
It's a real-time communication channel between browser and server.
**Unlike HTTP:** Server can send messages to client WITHOUT client asking.

### Connection Flow:

```
┌─────────┐                           ┌─────────┐
│ Browser │                           │ Server  │
└────┬────┘                           └────┬────┘
     │                                      │
     │────── Socket Connect (JWT Token) ───→│
     │                                      │
     │←───── Connection OK ─────────────────│
     │                                      │
     │────── join:room("room_123") ────────→│
     │                                      │
     │←───── Joined successfully ────────────│
```

### Socket Events (Real-time Actions):

| Event | Who Sends | What Happens |
|-------|-----------|--------------|
| `join:room` | User | Join a video session room |
| `webrtc:offer` | Caller | Send video offer tocallee |
| `webrtc:answer` | Callee | Accept video connection |
| `webrtc:ice-candidate` | Both | Exchange network info |
| `session:start` | Either | Timer starts |
| `session:end` | Either | Session ends, save duration |
| `session:extend-request` | Either | "Need more time?" |
| `session:extend-accepted` | Other | "Yes, continue" |

### Code Structure (socket.js):

```javascript
// 1. Initialize Socket.io Server on port 3001
const io = new Server(3001, { cors: {...} });

// 2. Authentication (verify JWT token)
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const decoded = jwt.verify(token, SECRET);
  socket.userId = decoded.userId;
  next();
});

// 3. Handle Connection
io.on('connection', (socket) => {
  // Map user to socket
  userSockets.set(socket.userId, socket.id);

  // Handle room joining
  socket.on('join:room', (roomId) => {
    socket.join(roomId);  // Join the room
  });

  // WebRTC Signaling - Forward to other person in room
  socket.on('webrtc:offer', (data) => {
    socket.to(data.roomId).emit('webrtc:offer', {...});
  });

  // Session control events
  socket.on('session:start', (data) => {
    socket.to(data.roomId).emit('session:started', {...});
  });
});
```

---

## STEP 5: HOW VIDEO CALL WORKS (WebRTC) (2 minutes)

### The Video Connection Process:

```
Step 1: Both users open the video page
        ↓
Step 2: Browser asks for Camera + Microphone permission
        ↓
Step 3: Both join the same room using roomId
        ↓
Step 4: User A creates an "offer" (their video/audio)
        ↓
Step 5: Server forwards offer to User B
        ↓
Step 6: User B creates an "answer" (their video/audio)
        ↓
Step 7: Server forwards answer to User A
        ↓
Step 8: Both browsers connect directly (P2P) - No server in between!
        ↓
Step 9: Video/Audio streams directly between computers
```

### Why WebRTC?
- ✅ Free (no Zoom/API costs)
- ✅ Direct connection (faster, better quality)
- ✅ No intermediate server needed
- ✅ Works for 1-on-1 calls

---

## STEP 6: SESSION TIMER & EXTENSION (1 minute)

### Timer System:
- Demo session: 15 minutes
- Deep session: 60 minutes
- Frontend counts down in real-time

### Extension Flow:
```
Time runs out →
  UI shows "Extend Session?" dialog →
    User clicks "Extend 15 min" →
      Socket sends 'session:extend-request' →
        Other user sees request →
          They accept →
            Both continue for 15 more minutes
```

**Cost:** ₹10 per additional minute (stored in frontend)

---

## STEP 7: DATABASE SCHEMA (1 minute)

### Collections in MongoDB:

**Users**
- name, email, password, role (mentor/student)
- isOnline, socketId

**Bookings**
- mentor (ref), student (ref)
- sessionType (demo/deep)
- scheduledAt, duration, status
- roomId (for video)
- startedAt, endedAt, actualDuration, extensionTime

**Availability**
- mentor (ref), dayOfWeek (0-6)
- startTime, endTime, isActive

**SessionType**
- name, slug, duration, price, isFree

---

## STEP 8: KEY API ENDPOINTS (1 minute)

```
GET  /api/bookings/mentor/:id/slots?date=YYYY-MM-DD
     → Returns available time slots

POST /api/bookings
     → Create new booking

PATCH /api/bookings/:id/approve
     → Mentor approves

PATCH /api/bookings/:id/reject
     → Mentor rejects
```

---

## STEP 9: STARTING THE PROJECT (1 minute)

```bash
# Terminal 1 - Start MongoDB
mongod

# Terminal 2 - Start Backend
cd socket-test/backend
node server.js
# Output: Server running on port 3001

# Terminal 3 - Start Frontend
cd frontend
npm run dev
# Opens at http://localhost:3000
```

---

## QUICK REFERENCE - WHAT TO SAY

**"Our system works in 3 layers:"**

1. **Booking Layer** - Students book slots, mentors approve
2. **Real-time Layer** - Socket.io notifies both parties instantly
3. **Video Layer** - WebRTC connects them for free video calls

**"The key innovation is replacing Zoom with WebRTC - we save API costs and give users a seamless experience directly in our app."**

---

## COMMON QUESTIONS & ANSWERS

**Q: How do you handle real-time notifications?**
A: Socket.io. When a booking is created, the mentor gets an instant popup. No page refresh needed.

**Q: How does the video call work without Zoom?**
A: WebRTC - browsers connect directly peer-to-peer. The roomId acts as the meeting ID.

**Q: What happens if student misses the session?**
A: Status remains 'approved', but session never starts. Can be marked as cancelled.

**Q: How do you prevent double booking?**
A: Backend checks existing bookings for that mentor/time before creating new booking.

**Q: How is payment handled?**
A: For demo (free), student can't book again if already used. For paid, amount is stored in booking.totalAmount.

---

## FILE STRUCTURE

```
socket-test/
├── backend/
│   ├── server.js        ← Main entry point
│   ├── socket.js        ← WebSocket server setup
│   ├── routes/
│   │   └── bookingRoutes.js  ← All booking APIs
│   └── models/
│       ├── User.js
│       ├── Booking.js
│       ├── Availability.js
│       └── SessionType.js
└── frontend/
    ├── hooks/
    │   └── useSocket.js  ← Socket client connection
    └── components/
        └── VideoSessionRoom.jsx  ← Video call UI
```

---

# END OF PRESENTATION GUIDE