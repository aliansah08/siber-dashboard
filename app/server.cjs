const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (built frontend)
app.use(express.static('dist'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Helper function for safe property access
function get(obj, path, defaultValue) {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result == null || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }
  return result !== undefined ? result : defaultValue;
}

// ============================================
// OPENSEARCH CLIENT CONFIGURATION
// ============================================
let osClient = null;
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true';
const ENABLE_WEBHOOK = process.env.ENABLE_WEBHOOK !== 'false';

if (!USE_MOCK_DATA) {
  try {
    const { Client } = require('@opensearch-project/opensearch');
    
    const osConfig = {
      node: process.env.OPENSEARCH_URL || 'https://localhost:9200',
      requestTimeout: 30000,
      maxRetries: 3,
      sniffOnStart: false
    };

    // Add authentication if provided
    if (process.env.OPENSEARCH_USERNAME && process.env.OPENSEARCH_PASSWORD) {
      osConfig.auth = {
        username: process.env.OPENSEARCH_USERNAME,
        password: process.env.OPENSEARCH_PASSWORD
      };
    }

    // Add SSL configuration for HTTPS
    if (process.env.OPENSEARCH_URL && process.env.OPENSEARCH_URL.startsWith('https')) {
      const caPath = process.env.OPENSEARCH_SSL_CA || '/home/wazuh/wazuh-docker/single-node/config/wazuh_indexer_ssl_certs/root-ca.pem';
      
      if (fs.existsSync(caPath)) {
        osConfig.ssl = {
          ca: fs.readFileSync(caPath),
          rejectUnauthorized: process.env.OPENSEARCH_SSL_REJECT_UNAUTHORIZED !== 'false'
        };
        console.log('✅ SSL CA certificate loaded:', caPath);
      } else {
        console.warn('⚠️ SSL CA certificate not found at:', caPath);
        console.log('   Trying without certificate verification...');
        osConfig.ssl = {
          rejectUnauthorized: false
        };
      }
    }

    osClient = new Client(osConfig);
    console.log('✅ OpenSearch client initialized');
    console.log('   URL:', osConfig.node);
    console.log('   SSL:', osConfig.ssl ? 'Enabled' : 'Disabled');
  } catch (error) {
    console.error('❌ Failed to initialize OpenSearch client:', error.message);
    console.log('⚠️  Falling back to mock data mode...');
  }
}

// ============================================
// WAZUH ALERT FETCHING FROM OPENSEARCH
// ============================================

let lastAlertTimestamp = new Date(Date.now() - 60000).toISOString();
const processedAlerts = new Set();
const MAX_CACHE_SIZE = 1000;

async function fetchWazuhAlerts() {
  if (!osClient) {
    console.log('ℹ️  OpenSearch not available, skipping fetch');
    return [];
  }

  try {
    const indexPattern = process.env.WAZUH_INDEX_PATTERN || 'wazuh-alerts-*';
    const minLevel = parseInt(process.env.MIN_ALERT_LEVEL) || 1;
    const maxAlerts = parseInt(process.env.MAX_ALERTS_PER_BATCH) || 100;

    const response = await osClient.search({
      index: indexPattern,
      body: {
        size: maxAlerts,
        sort: [{ '@timestamp': { order: 'desc' } }],
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gt: lastAlertTimestamp
                  }
                }
              },
              {
                range: {
                  'rule.level': {
                    gte: minLevel
                  }
                }
              }
            ]
          }
        }
      }
    });

    if (response.body.hits.hits.length > 0) {
      lastAlertTimestamp = response.body.hits.hits[0]._source['@timestamp'];
    }

    const alerts = response.body.hits.hits
      .map(hit => {
        const source = hit._source;
        const ruleId = get(source, 'rule.id', '0');
        const srcIp = get(source, 'data.srcip', null) || get(source, 'agent.ip', 'unknown');
        const alertId = `${source['@timestamp']}-${ruleId}-${srcIp}`;
        
        if (processedAlerts.has(alertId)) {
          return null;
        }
        
        processedAlerts.add(alertId);
        
        if (processedAlerts.size > MAX_CACHE_SIZE) {
          const firstItem = processedAlerts.values().next().value;
          processedAlerts.delete(firstItem);
        }

        return {
          id: hit._id,
          timestamp: source['@timestamp'],
          level: get(source, 'rule.level', 1),
          src_ip: srcIp,
          dst_ip: get(source, 'data.dstip', 'unknown'),
          rule: {
            description: get(source, 'rule.description', 'Unknown alert'),
            id: ruleId,
            groups: get(source, 'rule.groups', [])
          },
          geo: get(source, 'geoip', { 
            country_name: 'Unknown',
            city_name: 'Unknown',
            location: { lat: 0, lon: 0 }
          }),
          location: get(source, 'location', 'Unknown'),
          full_log: get(source, 'full_log', ''),
          agent: {
            name: get(source, 'agent.name', 'unknown'),
            id: get(source, 'agent.id', '0')
          },
          laserOrigin: generateLaserOrigin(),
          mitre: get(source, 'rule.mitre', {})
        };
      })
      .filter(alert => alert !== null);

    return alerts;
  } catch (error) {
    console.error('❌ Error fetching Wazuh alerts:', error.message);
    return [];
  }
}

async function getWazuhStats() {
  if (!osClient) {
    return {
      activeThreats: Math.floor(Math.random() * 50),
      totalAttacksToday: Math.floor(Math.random() * 5000) + 1000,
      blockedRequests: Math.floor(Math.random() * 10000) + 5000
    };
  }

  try {
    const indexPattern = process.env.WAZUH_INDEX_PATTERN || 'wazuh-alerts-*';
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [totalResponse, highSeverityResponse] = await Promise.all([
      osClient.count({
        index: indexPattern,
        body: {
          query: {
            range: {
              '@timestamp': {
                gte: startOfDay
              }
            }
          }
        }
      }),
      osClient.count({
        index: indexPattern,
        body: {
          query: {
            bool: {
              must: [
                { range: { '@timestamp': { gte: startOfDay } } },
                { range: { 'rule.level': { gte: 10 } } }
              ]
            }
          }
        }
      })
    ]);

    return {
      activeThreats: highSeverityResponse.body.count,
      totalAttacksToday: totalResponse.body.count,
      blockedRequests: Math.floor(totalResponse.body.count * 0.7)
    };
  } catch (error) {
    console.error('❌ Error fetching stats:', error.message);
    return {
      activeThreats: 0,
      totalAttacksToday: 0,
      blockedRequests: 0
    };
  }
}

async function getTrendData() {
  if (!osClient) {
    return generateMockTrendData();
  }

  try {
    const indexPattern = process.env.WAZUH_INDEX_PATTERN || 'wazuh-alerts-*';
    
    const response = await osClient.search({
      index: indexPattern,
      body: {
        size: 0,
        query: {
          range: {
            '@timestamp': {
              gte: 'now-1h'
            }
          }
        },
        aggs: {
          alerts_over_time: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '5m',
              min_doc_count: 0
            }
          }
        }
      }
    });

    const buckets = (response.body.aggregations && response.body.aggregations.alerts_over_time && response.body.aggregations.alerts_over_time.buckets) || [];
    
    return buckets.map(bucket => ({
      time: new Date(bucket.key).toLocaleTimeString(),
      attacks: bucket.doc_count
    }));
  } catch (error) {
    console.error('❌ Error fetching trend data:', error.message);
    return generateMockTrendData();
  }
}

// ============================================
// MOCK DATA GENERATOR (Fallback)
// ============================================

const attackTypes = [
  'SQL Injection Attempt', 'XSS Attack Detected', 'Brute Force Login',
  'Port Scan Detected', 'Malware Signature Match', 'Suspicious File Access',
  'Privilege Escalation Attempt', 'DDoS Attack Pattern', 'Phishing Link Detected',
  'Command Injection', 'Directory Traversal', 'Unusual Network Traffic',
  'Failed SSH Authentication', 'Web Shell Upload Attempt', 'CSRF Attack Detected'
];

const countries = [
  'China', 'Russia', 'United States', 'Brazil', 'Germany', 'India',
  'North Korea', 'Iran', 'Ukraine', 'Vietnam', 'Romania', 'Bulgaria'
];

function generateMockAttack() {
  const now = new Date();
  const level = Math.floor(Math.random() * 15) + 1;
  
  return {
    id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: now.toISOString(),
    level: level,
    src_ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    dst_ip: '192.168.1.100',
    rule: {
      description: attackTypes[Math.floor(Math.random() * attackTypes.length)],
      id: `${Math.floor(Math.random() * 90000) + 10000}`,
      groups: ['web', 'attack']
    },
    geo: {
      country_name: countries[Math.floor(Math.random() * countries.length)],
      city_name: 'Unknown',
      location: { lat: 0, lon: 0 }
    },
    location: '/var/www/html/index.php',
    full_log: `[${now.toISOString()}] Mock attack generated`,
    agent: { name: 'mock-agent', id: '000' },
    laserOrigin: generateLaserOrigin(),
    mitre: {}
  };
}

function generateMockTrendData() {
  const data = [];
  for (let i = 0; i < 20; i++) {
    data.push({
      time: new Date(Date.now() - (19 - i) * 300000).toLocaleTimeString(),
      attacks: Math.floor(Math.random() * 50) + 10
    });
  }
  return data;
}

function generateLaserOrigin() {
  const side = Math.floor(Math.random() * 4);
  const percent = Math.random() * 100;

  switch (side) {
    case 0: return { x: percent, y: 0, side: 'top' };
    case 1: return { x: 100, y: percent, side: 'right' };
    case 2: return { x: percent, y: 100, side: 'bottom' };
    case 3: return { x: 0, y: percent, side: 'left' };
  }
}

// ============================================
// ALERT POLLING SYSTEM
// ============================================

let pollingInterval = null;
let statsInterval = null;

async function startAlertPolling() {
  if (USE_MOCK_DATA || !osClient) {
    console.log('🎭 Using mock data generator');
    startMockGenerator();
    return;
  }

  console.log('🚀 Starting Wazuh alert polling...');
  const interval = parseInt(process.env.ALERT_POLLING_INTERVAL) || 5000;

  pollingInterval = setInterval(async () => {
    try {
      const alerts = await fetchWazuhAlerts();
      
      alerts.forEach(alert => {
        console.log(`[${new Date().toISOString()}] 🚨 Wazuh Alert: ${alert.rule.description} (Level ${alert.level})`);
        io.emit('attack', alert);
      });
    } catch (error) {
      console.error('❌ Error in polling loop:', error.message);
    }
  }, interval);
}

async function startStatsPolling() {
  statsInterval = setInterval(async () => {
    try {
      const stats = await getWazuhStats();
      io.emit('stats', stats);
    } catch (error) {
      console.error('❌ Error sending stats:', error.message);
    }
  }, 10000);
}

function startMockGenerator() {
  console.log('🎭 Starting mock attack generator...');
  
  const scheduleNextAttack = () => {
    const delay = Math.random() * 4000 + 1000;
    setTimeout(() => {
      const attack = generateMockAttack();
      console.log(`[MOCK] ⚔️  ${attack.rule.description} from ${attack.src_ip}`);
      io.emit('attack', attack);
      scheduleNextAttack();
    }, delay);
  };

  scheduleNextAttack();

  statsInterval = setInterval(() => {
    io.emit('stats', {
      activeThreats: Math.floor(Math.random() * 50),
      totalAttacksToday: Math.floor(Math.random() * 5000) + 1000,
      blockedRequests: Math.floor(Math.random() * 10000) + 5000
    });
  }, 5000);
}

// ============================================
// WEBHOOK ENDPOINT
// ============================================

if (ENABLE_WEBHOOK) {
  app.post('/api/webhook', (req, res) => {
    try {
      const alert = req.body;
      
      const formattedAlert = {
        id: `webhook-${Date.now()}`,
        timestamp: get(alert, 'timestamp', new Date().toISOString()),
        level: get(alert, 'rule.level', 1),
        src_ip: get(alert, 'data.srcip', 'unknown'),
        dst_ip: get(alert, 'data.dstip', 'unknown'),
        rule: {
          description: get(alert, 'rule.description', 'Wazuh Alert'),
          id: get(alert, 'rule.id', '0'),
          groups: get(alert, 'rule.groups', [])
        },
        geo: get(alert, 'geoip', { 
          country_name: 'Unknown',
          city_name: 'Unknown',
          location: { lat: 0, lon: 0 }
        }),
        location: get(alert, 'location', 'Unknown'),
        full_log: get(alert, 'full_log', ''),
        agent: {
          name: get(alert, 'agent.name', 'unknown'),
          id: get(alert, 'agent.id', '0')
        },
        laserOrigin: generateLaserOrigin(),
        mitre: get(alert, 'rule.mitre', {})
      };

      console.log(`[WEBHOOK] 📡 Received alert: ${formattedAlert.rule.description}`);
      io.emit('attack', formattedAlert);
      res.status(200).json({ status: 'success', message: 'Alert received' });
    } catch (error) {
      console.error('❌ Webhook error:', error.message);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });
}

// ============================================
// SOCKET.IO HANDLERS
// ============================================

io.on('connection', async (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.emit('systemStatus', { active: true, status: 'ACTIVE' });

  try {
    const stats = await getWazuhStats();
    socket.emit('stats', stats);

    const trends = await getTrendData();
    socket.emit('trendData', trends);
  } catch (error) {
    console.error('❌ Error sending initial data:', error.message);
  }

  socket.on('disconnect', () => {
    console.log(`👋 Client disconnected: ${socket.id}`);
  });

  socket.on('setSystemStatus', (data) => {
    console.log(`🔄 System status changed to: ${data.status}`);
    io.emit('systemStatus', { status: data.status });
  });
});

// ============================================
// API ENDPOINTS
// ============================================

app.get('/api/health', async (req, res) => {
  let osStatus = 'disconnected';
  
  if (osClient) {
    try {
      await osClient.ping();
      osStatus = 'connected';
    } catch (error) {
      osStatus = 'error';
    }
  }

  res.json({
    status: 'ok',
    opensearch: osStatus,
    timestamp: new Date().toISOString(),
    mode: USE_MOCK_DATA ? 'mock' : 'production'
  });
});

app.get('/api/trends', async (req, res) => {
  try {
    const trends = await getTrendData();
    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SERVE FRONTEND (Production)
// ============================================

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 3001;

server.listen(PORT, async () => {
  console.log('\n' + '='.repeat(70));
  console.log('  🔥 CYBER ATTACK DASHBOARD - OPENSEARCH EDITION 🔥');
  console.log('='.repeat(70));
  console.log(`  Server running on port ${PORT}`);
  console.log(`  WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`  Mode: ${USE_MOCK_DATA ? '🎭 MOCK DATA' : '🔍 OPENSEARCH/WAZUH'}`);
  
  if (osClient && !USE_MOCK_DATA) {
    try {
      await osClient.ping();
      console.log('  ✅ OpenSearch connection: OK');
    } catch (error) {
      console.log('  ❌ OpenSearch connection: FAILED');
      console.log(`     Error: ${error.message}`);
      console.log('     ⚠️  Falling back to mock data mode...');
    }
  }
  
  console.log('='.repeat(70) + '\n');
  
  await startAlertPolling();
  await startStatsPolling();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully');
  if (pollingInterval) clearInterval(pollingInterval);
  if (statsInterval) clearInterval(statsInterval);
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully');
  if (pollingInterval) clearInterval(pollingInterval);
  if (statsInterval) clearInterval(statsInterval);
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
