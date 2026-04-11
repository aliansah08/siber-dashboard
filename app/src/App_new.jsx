import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { Shield, ChevronLeft, Database, Server } from 'lucide-react';
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
  const [connectionMode, setConnectionMode] = useState('MOCK'); // 'WAZUH' or 'MOCK'
  
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

  // Fetch connection status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/status');
        const data = await response.json();
        setConnectionMode(data.useMockData ? 'MOCK' : 'WAZUH');
      } catch (error) {
        console.error('Failed to fetch status:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

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

    newSocket.on('systemStatus', (data) => {
      setSystemStatus(data.status);
    });

    newSocket.on('stats', (data) => {
      setStats(data);
    });

    newSocket.on('attack', (attack) => {
      setAttacks(prev => [...prev, attack]);
      setLogs(prev => [attack, ...prev].slice(0, 200));
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

  // Filtered logs
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
