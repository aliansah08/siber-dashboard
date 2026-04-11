# 🚀 QUICK START - OpenSearch + Wazuh Integration

## ✅ Setup Complete!

Your dashboard has been configured to use **OpenSearch** instead of Elasticsearch.

## 📋 What Was Changed

1. ✅ **package.json** - Replaced `@elastic/elasticsearch` with `@opensearch-project/opensearch`
2. ✅ **server.js** - Updated to use OpenSearch client with full Wazuh integration
3. ✅ **.env** - Configured with OpenSearch credentials (admin/admin)
4. ✅ **test-opensearch-integration.cjs** - Comprehensive test suite
5. ✅ **OPENSEARCH_INTEGRATION.md** - Complete documentation

## 🎯 Next Steps

### 1. Configure OpenSearch URL

Edit `.env` and update the OpenSearch URL:

```env
OPENSEARCH_URL=http://YOUR_OPENSEARCH_IP:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=your_password
```

### 2. Test Connection

```bash
node test-opensearch-integration.cjs
```

### 3. Start Dashboard

```bash
# Terminal 1
node server.js

# Terminal 2
npm run dev
```

## 🔧 Troubleshooting

If tests fail:

```bash
# Test OpenSearch directly
curl -u admin:admin http://localhost:9200

# Check Wazuh indices
curl -u admin:admin http://localhost:9200/_cat/indices/wazuh-alerts-*

# Use mock mode for testing
# Edit .env: USE_MOCK_DATA=true
```

## 📁 Files Modified

- `package.json` - Dependencies updated
- `server.js` - OpenSearch integration code
- `.env` - Configuration
- `test-opensearch-integration.cjs` - Test suite (NEW)
- `OPENSEARCH_INTEGRATION.md` - Documentation (NEW)

## 🎨 Features

Your dashboard now supports:

- ✅ Real-time Wazuh alerts from OpenSearch
- ✅ Automatic fallback to mock data
- ✅ Laser animations based on alert severity
- ✅ Hologram shake effects on attacks
- ✅ Statistics and trend charts
- ✅ Webhook integration for instant alerts

## 🔗 Important Links

- Full Guide: `OPENSEARCH_INTEGRATION.md`
- Test Script: `test-opensearch-integration.cjs`
- Config: `.env`

---

**Ready to go!** Just update the OpenSearch URL in `.env` and run the dashboard! 🚀