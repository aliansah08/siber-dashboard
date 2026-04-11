import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';

const BottomLogTable = ({ logs, sortConfig, setSortConfig, getSeverity, fullScreen = false }) => {
  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Sorted logs
  const sortedLogs = React.useMemo(() => {
    const sorted = [...logs];
    sorted.sort((a, b) => {
      let aVal, bVal;
      if (sortConfig.key === 'timestamp') {
        aVal = new Date(a.timestamp);
        bVal = new Date(b.timestamp);
      } else if (sortConfig.key === 'level') {
        aVal = a.level;
        bVal = b.level;
      } else if (sortConfig.key === 'rule.id') {
        aVal = a.rule?.id || 0;
        bVal = b.rule?.id || 0;
      } else if (sortConfig.key === 'rule.description') {
        aVal = a.rule?.description || '';
        bVal = b.rule?.description || '';
      } else if (sortConfig.key === 'src_ip') {
        aVal = a.src_ip || '';
        bVal = b.src_ip || '';
      } else {
        aVal = a[sortConfig.key] || '';
        bVal = b[sortConfig.key] || '';
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [logs, sortConfig]);

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

  // Format date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  };

  // Get severity styles - Harmonious colors
  const getSeverityStyles = (level) => {
    if (level >= 10) {
      return {
        bg: 'var(--status-danger-soft)',
        border: 'var(--status-danger)',
        text: 'var(--status-danger)',
        glow: 'var(--status-danger-glow)'
      };
    }
    if (level >= 5) {
      return {
        bg: 'var(--status-warning-soft)',
        border: 'var(--status-warning)',
        text: 'var(--status-warning)',
        glow: 'var(--status-warning-glow)'
      };
    }
    return {
      bg: 'var(--status-success-soft)',
      border: 'var(--status-success)',
      text: 'var(--status-success)',
      glow: 'var(--status-success-glow)'
    };
  };

  return (
    <div className={`w-full h-full ${fullScreen ? '' : 'glass-footer rounded-t-lg'}`}>
      {/* Table Container */}
      <div className="h-full overflow-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-primary)' }}>
              <th 
                className="text-left py-3 px-4 text-[11px] font-bold font-mono uppercase tracking-wider cursor-pointer transition-colors whitespace-nowrap"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => handleSort('level')}
              >
                <div className="flex items-center gap-1">
                  Severity
                  {sortConfig.key === 'level' && (
                    sortConfig.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-left py-3 px-4 text-[11px] font-bold font-mono uppercase tracking-wider cursor-pointer transition-colors whitespace-nowrap"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => handleSort('timestamp')}
              >
                <div className="flex items-center gap-1">
                  Date/Time
                  {sortConfig.key === 'timestamp' && (
                    sortConfig.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-left py-3 px-4 text-[11px] font-bold font-mono uppercase tracking-wider cursor-pointer transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => handleSort('rule.id')}
              >
                <div className="flex items-center gap-1">
                  Rule ID
                  {sortConfig.key === 'rule.id' && (
                    sortConfig.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-left py-3 px-4 text-[11px] font-bold font-mono uppercase tracking-wider cursor-pointer transition-colors w-full"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => handleSort('rule.description')}
              >
                <div className="flex items-center gap-1">
                  Description
                  {sortConfig.key === 'rule.description' && (
                    sortConfig.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-left py-3 px-4 text-[11px] font-bold font-mono uppercase tracking-wider cursor-pointer transition-colors whitespace-nowrap"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => handleSort('src_ip')}
              >
                <div className="flex items-center gap-1">
                  Source IP
                  {sortConfig.key === 'src_ip' && (
                    sortConfig.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-left py-3 px-4 text-[11px] font-bold font-mono uppercase tracking-wider whitespace-nowrap"
                style={{ color: 'var(--text-secondary)' }}
              >
                Location
              </th>
              <th 
                className="text-left py-3 px-4 text-[11px] font-bold font-mono uppercase tracking-wider whitespace-nowrap"
                style={{ color: 'var(--text-secondary)' }}
              >
                Level
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sortedLogs.map((log, index) => {
                const severityStyles = getSeverityStyles(log.level);
                return (
                  <motion.tr
                    key={log.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.01 }}
                    className="transition-colors hover:bg-white/5"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span 
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold font-mono border"
                        style={{ 
                          background: severityStyles.bg, 
                          borderColor: severityStyles.border,
                          color: severityStyles.text,
                          boxShadow: `0 0 10px ${severityStyles.glow}` 
                        }}
                      >
                        {getSeverity(log.level)}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>{formatTime(log.timestamp)}</span>
                        <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>{formatDate(log.timestamp)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>{log.rule?.id || '-'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span 
                        className="text-[11px] font-mono block truncate max-w-md"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {log.rule?.description || 'Unknown Attack'}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>{log.src_ip}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>{log.geo?.country_name || 'Unknown'}</span>
                        <span className="text-[9px] font-mono truncate max-w-[120px]" style={{ color: 'var(--text-muted)' }}>{log.location}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>{log.level}</span>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>

        {sortedLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
            <span className="text-sm font-mono">No logs to display</span>
            <span className="text-xs font-mono mt-2" style={{ color: 'var(--text-muted)' }}>Try adjusting your filters</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomLogTable;
