#!/usr/bin/env node
/**
 * OpenSearch Integration Test Script for Wazuh
 * 
 * This script tests the connection to OpenSearch and Wazuh alerts
 * Usage: node test-opensearch-integration.cjs
 */

require('dotenv').config();

console.log('🔍 OpenSearch Integration Test\n');
console.log('='.repeat(70));

const config = {
  node: process.env.OPENSEARCH_URL || 'http://localhost:9200',
  requestTimeout: 30000,
  maxRetries: 3,
  sniffOnStart: false
};

// Add authentication if provided
if (process.env.OPENSEARCH_USERNAME && process.env.OPENSEARCH_PASSWORD) {
  config.auth = {
    username: process.env.OPENSEARCH_USERNAME,
    password: process.env.OPENSEARCH_PASSWORD
  };
}

let client;

try {
  const { Client } = require('@opensearch-project/opensearch');
  client = new Client(config);
} catch (error) {
  console.error('\n❌ Failed to load OpenSearch client:', error.message);
  console.log('   Please install: npm install @opensearch-project/opensearch');
  process.exit(1);
}

async function testConnection() {
  console.log('\n📡 Testing OpenSearch Connection...');
  try {
    const response = await client.ping();
    console.log('✅ Connection successful');
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('   💡 Is OpenSearch running?');
      console.log('   💡 Check if the URL and port are correct');
    }
    if (error.message.includes('authentication')) {
      console.log('   💡 Check your username and password');
    }
    return false;
  }
}

async function testClusterInfo() {
  console.log('\n📊 Fetching Cluster Info...');
  try {
    const response = await client.info();
    const info = response.body;
    console.log('✅ Cluster Name:', info.cluster_name);
    console.log('✅ Version:', info.version.number);
    console.log('✅ Distribution:', info.version.distribution || 'OpenSearch');
    return true;
  } catch (error) {
    console.error('❌ Failed to get cluster info:', error.message);
    return false;
  }
}

async function testWazuhIndices() {
  console.log('\n🔍 Checking Wazuh Indices...');
  try {
    const response = await client.cat.indices({ 
      index: 'wazuh-alerts-*',
      format: 'json'
    });
    
    const indices = response.body;
    
    if (!indices || indices.length === 0) {
      console.warn('⚠️  No Wazuh alert indices found');
      console.log('   💡 Wazuh may not be configured to use OpenSearch');
      console.log('   💡 Check Wazuh indexer configuration');
      return false;
    }
    
    console.log(`✅ Found ${indices.length} Wazuh indices:`);
    indices.forEach(idx => {
      console.log(`   - ${idx.index} (${idx['docs.count']} docs, ${idx['store.size']})`);
    });
    return true;
  } catch (error) {
    console.error('❌ Failed to get indices:', error.message);
    return false;
  }
}

async function testAlertQuery() {
  console.log('\n📡 Testing Alert Query...');
  try {
    const indexPattern = process.env.WAZUH_INDEX_PATTERN || 'wazuh-alerts-*';
    const minLevel = parseInt(process.env.MIN_ALERT_LEVEL) || 1;
    
    const response = await client.search({
      index: indexPattern,
      body: {
        size: 5,
        sort: [{ '@timestamp': { order: 'desc' } }],
        query: {
          range: {
            'rule.level': {
              gte: minLevel
            }
          }
        }
      }
    });
    
    const hits = response.body.hits;
    
    console.log(`✅ Query successful`);
    console.log(`   Found ${hits.total.value} total alerts`);
    
    if (hits.hits.length > 0) {
      console.log('\n📋 Sample Alerts:');
      hits.hits.forEach((hit, i) => {
        const source = hit._source;
        console.log(`\n   ${i + 1}. ${source.rule?.description || 'Unknown'}`);
        console.log(`      Level: ${source.rule?.level || 'N/A'}`);
        console.log(`      Source IP: ${source.data?.srcip || 'N/A'}`);
        console.log(`      Timestamp: ${source['@timestamp']}`);
      });
    } else {
      console.log('\n⚠️  No alerts found in the specified time range');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    return false;
  }
}

async function testTrendData() {
  console.log('\n📈 Testing Trend Data Aggregation...');
  try {
    const indexPattern = process.env.WAZUH_INDEX_PATTERN || 'wazuh-alerts-*';
    
    const response = await client.search({
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

    const buckets = response.body.aggregations?.alerts_over_time?.buckets || [];
    
    console.log(`✅ Aggregation successful`);
    console.log(`   Data points: ${buckets.length}`);
    
    if (buckets.length > 0) {
      console.log('\n   Recent activity:');
      buckets.slice(-3).forEach(bucket => {
        console.log(`   - ${new Date(bucket.key).toLocaleTimeString()}: ${bucket.doc_count} alerts`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Aggregation failed:', error.message);
    return false;
  }
}

async function testWebhook() {
  console.log('\n🌐 Testing Webhook Endpoint...');
  
  const testAlert = {
    timestamp: new Date().toISOString(),
    rule: {
      level: 10,
      description: 'Test Alert from Script',
      id: '999999'
    },
    data: {
      srcip: '192.168.1.100'
    },
    geoip: {
      country_name: 'Test Country'
    },
    full_log: 'This is a test alert'
  };
  
  try {
    const http = require('http');
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 3001,
      path: '/api/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    return new Promise((resolve) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✅ Webhook endpoint responding');
            try {
              const response = JSON.parse(data);
              console.log(`   Status: ${response.status}`);
            } catch (e) {
              console.log('   Response:', data);
            }
            resolve(true);
          } else {
            console.error(`❌ Webhook returned status ${res.statusCode}`);
            console.log('   Response:', data);
            resolve(false);
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('❌ Webhook test failed:', error.message);
        console.log('   💡 Is the dashboard server running? (node server.js)');
        resolve(false);
      });
      
      req.write(JSON.stringify(testAlert));
      req.end();
    });
  } catch (error) {
    console.error('❌ Webhook test error:', error.message);
    return false;
  }
}

async function testHealthEndpoint() {
  console.log('\n💓 Testing Health Endpoint...');
  
  try {
    const http = require('http');
    
    return new Promise((resolve) => {
      http.get(`http://localhost:${process.env.PORT || 3001}/api/health`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const health = JSON.parse(data);
            console.log('✅ Health endpoint responding');
            console.log(`   Status: ${health.status}`);
            console.log(`   OpenSearch: ${health.opensearch}`);
            console.log(`   Mode: ${health.mode}`);
            resolve(true);
          } catch (e) {
            console.error('❌ Invalid response format');
            resolve(false);
          }
        });
      }).on('error', (error) => {
        console.error('❌ Health check failed:', error.message);
        console.log('   💡 Is the dashboard server running? (node server.js)');
        resolve(false);
      });
    });
  } catch (error) {
    console.error('❌ Health test error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('\nConfiguration:');
  console.log(`  OpenSearch URL: ${config.node}`);
  console.log(`  Username: ${config.auth?.username || 'none'}`);
  console.log(`  Index Pattern: ${process.env.WAZUH_INDEX_PATTERN || 'wazuh-alerts-*'}`);
  console.log(`  Dashboard Port: ${process.env.PORT || 3001}`);
  
  const results = {
    connection: await testConnection(),
    clusterInfo: await testClusterInfo(),
    wazuhIndices: await testWazuhIndices(),
    alertQuery: await testAlertQuery(),
    trendData: await testTrendData(),
    webhook: await testWebhook(),
    health: await testHealthEndpoint()
  };
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 Test Results Summary:\n');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${test.padEnd(15)} ${status}`);
  });
  
  const passedCount = Object.values(results).filter(r => r).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('\n🎉 All tests passed! Wazuh + OpenSearch integration is ready.');
    console.log('\nNext steps:');
    console.log('  1. Start the dashboard: node server.js');
    console.log('  2. Open browser to http://localhost:5173');
    console.log('  3. Watch real-time alerts with laser animations!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    console.log('\nTroubleshooting tips:');
    console.log('  1. Ensure OpenSearch is running:');
    console.log('     curl -u admin:admin http://localhost:9200');
    console.log('  2. Verify credentials in .env file');
    console.log('  3. Check Wazuh is sending alerts to OpenSearch:');
    console.log('     curl -u admin:admin http://localhost:9200/wazuh-alerts-*/_search');
    console.log('  4. Start the dashboard server: node server.js');
    console.log('  5. Check firewall rules for port 9200');
  }
  
  process.exit(passedCount === totalCount ? 0 : 1);
}

runTests().catch(error => {
  console.error('\n💥 Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});