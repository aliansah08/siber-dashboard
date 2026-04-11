#!/bin/bash

# Deploy Script for Cyber Attack Dashboard to Wazuh Server
# Run this script on the Wazuh server after copying the project

set -e

echo "🚀 Starting deployment of Cyber Attack Dashboard..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${GREEN}📁 Working directory: $(pwd)${NC}"

# Step 1: Check Node.js installation
echo -e "${YELLOW}🔍 Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. Installing...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js version: $NODE_VERSION${NC}"

# Step 2: Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 3: Build frontend
echo -e "${YELLOW}🔨 Building frontend...${NC}"
npm run build
echo -e "${GREEN}✅ Frontend built successfully${NC}"

# Step 4: Verify OpenSearch connection
echo -e "${YELLOW}🔍 Checking OpenSearch connection...${NC}"
if curl -k -s -u admin:SecretPassword https://localhost:9200 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OpenSearch is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  OpenSearch not accessible. Will use mock data mode.${NC}"
fi

# Step 5: Setup systemd service
echo -e "${YELLOW}⚙️  Setting up systemd service...${NC}"
sudo tee /etc/systemd/system/cyber-dashboard.service > /dev/null <<EOF
[Unit]
Description=Cyber Attack Dashboard
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$SCRIPT_DIR
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cyber-dashboard.service
echo -e "${GREEN}✅ Systemd service created and enabled${NC}"

# Step 6: Start the service
echo -e "${YELLOW}🚀 Starting the dashboard service...${NC}"
sudo systemctl start cyber-dashboard.service

# Wait a moment and check status
sleep 3
if sudo systemctl is-active --quiet cyber-dashboard.service; then
    echo -e "${GREEN}✅ Dashboard service is running!${NC}"
else
    echo -e "${RED}❌ Dashboard service failed to start${NC}"
    echo -e "${YELLOW}Check logs with: sudo journalctl -u cyber-dashboard -f${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo -e "📊 Dashboard URL: http://$(hostname -I | awk '{print $1}'):3001"
echo -e "🔌 WebSocket: ws://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo -e "📝 Useful commands:"
echo -e "   View logs:    ${YELLOW}sudo journalctl -u cyber-dashboard -f${NC}"
echo -e "   Stop:         ${YELLOW}sudo systemctl stop cyber-dashboard${NC}"
echo -e "   Restart:      ${YELLOW}sudo systemctl restart cyber-dashboard${NC}"
echo -e "   Status:       ${YELLOW}sudo systemctl status cyber-dashboard${NC}"
echo ""
