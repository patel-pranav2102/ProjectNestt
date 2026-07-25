# ProjectNest Production Deployment Documentation

This guide outlines configurations to deploy ProjectNest directly on staging and production Virtual Machines (VMs) without container overlays.

---

## 1. Prerequisites Checklist

Ensure the host environment has the following installed:
* **Node.js**: Version 22.x or later.
* **npm**: Version 10.x or later.
* **MongoDB**: A running MongoDB instance locally or hosted (e.g., MongoDB Atlas).

---

## 2. Environment Variables Configuration

Create a `.env` file inside the `server/` directory:

```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb://localhost:27017/projectnest
CLIENT_URL=http://localhost:5173

# Authentication Secrets
JWT_ACCESS_SECRET=your_jwt_access_secret_key_12345
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_67890

# Optional integrations
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password

GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_claude_key
```

---

## 3. Direct Host VM Bootstrapping

We support a root-level script manager to bootstrap and build the entire codebase in two commands:

### Bootstrap all dependencies
```bash
npm run bootstrap
```
This runs installations for both `client/` and `server/` directories.

### Build Client Assets
```bash
npm run build:client
```
Compiles Vite production assets into `client/dist`.

---

## 4. Scaling the Application via PM2 Clusters

To enable CPU-based load balancing, error logs routing, and zero-downtime hot reloads:

### Install PM2 Globally
```bash
npm install -g pm2
```

### Start PM2 Service Cluster
```bash
npm run prod:start
```
*(This triggers `pm2 start ecosystem.config.cjs` to run the backend in cluster mode across all available cores)*

### Process Management Commands
```bash
# Monitor cpu/memory logs
pm2 monit

# Check live logs streams
pm2 logs projectnest-backend

# Restart cluster with zero-downtime
pm2 reload projectnest-backend

# Stop cluster execution
pm2 stop projectnest-backend
```

---

## 5. Nginx Server Blocks Config (Optional Static Router)

To serve compiled assets and proxy API links on standard ports (Port 80):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Static Vite Assets Folder
    location / {
        root /var/www/projectnest/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Reverse proxy API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Reverse proxy WebSockets
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```
