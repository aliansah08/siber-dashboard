import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Globe, Search, Filter, AlertCircle } from 'lucide-react';

const RightPanel = ({ 
  logs, 
  filteredLogs, 
  severityFilter, 
  setSeverityFilter, 
  searchQuery, 
  setSearchQuery,
  severityFilters,
  getSeverity
}) => {
  const logStreamRef = useRef(null);

  // Auto-scroll log stream to top when new logs arrive
  useEffect(() => {
    if (logStreamRef.current) {
      logStreamRef.current.scrollTop = 0;
    }
  }, [logs]);

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  // Get color for severity
  const getSeverityColor = (level) => {
    if (level >= 10) return '#FF0040';
    if (level >= 5) return '#FFA500';
    return '#00FF00';
  };

  // Get background color for severity pill
  const getSeverityBgColor = (level) => {
    if (level >= 10) return 'rgba(255, 0, 64, 0.15)';
    if (level >= 5) return 'rgba(255, 165, 0, 0.15)';
    return 'rgba(0, 255, 0, 0.15)';
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      {/* Live Log Stream with Integrated Filters */}
      <motion.div 
        className="glass-panel rounded-lg flex-1 flex flex-col overflow-hidden min-h-0"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Header with Filters */}
        <div className="p-3 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div 
                className="p-1.5 rounded"
                style={{ background: 'var(--status-success-soft)' }}
              >
                <Terminal className="w-4 h-4" style={{ color: 'var(--status-success)' }} />
              </div>
              <h3 
                className="text-xs font-bold font-mono tracking-wider"
                style={{ color: 'var(--status-success)', textShadow: '0 0 10px var(--status-success-glow)' }}
              >
                LIVE FEED
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--status-success)' }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                {filteredLogs.length} ENTRIES
              </span>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            <div className="flex gap-1.5 flex-wrap">
              {severityFilters.map(filter => {
                const getFilterStyles = () => {
                  if (severityFilter !== filter) {
                    return {
                      background: 'transparent',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-muted)'
                    };
                  }
                  switch(filter) {
                    case 'HIGH':
                      return {
                        background: 'var(--status-danger-soft)',
                        borderColor: 'var(--status-danger)',
                        color: 'var(--status-danger)',
                        boxShadow: '0 0 10px var(--status-danger-glow)'
                      };
                    case 'MEDIUM':
                      return {
                        background: 'var(--status-warning-soft)',
                        borderColor: 'var(--status-warning)',
                        color: 'var(--status-warning)',
                        boxShadow: '0 0 10px var(--status-warning-glow)'
                      };
                    case 'LOW':
                      return {
                        background: 'var(--status-success-soft)',
                        borderColor: 'var(--status-success)',
                        color: 'var(--status-success)',
                        boxShadow: '0 0 10px var(--status-success-glow)'
                      };
                    default:
                      return {
                        background: 'var(--accent-cyan-soft)',
                        borderColor: 'var(--accent-cyan)',
                        color: 'var(--accent-cyan)',
                        boxShadow: '0 0 10px var(--accent-cyan-glow)'
                      };
                  }
                };
                const styles = getFilterStyles();
                return (
                  <motion.button
                    key={filter}
                    onClick={() => setSeverityFilter(filter)}
                    className="px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all border"
                    style={styles}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {filter}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filter by IP or attack..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md pl-9 pr-3 py-2 text-[11px] font-mono transition-all focus:outline-none"
              style={{ 
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
        </div>

        {/* Log Stream */}
        <div 
          ref={logStreamRef}
          className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin min-h-0"
        >
          <AnimatePresence initial={false}>
            {filteredLogs.slice(0, 30).map((log, index) => (
              <motion.div
                key={log.id || index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: index * 0.01 }}
                className="p-2.5 rounded-md transition-all group"
                style={{ 
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {/* Timestamp and Severity */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    {formatTime(log.timestamp)}
                  </span>
                  <span 
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono"
                    style={{ 
                      color: getSeverityColor(log.level),
                      backgroundColor: getSeverityBgColor(log.level),
                      border: `1px solid ${getSeverityColor(log.level)}40`
                    }}
                  >
                    {getSeverity(log.level)}
                  </span>
                </div>

                {/* Description */}
                <div 
                  className="text-[11px] font-mono truncate mb-1.5 transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {log.rule?.description || 'Unknown Attack'}
                </div>

                {/* IP and Location */}
                <div className="flex items-center gap-2 text-[10px]">
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{log.src_ip}</span>
                  </div>
                  <span style={{ color: 'var(--border-default)' }}>|</span>
                  <span 
                    className="font-mono truncate max-w-[80px]"
                    style={{ color: 'var(--accent-magenta)' }}
                  >
                    {log.geo?.country_name || 'Unknown'}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32" style={{ color: 'var(--text-muted)' }}>
              <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-[11px] font-mono">No logs match filters</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Stats Summary */}
      <motion.div 
        className="glass-panel p-3 rounded-lg shrink-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="grid grid-cols-3 gap-2 text-center">
          <div 
            className="p-2 rounded"
            style={{ background: 'var(--status-danger-soft)', border: '1px solid var(--status-danger-soft)' }}
          >
            <div className="text-lg font-bold font-mono" style={{ color: 'var(--status-danger)' }}>
              {logs.filter(l => getSeverity(l.level) === 'HIGH').length}
            </div>
            <div className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>High</div>
          </div>
          <div 
            className="p-2 rounded"
            style={{ background: 'var(--status-warning-soft)', border: '1px solid var(--status-warning-soft)' }}
          >
            <div className="text-lg font-bold font-mono" style={{ color: 'var(--status-warning)' }}>
              {logs.filter(l => getSeverity(l.level) === 'MEDIUM').length}
            </div>
            <div className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>Med</div>
          </div>
          <div 
            className="p-2 rounded"
            style={{ background: 'var(--status-success-soft)', border: '1px solid var(--status-success-soft)' }}
          >
            <div className="text-lg font-bold font-mono" style={{ color: 'var(--status-success)' }}>
              {logs.filter(l => getSeverity(l.level) === 'LOW').length}
            </div>
            <div className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>Low</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RightPanel;
