# OpenSearch + Wazuh Integration Guide

## Overview

This guide explains how to integrate your Cyber Attack Dashboard with **Wazuh** using **OpenSearch** (instead of Elasticsearch). OpenSearch is a fully open-source search and analytics engine, forked from Elasticsearch 7.10.2.

## Prerequisites

- Wazuh Manager v4.4+ with OpenSearch integration
- OpenSearch cluster (v2.x recommended)
- Node.js 18+ and npm
- Dashboard server access

## Architecture

```
Wazuh Manager
    ↓ (generates alerts via Filebeat)
OpenSearch Cluster
    ↓ (queried every 5s via Dashboard Backend)
Dashboard Backend (server.js)
    ↓ (WebSocket real-time)
Dashboard Frontend (React + Three.js)
    ↓ (Canvas animation)
Laser + Hologram Display
```

## Quick Start

### 1. Install Dependencies

```bash
cd C:\web\app
npm install
```

This will install `@opensearch-project/opensearch` client.

### 2. Configure Environment Variables

Edit `.env` file:

```env
# OpenSearch Configuration
OPENSEARCH_URL=http://YOUR_OPENSEARCH_IP:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=admin

# Wazuh Settings
WAZUH_INDEX_PATTERN=wazuh-alerts-*
ALERT_POLLING_INTERVAL=5000

# Server Configuration
PORT=3001
USE_MOCK_DATA=false
```

**Default OpenSearch credentials:**
- **OpenSearch 2.x**: admin/admin (or custom admin password)
- **OpenSearch 1.x**: admin/admin

### 3. Test the Connection

```bash
node test-opensearch-integration.cjs
```

This will verify:
- ✅ OpenSearch connectivity
- ✅ Cluster information
- ✅ Wazuh indices availability
- ✅ Alert query functionality
- ✅ Trend data aggregation
- ✅ Webhook endpoint

### 4. Start the Dashboard

**Terminal 1 - Backend:**
```bash
node server.js
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Access the dashboard at `http://localhost:5173`

## OpenSearch Configuration

### Verify OpenSearch is Running

```bash
# Test connection
curl -u admin:admin http://localhost:9200

# Check cluster health
curl -u admin:admin http://localhost:9200/_cluster/health

# List indices
curl -u admin:admin http://localhost:9200/_cat/indices
```

### Check Wazuh Index Pattern

```bash
# List Wazuh alert indices
curl -u admin:admin http://localhost:9200/_cat/indices/wazuh-alerts-*

# Check latest alerts
curl -u admin:admin http://localhost:9200/wazuh-alerts-*/_search?size=5
```

### Sample Alert Structure

Wazuh stores alerts in this format:

```json
{
  "@timestamp": "2024-01-15T10:30:00.000Z",
  "rule": {
    "level": 10,
    "description": "Web attack: SQL Injection attempt",
    "id": "31103",
    "groups": ["web", "accesslog", "attack"]
  },
  "agent": {
    "name": "web-server-01",
    "id": "001"
  },
  "data": {
    "srcip": "192.168.1.100",
    "dstip": "10.0.0.50"
  },
  "geoip": {
    "country_name": "China",
    "city_name": "Beijing"
  },
  "location": "/var/log/apache2/access.log"
}
```

## Features

### Real-time Alert Display

- **Polling Interval**: 5 seconds (configurable via `ALERT_POLLING_INTERVAL`)
- **Deduplication**: Prevents duplicate alerts using cache
- **Fallback Mode**: Automatically switches to mock data if OpenSearch unavailable

### Laser Animation

When alert arrives from Wazuh:

1. **Laser Origin**: Random position at screen edge
2. **Target**: Center hologram
3. **Color by Severity**:
   - 🔴 **Red** (Level 10+): Critical attacks
   - 🟠 **Orange** (Level 5-9): Medium severity
   - 🩵 **Cyan** (Level 1-4): Low severity
4. **Impact**: Hologram shake + glitch effect

### Statistics Dashboard

- **Active Threats**: High severity alerts (Level 10+)
- **Total Attacks Today**: All alerts from midnight
- **Blocked Requests**: Estimated from attack patterns
- **Trend Chart**: 1-hour rolling window

## Webhook Integration (Optional)

For real-time alerts without polling, configure Wazuh Integrator:

### 1. Create Integration Script

On Wazuh Manager server:

```bash
sudo mkdir -p /var/ossec/integrations
sudo tee /var/ossec/integrations/custom-dashboard.py << 'EOF'
#!/usr/bin/env python3
import sys
import json
import urllib.request
import urllib.error

WEBHOOK_URL = "http://YOUR_DASHBOARD_IP:3001/api/webhook"

def main():
    # Read alert from stdin (provided by Wazuh)
    alert = sys.stdin.read()
    
    try:
        # Parse JSON
        alert_json = json.loads(alert)
        
        # Send to dashboard webhook
        req = urllib.request.Request(
            WEBHOOK_URL,
            data=json.dumps(alert_json).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=5) as response:
            print(f"Alert sent successfully: {response.status}")
            
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Error connecting to dashboard: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
EOF

sudo chmod +x /var/ossec/integrations/custom-dashboard.py
```

### 2. Configure Wazuh Integration

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

### 3. Restart Wazuh

```bash
sudo systemctl restart wazuh-manager
```

## Troubleshooting

### Connection Issues

**Problem**: `Connection refused` or `ECONNREFUSED`

```bash
# Check if OpenSearch is running
sudo systemctl status opensearch

# Check OpenSearch logs
sudo tail -f /var/log/opensearch/opensearch.log

# Test from command line
curl -u admin:admin http://localhost:9200/_cluster/health
```

**Problem**: Authentication failed

```bash
# Verify credentials
curl -u admin:YOUR_PASSWORD http://localhost:9200

# Reset OpenSearch admin password (if needed)
cd /usr/share/opensearch/plugins/opensearch-security/tools
./hash.sh
# Then update internal_users.yml
```

### No Alerts Appearing

**Check 1**: Verify Wazuh is generating alerts

```bash
# On Wazuh Manager
sudo tail -f /var/ossec/logs/alerts/alerts.json | jq .
```

**Check 2**: Verify Filebeat is sending to OpenSearch

```bash
sudo systemctl status filebeat
sudo tail -f /var/log/filebeat/filebeat
```

**Check 3**: Check index exists

```bash
curl -u admin:admin http://localhost:9200/_cat/indices/wazuh-alerts-*
```

**Check 4**: Use mock mode for testing

```env
USE_MOCK_DATA=true
```

### Performance Issues

**Too Many Alerts**:
```env
MIN_ALERT_LEVEL=5        # Only show medium+ severity
MAX_ALERTS_PER_BATCH=50  # Reduce batch size
ALERT_POLLING_INTERVAL=10000  # Poll every 10s
```

**Memory Issues**:
- Reduce `MAX_CACHE_SIZE` in server.js (default: 1000)
- Increase Node.js heap: `node --max-old-space-size=4096 server.js`

## API Endpoints

### Health Check
```bash
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "opensearch": "connected",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "mode": "production"
}
```

### Get Trends
```bash
GET /api/trends
```

### Webhook (POST)
```bash
POST /api/webhook
Content-Type: application/json

{
  "rule": {
    "level": 10,
    "description": "Custom Alert"
  },
  "data": {
    "srcip": "192.168.1.1"
  }
}
```

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENSEARCH_URL` | http://localhost:9200 | OpenSearch endpoint |
| `OPENSEARCH_USERNAME` | admin | OS username |
| `OPENSEARCH_PASSWORD` | admin | OS password |
| `WAZUH_INDEX_PATTERN` | wazuh-alerts-* | Index pattern |
| `ALERT_POLLING_INTERVAL` | 5000 | Poll interval (ms) |
| `MIN_ALERT_LEVEL` | 1 | Minimum alert level |
| `MAX_ALERTS_PER_BATCH` | 100 | Max alerts per fetch |
| `USE_MOCK_DATA` | false | Use mock data |
| `ENABLE_WEBHOOK` | true | Enable webhook endpoint |

## Security Best Practices

1. **Enable HTTPS** in production
   ```env
   OPENSEARCH_URL=https://opensearch.local:9200
   ```

2. **Use certificates** for OpenSearch authentication
   ```javascript
   const osClient = new Client({
     node: 'https://opensearch.local:9200',
     auth: { username: 'admin', password: 'password' },
     ssl: {
       ca: fs.readFileSync('/path/to/ca.pem'),
       rejectUnauthorized: true
     }
   });
   ```

3. **Restrict CORS** in production
   ```javascript
   cors({ origin: "https://your-domain.com" })
   ```

4. **Use API keys** instead of passwords (OpenSearch 2.x+)

5. **Enable audit logging** on OpenSearch

## Migration from Elasticsearch

If you're migrating from Elasticsearch:

1. Update package.json dependencies
2. Change imports from `@elastic/elasticsearch` to `@opensearch-project/opensearch`
3. Update environment variables (ELASTICSEARCH_* → OPENSEARCH_*)
4. Test connections with `test-opensearch-integration.cjs`

**API Compatibility**: OpenSearch is API-compatible with Elasticsearch 7.10.2, so most queries work without changes.

## Support & Resources

- **OpenSearch Docs**: https://opensearch.org/docs/
- **Wazuh Docs**: https://documentation.wazuh.com/
- **OpenSearch Forum**: https://forum.opensearch.org/
- **Wazuh Community**: https://wazuh.com/community/

## License

This integration uses:
- OpenSearch (Apache 2.0)
- Wazuh (GPL v2)
- Dashboard components (MIT)