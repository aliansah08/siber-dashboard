#!/usr/bin/env node
/**
 * Wazuh Integration Test Script
 * 
 * This script tests the connection to Elasticsearch and Wazuh alerts
 * Usage: node test-wazuh-integration.js
 */

require('dotenv').config();
const { Client } = require('@elastic/elasticsearch');

console.log('🔍 Wazuh Integration Test\n');
console.log('=' .repeat(60));

const config = {
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
  }
};

const client = new Client(config);

async function testConnection() {
  console.log('\n📡 Testing Elasticsearch Connection...');
  try {
    const response = await client.ping();
    console.log('✅ Connection successful');
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

async function testClusterInfo() {
  console.log('\n📊 Fetching Cluster Info...');
  try {
    const info = await client.info();
    console.log('✅ Cluster Name:', info.cluster_name);
    console.log('✅ Version:', info.version.number);
    return true;
  } catch (error) {
    console.error('❌ Failed to get cluster info:', error.message);
    return false;
  }
}

async function testWazuhIndices() {
  console.log('\n🔍 Checking Wazuh Indices...');
  try {
    const indices = await client.cat.indices({ 
      index: 'wazuh-alerts-*',
      format: 'json'
    });
    
    if (indices.length === 0) {
      console.warn('⚠️  No Wazuh alert indices found');
      return false;
    }
    
    console.log(`✅ Found ${indices.length} Wazuh indices:`);
    indices.forEach(idx => {
      console.log(`   - ${idx.index} (${idx['docs.count']} docs)`);
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
    
    console.log(`✅ Query successful`);
    console.log(`   Found ${response.hits.total.value} total alerts`);
    
    if (response.hits.hits.length > 0) {
      console.log('\n📋 Sample Alerts:');
      response.hits.hits.forEach((hit, i) => {
        const source = hit._source;
        console.log(`\n   ${i + 1}. ${source.rule?.description || 'Unknown'}`);
        console.log(`      Level: ${source.rule?.level || 'N/A'}`);
        console.log(`      Source IP: ${source.data?.srcip || 'N/A'}`);
        console.log(`      Timestamp: ${source['@timestamp']}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Query failed:', error.message);
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
        if (res.statusCode === 200) {
          console.log('✅ Webhook endpoint responding');
          resolve(true);
        } else {
          console.error(`❌ Webhook returned status ${res.statusCode}`);
          resolve(false);
        }
      });
      
      req.on('error', (error) => {
        console.error('❌ Webhook test failed:', error.message);
        console.log('   Is the server running? (node server.js)');
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

async function testStatsEndpoint() {
  console.log('\n📈 Testing Stats Endpoint...');
  
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
            console.log(`   Elasticsearch: ${health.elasticsearch}`);
            console.log(`   Mode: ${health.mode}`);
            resolve(true);
          } catch (e) {
            console.error('❌ Invalid response format');
            resolve(false);
          }
        });
      }).on('error', (error) => {
        console.error('❌ Health check failed:', error.message);
        resolve(false);
      });
    });
  } catch (error) {
    console.error('❌ Stats test error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('Configuration:');
  console.log(`  ES URL: ${config.node}`);
  console.log(`  Username: ${config.auth.username}`);
  console.log(`  Index Pattern: ${process.env.WAZUH_INDEX_PATTERN || 'wazuh-alerts-*'}`);
  
  const results = {
    connection: await testConnection(),
    clusterInfo: await testClusterInfo(),
    wazuhIndices: await testWazuhIndices(),
    alertQuery: await testAlertQuery(),
    webhook: await testWebhook(),
    health: await testStatsEndpoint()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary:\n');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${test.padEnd(15)} ${status}`);
  });
  
  const passedCount = Object.values(results).filter(r => r).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('\n🎉 All tests passed! Wazuh integration is ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    console.log('\nTroubleshooting tips:');
    console.log('  1. Ensure Elasticsearch is running');
    console.log('  2. Verify credentials in .env file');
    console.log('  3. Check Wazuh is generating alerts');
    console.log('  4. Start the dashboard server: node server.js');
  }
  
  process.exit(passedCount === totalCount ? 0 : 1);
}

runTests().catch(error => {
  console.error('\n💥 Fatal error:', error.message);
  process.exit(1);
});