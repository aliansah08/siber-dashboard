# Wazuh Integration Guide

## Prerequisites

- Wazuh Manager v4.x or higher
- Elasticsearch cluster (comes with Wazuh installation)
- Node.js 18+ and npm

## Setup Instructions

### 1. Configure Environment Variables

Edit `.env` file with your Elasticsearch details:

```env
ELASTICSEARCH_URL=http://YOUR_ELASTICSEARCH_IP:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_password
WAZUH_INDEX_PATTERN=wazuh-alerts-*
ALERT_POLLING_INTERVAL=5000
```

### 2. Verify Elasticsearch Connection

Test connection to Elasticsearch:

```bash
curl -u elastic:your_password http://YOUR_ELASTICSEARCH_IP:9200
```

You should see cluster information.

### 3. Check Wazuh Index Pattern

Verify Wazuh is storing alerts:

```bash
curl -u elastic:your_password http://YOUR_ELASTICSEARCH_IP:9200/_cat/indices/wazuh-alerts-*
```

### 4. Start the Dashboard

```bash
# Terminal 1 - Backend
npm install
node server.js

# Terminal 2 - Frontend (in another terminal)
npm run dev
```

### 5. Optional: Webhook Integration

For real-time alerts without polling, configure Wazuh Integrator:

**On Wazuh Manager:**

1. Create integration script:

```bash
sudo mkdir -p /var/ossec/integrations
sudo tee /var/ossec/integrations/custom-dashboard.py << 'EOF'
#!/usr/bin/env python3
import sys
import json
import urllib.request

WEBHOOK_URL = "http://YOUR_DASHBOARD_IP:3001/api/webhook"

def main():
    # Read alert from stdin
    alert = sys.stdin.read()
    
    # Parse JSON
    alert_json = json.loads(alert)
    
    # Send to dashboard
    req = urllib.request.Request(
        WEBHOOK_URL,
        data=json.dumps(alert_json).encode(),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        response = urllib.request.urlopen(req)
        print(f"Alert sent: {response.status}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
EOF

sudo chmod +x /var/ossec/integrations/custom-dashboard.py
```

2. Configure Wazuh to use the integration:

Edit `/var/ossec/etc/ossec.conf`:

```xml
<ossec_config>
  <integration>
    <name>custom-dashboard.py</name>
    <hook_url>http://YOUR_DASHBOARD_IP:3001/api/webhook</hook_url>
    <alert_format>json</alert_format>
    <level>3</level>
  </integration>
</ossec_config>
```

3. Restart Wazuh Manager:

```bash
sudo systemctl restart wazuh-manager
```

## Features

### Real-time Alert Display
- Alerts fetched every 5 seconds (configurable)
- Automatic deduplication
- Laser animation based on alert severity
- Hologram shake effect on attacks

### Severity Levels
- 🔴 **High (Level 10+)**: Red laser, strong impact
- 🟠 **Medium (Level 5-9)**: Orange laser, medium impact  
- 🩵 **Low (Level 1-4)**: Cyan laser, light impact

### Statistics
- Active threats (high severity alerts)
- Total attacks today
- Blocked requests
- Trend chart (last hour)

## Troubleshooting

### Connection Issues

1. **Elasticsearch connection failed**
   - Verify Elasticsearch is running: `curl http://ES_IP:9200`
   - Check credentials in `.env`
   - Ensure firewall allows port 9200

2. **No alerts appearing**
   - Check Wazuh is generating alerts: `tail -f /var/ossec/logs/alerts/alerts.json`
   - Verify index pattern matches: `wazuh-alerts-*`
   - Enable mock data to test dashboard: `USE_MOCK_DATA=true`

3. **CORS errors**
   - Dashboard uses `cors: { origin: "*" }` by default
   - For production, specify allowed origins

### Performance

- **Too many alerts**: Increase `MIN_ALERT_LEVEL` to 5 or higher
- **Memory issues**: Reduce `MAX_ALERTS_PER_BATCH` to 50
- **Slow queries**: Adjust `ALERT_POLLING_INTERVAL` to 10000ms

## API Endpoints

- `GET /api/health` - Check system status
- `GET /api/trends` - Get trend data
- `POST /api/webhook` - Receive alerts from Wazuh

## Architecture

```
Wazuh Manager
    ↓ (generates alerts)
Elasticsearch
    ↓ (queried every 5s)
Dashboard Backend (server.js)
    ↓ (WebSocket)
Dashboard Frontend (React)
    ↓ (Canvas animation)
Laser + Hologram Display
```

## Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `ELASTICSEARCH_URL` | http://localhost:9200 | Elasticsearch endpoint |
| `ELASTICSEARCH_USERNAME` | elastic | ES username |
| `ELASTICSEARCH_PASSWORD` | changeme | ES password |
| `WAZUH_INDEX_PATTERN` | wazuh-alerts-* | Index pattern |
| `ALERT_POLLING_INTERVAL` | 5000 | Poll interval (ms) |
| `MIN_ALERT_LEVEL` | 1 | Minimum alert level |
| `MAX_ALERTS_PER_BATCH` | 100 | Max alerts per fetch |
| `USE_MOCK_DATA` | false | Use mock data |
| `ENABLE_WEBHOOK` | true | Enable webhook endpoint |

## Security Considerations

1. **Use HTTPS** in production
2. **Restrict CORS** to allowed origins
3. **Use API keys** instead of passwords
4. **Enable authentication** on Elasticsearch
5. **Monitor webhook endpoint** for abuse

## Support

For issues with:
- **Wazuh**: https://documentation.wazuh.com/
- **Elasticsearch**: https://www.elastic.co/guide/
- **Dashboard**: Check server logs with `DEBUG=* node server.js`