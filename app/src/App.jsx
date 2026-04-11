import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { Shield, ChevronLeft, Database, Maximize2, X } from 'lucide-react';
import Hologram from './components/Hologram';
import LaserLayer from './components/LaserLayer';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import BottomLogTable from './components/BottomLogTable';

// Severity filter options
const SEVERITY_FILTERS = ['ALL', 'LOW', 'MEDIUM', 'HIGH'];

// Helper to get severity from level
const getSeverity = (level) => {
  if (level >= 10) return 'HIGH';
  if (level >= 5) return 'MEDIUM';
  return 'LOW';
};

function App() {
  // Connection and data states
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [systemStatus, setSystemStatus] = useState('ACTIVE');
  
  // Stats
  const [stats, setStats] = useState({
    activeThreats: 0,
    totalAttacksToday: 0,
    blockedRequests: 0
  });
  
  // Attacks and logs
  const [attacks, setAttacks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [trendData, setTrendData] = useState([]);
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Table sorting
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  
  // View state
  const [showDetailedLogs, setShowDetailedLogs] = useState(false);
  
  // Hologram state
  const [isAttacked, setIsAttacked] = useState(false);
  const [hologramClickAnim, setHologramClickAnim] = useState(false);
  const hologramRef = useRef(null);
  const [hologramPosition, setHologramPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Initialize Socket.io connection
  useEffect(() => {
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('systemStatus', (data) => {
      setSystemStatus(data.status);
    });

    newSocket.on('stats', (data) => {
      setStats(data);
    });

    newSocket.on('attack', (attack) => {
      setAttacks(prev => [...prev, attack]);
      setLogs(prev => [attack, ...prev].slice(0, 200));
      // Trigger hologram attack animation
      setIsAttacked(true);
      setTimeout(() => setIsAttacked(false), 500);
    });

    newSocket.on('trendData', (data) => {
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

    // Delay to ensure DOM is ready
    const timer = setTimeout(() => {
      updateHologramPosition();
    }, 100);

    window.addEventListener('resize', updateHologramPosition);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHologramPosition);
    };
  }, []);

  // Handle laser hit
  const handleLaserHit = useCallback(() => {
    setIsAttacked(true);
    setTimeout(() => setIsAttacked(false), 500);
  }, []);

  // Handle hologram click
  const handleHologramClick = () => {
    setHologramClickAnim(true);
    setTimeout(() => setHologramClickAnim(false), 1000);
  };

  // Filtered logs (used by both RightPanel and BottomLogTable)
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSeverity = severityFilter === 'ALL' || getSeverity(log.level) === severityFilter;
      const matchesSearch = 
        searchQuery === '' || 
        log.rule?.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.src_ip?.includes(searchQuery);
      return matchesSeverity && matchesSearch;
    });
  }, [logs, severityFilter, searchQuery]);

  // Toggle system status
  const toggleSystemStatus = () => {
    const newStatus = systemStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setSystemStatus(newStatus);
    if (socket) {
      socket.emit('setSystemStatus', { status: newStatus });
    }
  };

  return (
    <div className="min-h-screen overflow-hidden relative font-mono" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Scanline overlay */}
      <div className="scanline fixed inset-0 pointer-events-none z-[100]" />
      
      {/* Subtle grid background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 217, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124, 58, 237, 0.015) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Ambient glow effects */}
      <div 
        className="fixed top-0 left-1/4 w-96 h-96 pointer-events-none z-0 opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)'
        }}
      />
      <div 
        className="fixed bottom-0 right-1/4 w-96 h-96 pointer-events-none z-0 opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(0, 217, 255, 0.12) 0%, transparent 70%)',
          filter: 'blur(60px)'
        }}
      />

      {/* MAIN LAYOUT */}
      <div className="relative z-10 h-screen flex flex-col" ref={containerRef}>
        
        {/* TOP BAR - Logo & System Status */}
        <header 
          className="h-16 flex items-center justify-between px-6 backdrop-blur-md"
          style={{ 
            background: 'rgba(10, 10, 21, 0.8)',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield 
                className="w-8 h-8" 
                style={{ color: 'var(--accent-violet)', filter: 'drop-shadow(0 0 8px var(--accent-violet-glow))' }} 
              />
              <motion.div
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full absolute -top-0.5 left-1/2 transform -translate-x-1/2"
                  style={{ background: 'var(--accent-cyan)' }}
                />
              </motion.div>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wider font-mono">
                <span style={{ color: 'var(--accent-violet)', textShadow: '0 0 8px var(--accent-violet-glow)' }}>CYBER</span>
                <span style={{ color: 'var(--accent-cyan)', textShadow: '0 0 8px var(--accent-cyan-glow)' }}>SHIELD</span>
              </h1>
              <p className="text-[10px] tracking-widest" style={{ color: 'var(--text-muted)' }}>THREAT DETECTION SYSTEM v2.0</p>
            </div>
          </div>

          {/* Center - System Status */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono tracking-widest" style={{ color: 'var(--text-secondary)' }}>SYSTEM STATUS</span>
              <button
                onClick={toggleSystemStatus}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all"
                style={{
                  borderColor: systemStatus === 'ACTIVE' ? 'var(--status-success)' : 'var(--status-danger)',
                  color: systemStatus === 'ACTIVE' ? 'var(--status-success)' : 'var(--status-danger)',
                  backgroundColor: systemStatus === 'ACTIVE' ? 'var(--status-success-soft)' : 'var(--status-danger-soft)',
                  boxShadow: systemStatus === 'ACTIVE' ? '0 0 12px var(--status-success-glow)' : '0 0 12px var(--status-danger-glow)'
                }}
              >
                <motion.div 
                  className="w-2 h-2 rounded-full"
                  style={{ background: systemStatus === 'ACTIVE' ? 'var(--status-success)' : 'var(--status-danger)' }}
                  animate={systemStatus === 'ACTIVE' ? { opacity: [1, 0.3, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-sm font-bold font-mono tracking-wider">{systemStatus}</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ background: connected ? 'var(--status-success)' : 'var(--status-danger)' }}
              />
              <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                {connected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>

          {/* Right - Detailed Logs Button */}
          <button
            onClick={() => setShowDetailedLogs(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105"
            style={{ 
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-default)'
            }}
          >
            <Database className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
            <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>DETAILED LOGS</span>
            <span 
              className="px-2 py-0.5 rounded-full text-[10px]"
              style={{ background: 'var(--accent-cyan-soft)', color: 'var(--accent-cyan)' }}
            >
              {filteredLogs.length}
            </span>
          </button>
        </header>

        {/* MAIN CONTENT - Three Column Layout */}
        <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
          
          {/* LEFT COLUMN - Stats & Analysis (2.5 cols) */}
          <div className="col-span-3 flex flex-col gap-4 h-full overflow-hidden">
            <LeftPanel 
              stats={stats} 
              trendData={trendData}
            />
          </div>

          {/* CENTER - Hologram (6 cols) */}
          <div 
            className="col-span-6 relative flex items-center justify-center"
            style={{ minHeight: '500px' }}
          >
            {/* Laser Layer - Full size canvas for lasers */}
            <div className="absolute inset-0 z-10 pointer-events-none">
              <LaserLayer 
                attacks={attacks}
                onHit={handleLaserHit}
                hologramPosition={hologramPosition}
              />
            </div>
            
            {/* Hologram Container */}
            <div 
              ref={hologramRef}
              className="relative z-20 flex items-center justify-center"
              style={{ height: '300px', width: '300px' }}
            >
              <Hologram 
                isAttacked={isAttacked}
                systemStatus={systemStatus}
                clickAnim={hologramClickAnim}
                onClick={handleHologramClick}
              />
            </div>

            {/* Decorative corners */}
            <div 
              className="absolute top-0 left-0 w-16 h-16 rounded-tl-lg"
              style={{ borderLeft: '2px solid var(--accent-violet)', borderTop: '2px solid var(--accent-violet)', opacity: 0.3 }}
            />
            <div 
              className="absolute top-0 right-0 w-16 h-16 rounded-tr-lg"
              style={{ borderRight: '2px solid var(--accent-violet)', borderTop: '2px solid var(--accent-violet)', opacity: 0.3 }}
            />
            <div 
              className="absolute bottom-0 left-0 w-16 h-16 rounded-bl-lg"
              style={{ borderLeft: '2px solid var(--accent-cyan)', borderBottom: '2px solid var(--accent-cyan)', opacity: 0.3 }}
            />
            <div 
              className="absolute bottom-0 right-0 w-16 h-16 rounded-br-lg"
              style={{ borderRight: '2px solid var(--accent-cyan)', borderBottom: '2px solid var(--accent-cyan)', opacity: 0.3 }}
            />

            {/* Center crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                className="w-full h-[1px]"
                style={{ background: 'linear-gradient(to right, transparent, var(--accent-cyan-soft), transparent)' }}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                className="h-full w-[1px]"
                style={{ background: 'linear-gradient(to bottom, transparent, var(--accent-violet-soft), transparent)' }}
              />
            </div>
          </div>

          {/* RIGHT COLUMN - Live Feed (2.5 cols) */}
          <div className="col-span-3 flex flex-col gap-4 h-full overflow-hidden">
            <RightPanel 
              logs={logs}
              filteredLogs={filteredLogs}
              severityFilter={severityFilter}
              setSeverityFilter={setSeverityFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              severityFilters={SEVERITY_FILTERS}
              getSeverity={getSeverity}
            />
          </div>
        </div>

        {/* Quick Stats Footer */}
        <footer 
          className="h-12 flex items-center justify-between px-6 backdrop-blur-sm"
          style={{ 
            background: 'rgba(10, 10, 21, 0.8)',
            borderTop: '1px solid var(--border-subtle)'
          }}
        >
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Logs</span>
              <span className="text-sm font-bold font-mono" style={{ color: 'var(--text-secondary)' }}>{logs.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Filtered</span>
              <span className="text-sm font-bold font-mono" style={{ color: 'var(--accent-cyan)' }}>{filteredLogs.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>High Severity</span>
              <span className="text-sm font-bold font-mono" style={{ color: 'var(--status-danger)' }}>
                {logs.filter(l => getSeverity(l.level) === 'HIGH').length}
              </span>
            </div>
          </div>
          <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            CYBERSHIELD SECURITY SYSTEM // CLASSIFIED
          </div>
        </footer>
      </div>

      {/* DETAILED LOGS MODAL/PAGE */}
      <AnimatePresence>
        {showDetailedLogs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-[#020208]"
          >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-cyan-500/10 bg-[#020208]/90 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowDetailedLogs(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg glass-panel hover:bg-cyan-500/10 transition-all"
                >
                  <ChevronLeft className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono text-cyan-300">BACK TO DASHBOARD</span>
                </button>
                <div className="w-px h-6 bg-cyan-500/20" />
                <h2 className="text-lg font-bold text-cyan-300 font-mono tracking-wider">DETAILED LOGS</h2>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-xs text-cyan-500/50 font-mono">
                  Showing {filteredLogs.length} entries
                </span>
                <button
                  onClick={() => setShowDetailedLogs(false)}
                  className="p-2 rounded-lg glass-panel hover:bg-red-500/10 transition-all"
                >
                  <X className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>

            {/* Full-screen Log Table */}
            <div className="h-[calc(100vh-64px)] p-6 overflow-hidden">
              <BottomLogTable 
                logs={filteredLogs}
                sortConfig={sortConfig}
                setSortConfig={setSortConfig}
                getSeverity={getSeverity}
                fullScreen={true}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
