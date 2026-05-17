# GuruConnect Deployment Guide

## Prerequisites
- Node.js 18+
- MongoDB Atlas account (for production)
- Domain name (optional, for production)

---

## Local Development

### 1. Clone & Install

```bash
# Backend
cd BACKEND
npm install

# Frontend
cd ../Frontend
npm install
```

### 2. Configure Environment

**Backend (.env)**
```bash
cp .env.example .env
# Edit .env with your values:
# - MONGO_URI (local or Atlas connection string)
# - JWT_SECRET (generate a secure random string)
# - GEMINI_API_KEY (get from Google AI Studio)
# - RAZORPAY_* credentials (get from Razorpay Dashboard)
```

**Frontend (create .env.local if needed)**
```bash
VITE_API_TARGET=http://localhost:5000
```

### 3. Run Development

```bash
# Terminal 1 - Backend
cd BACKEND
npm run dev

# Terminal 2 - Frontend
cd Frontend
npm run dev
```

---

## Production Deployment

### Option 1: Render.com (Recommended - Free Tier)

#### Backend Setup
1. Create new **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root Directory**: `BACKEND`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   - `MONGO_URI` (Atlas connection string)
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `PORT`: 10000

#### Frontend Setup
1. Create new **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root Directory**: `Frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview -- --port 10000`
4. Add Environment Variables:
   - `VITE_API_TARGET` (your backend URL, e.g., `https://your-backend.onrender.com`)

#### Update Backend CORS
In production, update `src/app.js`:
```javascript
app.use(cors({
  origin: 'https://your-frontend-domain.com', // Your frontend URL
  credentials: true,
}));
```

---

### Option 2: Railway.app

1. Create new project
2. Add Backend service (auto-detects Node.js)
3. Add Frontend service
4. Configure environment variables in each service
5. Set up networking between services

---

### Option 3: VPS (DigitalOcean/Ubuntu)

```bash
# SSH into your server
ssh root@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Install Nginx
sudo apt-get install -y nginx

# Clone your repo
git clone your-repo-url
cd your-repo

# Setup PM2 for process management
npm install -g pm2
pm2 start BACKEND/server.js --name backend
pm2 startup
pm2 save

# Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/default
```

**Nginx Config:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

### Option 4: Vercel (Frontend) + Railway/Render (Backend)

1. Deploy frontend to Vercel
2. Deploy backend to Railway
3. Set `VITE_API_TARGET` to your backend URL
4. Update backend CORS to allow Vercel domain

---

## SSL Setup (Required for HTTPS)

### Using Let's Encrypt (Nginx)
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Using Cloudflare (Recommended)
1. Create free Cloudflare account
2. Add your domain
3. Update nameservers at your registrar
4. Enable "Full" SSL in SSL/TLS settings

---

## Post-Deployment Checklist

- [ ] All environment variables set
- [ ] CORS configured for production domain
- [ ] MongoDB Atlas IP whitelist includes production server
- [ ] SSL certificate active
- [ ] Payment gateway webhooks configured
- [ ] Test login/registration
- [ ] Test mentor search
- [ ] Test booking flow
- [ ] Test payment (use test mode first)
- [ ] Monitor error logs

---

## Troubleshooting

### Common Issues

**CORS Errors**
- Ensure frontend URL is in backend's CORS origin
- Check that credentials are allowed

**Database Connection**
- Verify MongoDB Atlas IP whitelist
- Check connection string format

**Socket.io Not Working**
- Ensure proper WebSocket proxy in Nginx
- Check that port isn't blocked by firewall

**Payment Failures**
- Verify Razorpay keys match test/live mode
- Check webhook URL is accessible

---

## Security Notes

1. **Never commit .env files**
2. Use environment variables for all secrets
3. Enable 2FA on cloud platforms
4. Regular backups of MongoDB
5. Keep dependencies updated
6. Use HTTPS in production