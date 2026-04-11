import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  Ban,
  Activity,
  Search,
  Filter,
  Server,
  Globe,
  ChevronUp,
  ChevronDown,
  Zap,
  Lock,
  Eye,
  Terminal
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { io } from 'socket.io-client';
import Hologram from './components/Hologram';
import LaserLayer from './components/LaserLayer';

// Severity filter options
const SEVERITY_FILTERS = ['ALL', 'LOW', 'MEDIUM', 'HIGH'];

// Helper to get severity from level
const getSeverity = (level: number): string => {
  if (level >= 10) return 'HIGH';
  if (level >= 5) return 'MEDIUM';
  return 'LOW';
};

// Helper to format timestamp
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Types
interface Rule {
  description: string;
  id: string;
}

interface Geo {
  country_name: string;
}

interface Attack {
  id: string;
  timestamp: string;
  level: number;
  src_ip: string;
  rule: Rule;
  geo: Geo;
  location: string;
  full_log: string;
  laserOrigin?: {
    x: number;
    y: number;
    side: string;
  };
}

interface Stats {
  activeThreats: number;
  totalAttacksToday: number;
  blockedRequests: number;
}

interface TrendDataPoint {
  time: string;
  attacks: number;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

function App() {
  // Connection and data states
  const [socket, setSocket] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [systemStatus, setSystemStatus] = useState('ACTIVE');

  // Stats
  const [stats, setStats] = useState<Stats>({
    activeThreats: 0,
    totalAttacksToday: 0,
    blockedRequests: 0
  });

  // Attacks and logs
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [logs, setLogs] = useState<Attack[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Table sorting
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'desc' });

  // Hologram state
  const [isAttacked, setIsAttacked] = useState(false);
  const hologramRef = useRef<HTMLDivElement>(null);
  const [hologramPosition, setHologramPosition] = useState<{ x: number, y: number } | null>(null);

  // Refs for scroll containers
  const logStreamRef = useRef<HTMLDivElement>(null);

  // Initialize Socket.io connection
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('systemStatus', (data: { status: string }) => {
      setSystemStatus(data.status);
    });

    newSocket.on('stats', (data: Stats) => {
      setStats(data);
    });

    newSocket.on('attack', (attack: Attack) => {
      setAttacks(prev => [...prev, attack]);
      setLogs(prev => [attack, ...prev].slice(0, 100));
    });

    newSocket.on('trendData', (data: TrendDataPoint[]) => {
      setTrendData(data);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Get hologram position for laser targeting
  useEffect(() => {
    const updateHologramPosition = () => {
      if (hologramRef.current) {
        const rect = hologramRef.current.getBoundingClientRect();
        const parent = hologramRef.current.parentElement;
        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          setHologramPosition({
            x: rect.left - parentRect.left + rect.width / 2,
            y: rect.top - parentRect.top + rect.height / 2
          });
        }
      }
    };

    updateHologramPosition();
    window.addEventListener('resize', updateHologramPosition);

    return () => window.removeEventListener('resize', updateHologramPosition);
  }, []);

  // Handle laser hit
  const handleLaserHit = useCallback(() => {
    setIsAttacked(true);
    setTimeout(() => setIsAttacked(false), 500);
  }, []);

  // Auto-scroll log stream
  useEffect(() => {
    if (logStreamRef.current) {
      logStreamRef.current.scrollTop = 0;
    }
  }, [logs]);

  // Filtered logs for table
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSeverity = severityFilter === 'ALL' || getSeverity(log.level) === severityFilter;
      const matchesSearch =
        searchQuery === '' ||
        log.rule.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.src_ip.includes(searchQuery);
      return matchesSeverity && matchesSearch;
    });
  }, [logs, severityFilter, searchQuery]);

  // Sorted logs for table
  const sortedLogs = useMemo(() => {
    const sorted = [...filteredLogs];
    sorted.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortConfig.key === 'timestamp') {
        aVal = new Date(a.timestamp);
        bVal = new Date(b.timestamp);
      } else if (sortConfig.key === 'level') {
        aVal = a.level;
        bVal = b.level;
      } else if (sortConfig.key === 'rule.id') {
        aVal = a.rule.id;
        bVal = b.rule.id;
      } else if (sortConfig.key === 'rule.description') {
        aVal = a.rule.description;
        bVal = b.rule.description;
      } else if (sortConfig.key === 'src_ip') {
        aVal = a.src_ip;
        bVal = b.src_ip;
      } else {
        aVal = (a as any)[sortConfig.key];
        bVal = (b as any)[sortConfig.key];
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredLogs, sortConfig]);

  // Top source IPs
  const topSourceIPs = useMemo(() => {
    const ipCounts: Record<string, number> = {};
    logs.forEach(log => {
      ipCounts[log.src_ip] = (ipCounts[log.src_ip] || 0) + 1;
    });
    return Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [logs]);

  // Handle sort
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Toggle system status
  const toggleSystemStatus = () => {
    const newStatus = systemStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setSystemStatus(newStatus);
    if (socket) {
      socket.emit('setSystemStatus', { status: newStatus });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1F] text-[#00FFFF] font-mono overflow-hidden">
      {/* Scanline overlay */}
      <div className="scanline fixed inset-0 pointer-events-none z-50" />

      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Main Layout */}
      <div className="relative z-10 flex flex-col h-screen p-4 gap-4">

        {/* TOP BAR */}
        <header className="flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="w-10 h-10 text-[#FF00FF]" />
              <motion.div
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-2 h-2 bg-[#00FFFF] rounded-full absolute -top-1 left-1/2 transform -translate-x-1/2" />
              </motion.div>
            </div>
            <div>
              <h1 className="text-xl font-bold neon-text-pink tracking-wider">
                CYBER<span className="neon-text-cyan">SHIELD</span>
              </h1>
              <p className="text-xs text-cyan-500/60">THREAT DETECTION SYSTEM</p>
            </div>
          </div>

          {/* System Status */}
          <div className="flex items-center gap-4 hud-panel px-6 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs text-cyan-500/60">SYSTEM STATUS</span>
              <button
                onClick={toggleSystemStatus}
                className={`flex items-center gap-2 px-3 py-1 rounded border transition-all ${systemStatus === 'ACTIVE'
                    ? 'border-[#00FF00] text-[#00FF00] shadow-[0_0_10px_#00FF00]'
                    : 'border-[#FF0040] text-[#FF0040] shadow-[0_0_10px_#FF0040]'
                  }`}
              >
                <div className={`w-2 h-2 rounded-full ${systemStatus === 'ACTIVE' ? 'bg-[#00FF00] animate-pulse' : 'bg-[#FF0040]'}`} />
                <span className="text-sm font-bold">{systemStatus}</span>
              </button>
            </div>
            <div className="w-px h-6 bg-cyan-500/30" />
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-[#00FF00]' : 'bg-[#FF0040]'}`} />
              <span className="text-xs text-cyan-500/60">
                {connected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="flex gap-3">
            <motion.div
              className="hud-panel px-4 py-2 rounded-lg min-w-[140px]"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-[#FF0040]" />
                <span className="text-xs text-cyan-500/60">ACTIVE THREATS</span>
              </div>
              <motion.p
                className="text-2xl font-bold neon-text-red"
                key={stats.activeThreats}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
              >
                {stats.activeThreats}
              </motion.p>
            </motion.div>

            <motion.div
              className="hud-panel px-4 py-2 rounded-lg min-w-[140px]"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-[#FFA500]" />
                <span className="text-xs text-cyan-500/60">ATTACKS TODAY</span>
              </div>
              <motion.p
                className="text-2xl font-bold"
                style={{ color: '#FFA500', textShadow: '0 0 10px #FFA500' }}
                key={stats.totalAttacksToday}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
              >
                {stats.totalAttacksToday.toLocaleString()}
              </motion.p>
            </motion.div>

            <motion.div
              className="hud-panel px-4 py-2 rounded-lg min-w-[140px]"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Ban className="w-4 h-4 text-[#00FF00]" />
                <span className="text-xs text-cyan-500/60">BLOCKED</span>
              </div>
              <motion.p
                className="text-2xl font-bold neon-text-green"
                key={stats.blockedRequests}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
              >
                {stats.blockedRequests.toLocaleString()}
              </motion.p>
            </motion.div>
          </div>
        </header>

        {/* MAIN CONTENT GRID */}
        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">

          {/* LEFT SIDEBAR - Filters & Controls */}
          <aside className="col-span-2 flex flex-col gap-4">
            <div className="hud-panel p-4 rounded-lg flex-1">
              <div className="hud-corner hud-corner-tl" />
              <div className="hud-corner hud-corner-tr" />
              <div className="hud-corner hud-corner-bl" />
              <div className="hud-corner hud-corner-br" />

              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-[#FF00FF]" />
                <h3 className="text-sm font-bold neon-text-pink">FILTERS</h3>
              </div>

              {/* Severity Filter */}
              <div className="mb-6">
                <label className="text-xs text-cyan-500/60 mb-2 block">SEVERITY LEVEL</label>
                <div className="flex flex-col gap-1">
                  {SEVERITY_FILTERS.map(filter => (
                    <button
                      key={filter}
                      onClick={() => setSeverityFilter(filter)}
                      className={`cyber-btn text-xs py-2 text-left px-3 ${severityFilter === filter ? 'active' : ''
                        }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div>
                <label className="text-xs text-cyan-500/60 mb-2 block">SEARCH</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-500/60" />
                  <input
                    type="text"
                    placeholder="IP or Attack Name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="cyber-input w-full pl-10 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="hud-panel p-4 rounded-lg">
              <div className="hud-corner hud-corner-tl" />
              <div className="hud-corner hud-corner-tr" />
              <div className="hud-corner hud-corner-bl" />
              <div className="hud-corner hud-corner-br" />

              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-[#00FFFF]" />
                <h3 className="text-sm font-bold neon-text-cyan">QUICK STATS</h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-cyan-500/60">Log Entries</span>
                  <span className="text-sm font-bold">{logs.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-cyan-500/60">Unique IPs</span>
                  <span className="text-sm font-bold">{topSourceIPs.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-cyan-500/60">High Severity</span>
                  <span className="text-sm font-bold text-[#FF0040]">
                    {logs.filter(l => l.level >= 10).length}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* CENTER - Hologram & Laser Layer */}
          <main className="col-span-6 relative flex flex-col">
            <div
              ref={hologramRef}
              className="flex-1 relative flex items-center justify-center"
            >
              {/* Laser Layer */}
              <LaserLayer
                attacks={attacks}
                onHit={handleLaserHit}
                hologramPosition={hologramPosition}
              />

              {/* Hologram */}
              <Hologram
                isAttacked={isAttacked}
                systemStatus={systemStatus}
              />

              {/* Decorative elements */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="hud-panel p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-[#00FFFF]" />
                        <span className="text-xs">SERVER-01</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-[#00FF00]" />
                        <span className="text-xs text-[#00FF00]">ENCRYPTED</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#FF00FF]" />
                      <span className="text-xs text-[#FF00FF]">MONITORING</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Threat Trend Chart */}
            <div className="hud-panel p-4 rounded-lg h-[200px]">
              <div className="hud-corner hud-corner-tl" />
              <div className="hud-corner hud-corner-tr" />
              <div className="hud-corner hud-corner-bl" />
              <div className="hud-corner hud-corner-br" />

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#00FFFF]" />
                  <h3 className="text-sm font-bold neon-text-cyan">THREAT TREND</h3>
                </div>
                <span className="text-xs text-cyan-500/60">AUTO-REFRESH: 10s</span>
              </div>

              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorAttacks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00FFFF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00FFFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 255, 0.1)" />
                  <XAxis
                    dataKey="time"
                    stroke="rgba(0, 255, 255, 0.3)"
                    tick={{ fill: '#00FFFF', fontSize: 10 }}
                  />
                  <YAxis
                    stroke="rgba(0, 255, 255, 0.3)"
                    tick={{ fill: '#00FFFF', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10, 10, 31, 0.9)',
                      border: '1px solid #00FFFF',
                      borderRadius: '4px'
                    }}
                    labelStyle={{ color: '#00FFFF' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="attacks"
                    stroke="#00FFFF"
                    fillOpacity={1}
                    fill="url(#colorAttacks)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </main>

          {/* RIGHT SIDEBAR - Real-time Feeds */}
          <aside className="col-span-4 flex flex-col gap-4">
            {/* Live Log Stream */}
            <div className="hud-panel p-4 rounded-lg flex-1 flex flex-col">
              <div className="hud-corner hud-corner-tl" />
              <div className="hud-corner hud-corner-tr" />
              <div className="hud-corner hud-corner-bl" />
              <div className="hud-corner hud-corner-br" />

              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-4 h-4 text-[#00FF00]" />
                <h3 className="text-sm font-bold neon-text-green">LIVE LOG STREAM</h3>
              </div>

              <div
                ref={logStreamRef}
                className="flex-1 overflow-y-auto space-y-2 pr-2"
                style={{ maxHeight: '250px' }}
              >
                <AnimatePresence initial={false}>
                  {logs.slice(0, 20).map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="p-2 rounded bg-cyan-500/5 border border-cyan-500/20 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-cyan-500/60">{formatTime(log.timestamp)}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.level >= 10 ? 'severity-high' :
                            log.level >= 5 ? 'severity-medium' : 'severity-low'
                          }`}>
                          LVL {log.level}
                        </span>
                      </div>
                      <div className="text-[#00FFFF] truncate">{log.rule.description}</div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-cyan-500/60">
                        <Globe className="w-3 h-3" />
                        <span>{log.src_ip}</span>
                        <span className="text-[#FF00FF]">{log.geo.country_name}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Top Source IPs */}
            <div className="hud-panel p-4 rounded-lg">
              <div className="hud-corner hud-corner-tl" />
              <div className="hud-corner hud-corner-tr" />
              <div className="hud-corner hud-corner-bl" />
              <div className="hud-corner hud-corner-br" />

              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-[#FFA500]" />
                <h3 className="text-sm font-bold" style={{ color: '#FFA500' }}>TOP SOURCE IPs</h3>
              </div>

              <div className="space-y-2">
                {topSourceIPs.map(([ip, count], index) => (
                  <motion.div
                    key={ip}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-2 rounded bg-cyan-500/5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-cyan-500/60 w-4">{index + 1}.</span>
                      <span className="text-xs text-[#00FFFF]">{ip}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-1 rounded-full bg-[#FF00FF]"
                        style={{ width: `${Math.min(count * 5, 50)}px` }}
                      />
                      <span className="text-xs font-bold text-[#FF00FF]">{count}</span>
                    </div>
                  </motion.div>
                ))}
                {topSourceIPs.length === 0 && (
                  <p className="text-xs text-cyan-500/40 text-center py-4">No data available</p>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* BOTTOM SECTION - Detailed Log Table */}
        <section className="hud-panel p-4 rounded-lg" style={{ height: '280px' }}>
          <div className="hud-corner hud-corner-tl" />
          <div className="hud-corner hud-corner-tr" />
          <div className="hud-corner hud-corner-bl" />
          <div className="hud-corner hud-corner-br" />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#00FFFF]" />
              <h3 className="text-sm font-bold neon-text-cyan">DETAILED LOGS</h3>
            </div>
            <span className="text-xs text-cyan-500/60">
              Showing {sortedLogs.length} entries
            </span>
          </div>

          <div className="overflow-auto" style={{ height: 'calc(100% - 40px)' }}>
            <table className="cyber-table">
              <thead>
                <tr>
                  <th
                    className="cursor-pointer hover:text-[#FF00FF] transition-colors"
                    onClick={() => handleSort('level')}
                  >
                    <div className="flex items-center gap-1">
                      LEVEL
                      {sortConfig.key === 'level' && (
                        sortConfig.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer hover:text-[#FF00FF] transition-colors"
                    onClick={() => handleSort('rule.id')}
                  >
                    <div className="flex items-center gap-1">
                      RULE ID
                      {sortConfig.key === 'rule.id' && (
                        sortConfig.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer hover:text-[#FF00FF] transition-colors"
                    onClick={() => handleSort('rule.description')}
                  >
                    <div className="flex items-center gap-1">
                      DESCRIPTION
                      {sortConfig.key === 'rule.description' && (
                        sortConfig.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer hover:text-[#FF00FF] transition-colors"
                    onClick={() => handleSort('src_ip')}
                  >
                    <div className="flex items-center gap-1">
                      SOURCE IP
                      {sortConfig.key === 'src_ip' && (
                        sortConfig.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th>LOCATION</th>
                  <th
                    className="cursor-pointer hover:text-[#FF00FF] transition-colors"
                    onClick={() => handleSort('timestamp')}
                  >
                    <div className="flex items-center gap-1">
                      TIMESTAMP
                      {sortConfig.key === 'timestamp' && (
                        sortConfig.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {sortedLogs.slice(0, 50).map((log) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <td>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${log.level >= 10 ? 'severity-high' :
                            log.level >= 5 ? 'severity-medium' : 'severity-low'
                          }`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="text-cyan-500/80">{log.rule.id}</td>
                      <td className="text-[#00FFFF]">{log.rule.description}</td>
                      <td className="text-cyan-500/80">{log.src_ip}</td>
                      <td className="text-cyan-500/60 text-xs">{log.location}</td>
                      <td className="text-cyan-500/60 text-xs">{formatTime(log.timestamp)}</td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            {sortedLogs.length === 0 && (
              <div className="text-center py-8 text-cyan-500/40">
                <p>No logs match the current filters</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
