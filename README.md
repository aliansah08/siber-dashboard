# 🛡️ Cyber Attack Dashboard - Real-Time Security Monitoring

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-green?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Express-5.x-blue?style=for-the-badge" alt="Express">
  <img src="https://img.shields.io/badge/OpenSearch-Wazuh-orange?style=for-the-badge" alt="OpenSearch">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
</p>

## 📋 Deskripsi Project

**Cyber Attack Dashboard** adalah aplikasi real-time untuk monitoring dan visualisasi serangan cyber. Dashboard ini terintegrasi dengan **OpenSearch/Wazuh** untuk mengambil data alert keamanan secara langsung dan menampilkannya dalam antarmuka yang interaktif dan menarik.

Dashboard ini menampilkan serangan cyber dalam format visual yang unik dengan efek laser yang menarik, serta statistik real-time seperti jumlah ancaman aktif, total serangan hari ini, dan permintaan yang diblokir.

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 🎯 **Real-Time Attack Visualization** | Tampilkan serangan cyber dengan efek laseranimasi dari berbagai arah |
| 📊 **Live Statistics** | Tampilkan jumlah ancaman aktif, serangan hari ini, dan yang diblokir |
| 📈 **Trend Charts** | Grafik statistik serangan dalam periode waktu tertentu |
| 🔌 **Socket.IO Real-Time** | Update data secara real-time tanpa refresh halaman |
| 🌐 **Webhook Endpoint** | Terima alert dari sistem lain via API webhook |
| 🎭 **Mock Data Mode** | Mode simulasi jika OpenSearch tidak tersedia |
| 🔔 **Alert Notifications** | Notifikasi real-time untuk setiap serangan baru |
| 🗺️ **GeoIP Visualization** | Tampilkan asal serangan berdasarkan lokasi geografis |
| 🔍 **MITRE ATT&CK** | Integrasi informasi teknik serangan |

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Browser       │────▶│   Express       │────▶│   OpenSearch    │
│   (React UI)    │◀────│   Server        │◀────│   / Wazuh       │
│                 │     │   + Socket.IO   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                         ┌─────────────────┐
                         │   Systemd       │
                         │   Service       │
                         └─────────────────┘
```

---

## 📦 Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS + Shadcn UI
- **Backend**: Express.js 5.x + Socket.IO
- **Database**: OpenSearch (via Wazuh)
- **Real-Time**: WebSocket via Socket.IO
- **Deployment**: Node.js 18+ atau Docker

---

## 🚀 Cara Install dan Run di Lokal (Development)

### Prerequisites

- Node.js 18 atau lebih tinggi
- npm atau yarn
- Git

### Langkah-Langkah

```bash
# 1. Clone repository
git clone https://github.com/yourusername/siber-dashboard.git
cd siber-dashboard/app

# 2. Install dependencies
npm install

# 3. Copy file environment
cp .env.example .env

# 4. Edit konfigurasi (optional - bisa langsung run untuk mock mode)
# nano .env

# 5. Run development server
npm run dev
```

Dashboard akan tersedia di: `http://localhost:5173`

### Build untuk Production (Local)

```bash
# Build frontend
npm run build

# Run production server
npm start
```

Akses di: `http://localhost:3001`

---

## 🖥️ Deploy ke Ubuntu Server

### Prerequisites Server

- Ubuntu 18.04 atau lebih tinggi
- Akses root atau sudo
- Node.js 18+ (akan diinstall otomatis oleh script)
- Port 3001 tersedia

### Metode 1: Menggunakan Script Deploy (Recommended)

#### Step 1: Upload Project ke Server

**Dari Windows (PowerShell/CMD):**
```powershell
scp -r "C:\web\siber-dashboard" username@YOUR_SERVER_IP:~/siber-dashboard
```

**Dari Linux/Mac:**
```bash
scp -r ./siber-dashboard username@YOUR_SERVER_IP:~/siber-dashboard
```

Atau gunakan tools seperti FileZilla, WinSCP, atau rsync.

#### Step 2: Login ke Server dan Deploy

```bash
# SSH ke server
ssh username@YOUR_SERVER_IP

# Masuk ke folder project
cd ~/siber-dashboard/app

# Beri permission execute pada script
chmod +x deploy.sh

# Jalankan script deploy
./deploy.sh
```

Script ini akan:
- ✅ Mengecek dan install Node.js jika belum ada
- ✅ Install dependencies npm
- ✅ Build frontend React
- ✅ Setup systemd service untuk auto-start
- ✅ Start layanan dashboard

#### Step 3: Akses Dashboard

Setelah deploy berhasil, akses melalui:

```
http://YOUR_SERVER_IP:3001
```

---

### Metode 2: Manual Setup (Tanpa Script)

Jika kamu lebih suka setup manual:

```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Masuk ke folder project
cd ~/siber-dashboard/app

# 3. Install dependencies
npm install --production

# 4. Build frontend
npm run build

# 5. Setup environment
cp .env.example .env
nano .env

# 6. Start server
node server.cjs
```

#### Setup Auto-Start dengan Systemd

```bash
# Buat service file
sudo nano /etc/systemd/system/cyber-dashboard.service
```

Isi dengan:
```ini
[Unit]
Description=Cyber Attack Dashboard
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/siber-dashboard/app
ExecStart=/usr/bin/node server.cjs
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
```

```bash
# Enable dan start service
sudo systemctl daemon-reload
sudo systemctl enable cyber-dashboard
sudo systemctl start cyber-dashboard
```

---

## 🐳 Deploy dengan Docker

### Prerequisites

- Docker installed
- Docker Compose installed

### Langkah-Langkah

#### Step 1: Konfigurasi Environment

```bash
cd siber-dashboard/app

# Copy environment file
cp .env.example .env

# Edit konfigurasi
nano .env
```

Edit nilai-nilai berikut:
```env
OPENSEARCH_URL=https://YOUR_OPENSEARCH_IP:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=YourPassword
OPENSEARCH_SSL_REJECT_UNAUTHORIZED=false
```

#### Step 2: Build dan Run

```bash
# Build dan start container
docker-compose up -d

# Lihat logs
docker-compose logs -f

# Stop container
docker-compose down
```

#### Step 3: Akses Dashboard

```
http://YOUR_SERVER_IP:3001
```

### Konfigurasi Docker Lanjutan

#### Menggunakan Docker Compose dengan Custom Network

Buat file `docker-compose.override.yml`:

```yaml
version: '3.8'

services:
  dashboard:
    ports:
      - "3001:3001"
    environment:
      - OPENSEARCH_URL=${OPENSEARCH_URL}
      - OPENSEARCH_USERNAME=${OPENSEARCH_USERNAME}
      - OPENSEARCH_PASSWORD=${OPENSEARCH_PASSWORD}
      - NODE_ENV=production
    networks:
      - dashboard-network

networks:
  dashboard-network:
    driver: bridge
```

#### SSL Certificate untuk Production

Jika menggunakan SSL self-signed:

```bash
# Copy certificate ke container
docker cp your-ca.pem cyber-dashboard:/app/certs/root-ca.pem

# Update environment
OPENSEARCH_SSL_CA=/app/certs/root-ca.pem
```

---

## ⚙️ Environment Variables

Berikut adalah semua variabel environment yang dapat dikonfigurasi:

| Variabel | Default | Deskripsi |
|----------|---------|-----------|
| `PORT` | 3001 | Port untuk menjalankan server |
| `NODE_ENV` | production | Mode environment |
| `OPENSEARCH_URL` | https://localhost:9200 | URL OpenSearch server |
| `OPENSEARCH_USERNAME` | admin | Username untuk authentication |
| `OPENSEARCH_PASSWORD` | SecretPassword | Password untuk authentication |
| `OPENSEARCH_SSL_CA` | - | Path ke SSL CA certificate |
| `OPENSEARCH_SSL_REJECT_UNAUTHORIZED` | false | Allow self-signed certificates |
| `WAZUH_INDEX_PATTERN` | wazuh-alerts-* | Pattern index OpenSearch |
| `ALERT_POLLING_INTERVAL` | 5000 | Interval polling dalam milidetik |
| `USE_MOCK_DATA` | false | Gunakan mock data jika true |
| `ENABLE_WEBHOOK` | true | Enable webhook endpoint |
| `MIN_ALERT_LEVEL` | 1 | Minimum level alert yang ditampilkan |
| `MAX_ALERTS_PER_BATCH` | 100 | Maksimal alert per request |

### Contoh Konfigurasi .env

```env
# OpenSearch Configuration
OPENSEARCH_URL=https://192.168.1.100:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=YourSecurePassword
OPENSEARCH_SSL_REJECT_UNAUTHORIZED=false

# Wazuh Settings
WAZUH_INDEX_PATTERN=wazuh-alerts-*
ALERT_POLLING_INTERVAL=5000

# Server Configuration
PORT=3001
NODE_ENV=production

# Feature Flags
USE_MOCK_DATA=false
ENABLE_WEBHOOK=true
MIN_ALERT_LEVEL=1
MAX_ALERTS_PER_BATCH=100
```

---

## 🛠️ Management Commands

Setelah deployment, berikut command yang sering digunakan:

### Systemctl Commands

```bash
# Start dashboard
sudo systemctl start cyber-dashboard

# Stop dashboard
sudo systemctl stop cyber-dashboard

# Restart dashboard
sudo systemctl restart cyber-dashboard

# Check status
sudo systemctl status cyber-dashboard

# Enable auto-start saat boot
sudo systemctl enable cyber-dashboard

# Disable auto-start
sudo systemctl disable cyber-dashboard
```

### View Logs

```bash
# Lihat logs real-time
sudo journalctl -u cyber-dashboard -f

# Lihat logs terakhir (50 baris)
sudo journalctl -u cyber-dashboard -n 50

# Lihat logs hari ini
sudo journalctl -u cyber-dashboard --since today

# Lihat logs berdasarkan waktu
sudo journalctl -u cyber-dashboard --since "2024-01-01 10:00:00" --until "2024-01-01 11:00:00"
```

### Docker Commands

```bash
# Lihat status container
docker-compose ps

# Lihat logs
docker-compose logs -f dashboard

# Restart container
docker-compose restart dashboard

# Rebuild dan restart
docker-compose up -d --build

# Hapus container dan volumes
docker-compose down -v
```

---

## 🌐 Port yang Digunakan

| Port | Service | Deskripsi |
|------|---------|-----------|
| 3001 | Dashboard | Web interface dan WebSocket |
| 9200 | OpenSearch | Wazuh Indexer API (jika lokal) |
| 443 | Wazuh Dashboard | Wazuh Web UI (jika lokal) |

### Buka Port di Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 3001/tcp

# Iptables
sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT

# FirewallD
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

---

## 🔍 Troubleshooting

### ❌ OpenSearch Connection Failed

**Error:**
```
❌ OpenSearch connection: FAILED
```

**Solusi:**
```bash
# Edit .env file
cd ~/siber-dashboard/app
nano .env

# Pastikan konfigurasi benar:
OPENSEARCH_URL=https://YOUR_OPENSEARCH_IP:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=YourPassword
OPENSEARCH_SSL_REJECT_UNAUTHORIZED=false

# Restart service
sudo systemctl restart cyber-dashboard
```

### ❌ Port 3001 Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solusi:**
```bash
# Cari process yang menggunakan port 3001
sudo lsof -i :3001

# Kill process
sudo kill -9 <PID>

# Atau gunakan port lain
# Edit .env: PORT=3002
```

### ❌ Permission Denied

**Error:**
```
bash: ./deploy.sh: Permission denied
```

**Solusi:**
```bash
# Beri permission execute
chmod +x deploy.sh

# Atau bisa juga
chmod 755 deploy.sh
```

### ❌ Node Version Too Old

**Error:**
```
error: Your engine is incompatible with this module
```

**Solusi:**
```bash
# Install Node.js versi lebih baru
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cek versi
node --version
```

### ❌ SSL Certificate Error

**Error:**
```
Error: self signed certificate in certificate chain
```

**Solusi:**
```bash
# Edit .env
OPENSEARCH_SSL_REJECT_UNAUTHORIZED=false

# Atau copy certificate
OPENSEARCH_SSL_CA=/path/to/root-ca.pem
```

### ❌ Service Failed to Start

**Error:**
```
Failed to start cyber-dashboard.service
```

**Solusi:**
```bash
# Lihat logs error
sudo journalctl -u cyber-dashboard -e

# Common fixes:
# 1. Cek working directory
# 2. Cek node path
# 3. Cek file .env exists
cd ~/siber-dashboard/app
ls -la .env

# Jika belum ada, copy dari example
cp .env.example .env
```

### ❌ WebSocket Connection Error

**Error:**
```
WebSocket connection failed
```

**Solusi:**
```bash
# Pastikan port 3001 terbuka
sudo ufw status

# Cek socket.io berjalan
curl http://localhost:3001/socket.io/
```

---

## 📡 API Endpoints

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/` | GET | Halaman utama dashboard |
| `/api/health` | GET | Health check dan status koneksi |
| `/api/trends` | GET | Data trend serangan |
| `/api/webhook` | POST | Webhook untuk menerima alert |

### Health Check Response

```json
{
  "status": "ok",
  "opensearch": "connected",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "mode": "production"
}
```

### Webhook Payload Example

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "rule": {
    "level": 10,
    "id": "100001",
    "description": "SQL Injection Attempt"
  },
  "data": {
    "srcip": "192.168.1.100"
  },
  "agent": {
    "name": "wazuh-agent",
    "id": "001"
  }
}
```

---

## 🔄 Update Dashboard

### Tanpa Docker

```bash
# Masuk ke folder project
cd ~/siber-dashboard/app

# Update file (git pull atau upload ulang)
git pull

# Install dependencies baru
npm install

# Build ulang
npm run build

# Restart service
sudo systemctl restart cyber-dashboard
```

### Dengan Docker

```bash
cd ~/siber-dashboard/app

# Pull update dan rebuild
git pull
docker-compose up -d --build
```

---

## 📊 Screenshots

Dashboard menampilkan:
- **Header**: Logo dan sistem status
- **Stats Cards**: Jumlah ancaman aktif, serangan hari ini, yang diblokir
- **Attack Map**: Visualisasi serangan dengan efek laser
- **Trend Chart**: Grafik serangan seiring waktu
- **Log Table**: Tabel log serangan terbaru

---

## 📝 Lisensi

MIT License - lihat file [LICENSE](LICENSE) untuk detail.

---

## 👨‍💻 Kontribusi

1. Fork repository ini
2. Buat branch baru (`git checkout -b feature/fitur-baru`)
3. Commit perubahan (`git commit -am 'Tambah fitur baru'`)
4. Push ke branch (`git push origin feature/fitur-baru`)
5. Buat Pull Request

---

## 📞 Support

Jika ada pertanyaan atau masalah:

1. Cek [Troubleshooting](#troubleshooting) terlebih dahulu
2. Buka issue di GitHub
3. Cek logs dengan `sudo journalctl -u cyber-dashboard -f`

---

## 🙏 Credits

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Express](https://expressjs.com/)
- [Socket.IO](https://socket.io/)
- [OpenSearch](https://opensearch.org/)
- [Wazuh](https://wazuh.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/)

---

**Dibuat dengan ❤️ untuk keamanan cyber**

<p align="center">
  <img src="https://img.shields.io/badge/Made%20with-React-green?style=for-the-badge&logo=react" alt="Made with React">
  <img src="https://img.shields.io/badge/Runs%20on-Node.js-green?style=for-the-badge&logo=node.js" alt="Runs on Node.js">
</p>