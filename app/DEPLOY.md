# 🚀 Cyber Attack Dashboard - Production Deploy Guide

## ✅ Credentials OpenSearch (Wazuh)

```
URL:      https://localhost:9200
Username: admin
Password: SecretPassword
```

---

## 📋 Step-by-Step Deploy ke Server Wazuh

### **STEP 1: Copy Project ke Server**

Dari komputer lokal (Windows PowerShell/CMD):

```powershell
# Ganti <SERVER_IP> dengan IP server Wazuh kamu (contoh: 192.168.1.100)
scp -r C:\web\app wazuh@<SERVER_IP>:~/cyber-dashboard
```

Atau pakai FileZilla/WinSCP untuk upload folder `app` ke `/home/wazuh/cyber-dashboard`

---

### **STEP 2: SSH ke Server & Deploy**

```bash
# SSH ke server
ssh wazuh@<SERVER_IP>

# Masuk ke folder project
cd ~/cyber-dashboard

# Jalankan script deploy
chmod +x deploy.sh
./deploy.sh
```

---

### **STEP 3: Akses Dashboard**

Buka browser dan akses:
```
http://<SERVER_IP>:3001
```

---

## 🔧 Manual Setup (Kalau Script Gagal)

```bash
cd ~/cyber-dashboard

# Install dependencies
npm install --production

# Build frontend
npm run build

# Start server
node server.js
```

---

## 📝 Command Penting

| Command | Deskripsi |
|---------|-----------|
| `sudo systemctl start cyber-dashboard` | Start dashboard |
| `sudo systemctl stop cyber-dashboard` | Stop dashboard |
| `sudo systemctl restart cyber-dashboard` | Restart dashboard |
| `sudo systemctl status cyber-dashboard` | Cek status |
| `sudo journalctl -u cyber-dashboard -f` | Lihat logs real-time |

---

## 🔍 Troubleshooting

### **Error: SSL/TLS Connection Failed**

Jika ada error koneksi ke OpenSearch:

```bash
# Edit .env
cd ~/cyber-dashboard
nano .env

# Ganti menjadi:
OPENSEARCH_SSL_REJECT_UNAUTHORIZED=false
```

Lalu restart:
```bash
sudo systemctl restart cyber-dashboard
```

### **Error: Port 3001 Sudah Digunakan**

```bash
# Cek apa yang pakai port 3001
sudo lsof -i :3001

# Kill process
sudo kill -9 <PID>
```

### **Error: Permission Denied**

```bash
# Fix permission
sudo chown -R wazuh:wazuh ~/cyber-dashboard
chmod +x ~/cyber-dashboard/deploy.sh
```

---

## 🔄 Update Dashboard

```bash
cd ~/cyber-dashboard

# Pull/update files (kalau pakai git)
git pull

# Atau upload ulang file, lalu:
npm install --production
npm run build
sudo systemctl restart cyber-dashboard
```

---

## 🌐 Port yang Digunakan

| Port | Service | Deskripsi |
|------|---------|-----------|
| 3001 | Dashboard | Web interface |
| 9200 | OpenSearch | Wazuh Indexer |
| 443 | Wazuh Dashboard | Wazuh Web UI |

Pastikan firewall membuka port 3001:
```bash
sudo ufw allow 3001/tcp
# atau
sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
```

---

## 🎉 Selesai!

Dashboard sekarang berjalan dan akan otomatis start saat server reboot.
