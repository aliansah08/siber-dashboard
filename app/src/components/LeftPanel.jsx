import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Activity, Ban, TrendingUp, Zap } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const LeftPanel = ({ stats, trendData }) => {
  // Local state for chart data with auto-refresh simulation
  const [chartData, setChartData] = useState(trendData);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Auto-refresh chart data every 10 seconds
  useEffect(() => {
    setChartData(trendData);
    setLastUpdate(new Date());
  }, [trendData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => {
        if (!prev || prev.length === 0) return prev;
        const newData = [...prev];
        const lastEntry = newData[newData.length - 1];
        if (lastEntry) {
          const variation = Math.floor(Math.random() * 10) - 5;
          newData[newData.length - 1] = {
            ...lastEntry,
            attacks: Math.max(0, (lastEntry.attacks || 0) + variation)
          };
        }
        return newData;
      });
      setLastUpdate(new Date());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      {/* KPI Cards - Compact Grid with Harmonious Colors */}
      <div className="grid grid-cols-2 gap-3 shrink-0">
        {/* Active Threats - Red/Danger */}
        <motion.div 
          className="glass-panel p-3 rounded-lg"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="p-1.5 rounded"
              style={{ background: 'var(--status-danger-soft)' }}
            >
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--status-danger)' }} />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Active</span>
          </div>
          <motion.p 
            className="text-2xl font-bold font-mono"
            style={{ color: 'var(--status-danger)', textShadow: '0 0 15px var(--status-danger-glow)' }}
            key={stats.activeThreats}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {stats.activeThreats}
          </motion.p>
        </motion.div>

        {/* Attacks Today - Orange/Warning */}
        <motion.div 
          className="glass-panel p-3 rounded-lg"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="p-1.5 rounded"
              style={{ background: 'var(--status-warning-soft)' }}
            >
              <Activity className="w-3.5 h-3.5" style={{ color: 'var(--status-warning)' }} />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Today</span>
          </div>
          <motion.p 
            className="text-2xl font-bold font-mono"
            style={{ color: 'var(--status-warning)', textShadow: '0 0 15px var(--status-warning-glow)' }}
            key={stats.totalAttacksToday}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {stats.totalAttacksToday.toLocaleString()}
          </motion.p>
        </motion.div>

        {/* Blocked - Green/Success */}
        <motion.div 
          className="glass-panel p-3 rounded-lg"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="p-1.5 rounded"
              style={{ background: 'var(--status-success-soft)' }}
            >
              <Ban className="w-3.5 h-3.5" style={{ color: 'var(--status-success)' }} />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Blocked</span>
          </div>
          <motion.p 
            className="text-2xl font-bold font-mono"
            style={{ color: 'var(--status-success)', textShadow: '0 0 15px var(--status-success-glow)' }}
            key={stats.blockedRequests}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {stats.blockedRequests.toLocaleString()}
          </motion.p>
        </motion.div>

        {/* Threat Level - Violet/Accent */}
        <motion.div 
          className="glass-panel p-3 rounded-lg"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="p-1.5 rounded"
              style={{ background: 'var(--accent-violet-soft)' }}
            >
              <Zap className="w-3.5 h-3.5" style={{ color: 'var(--accent-violet)' }} />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Level</span>
          </div>
          <motion.p 
            className="text-lg font-bold font-mono"
            style={{ 
              color: stats.activeThreats > 30 ? 'var(--status-danger)' : stats.activeThreats > 15 ? 'var(--status-warning)' : 'var(--status-success)',
              textShadow: stats.activeThreats > 30 ? '0 0 15px var(--status-danger-glow)' : stats.activeThreats > 15 ? '0 0 15px var(--status-warning-glow)' : '0 0 15px var(--status-success-glow)'
            }}
          >
            {stats.activeThreats > 30 ? 'CRITICAL' : stats.activeThreats > 15 ? 'HIGH' : 'MODERATE'}
          </motion.p>
        </motion.div>
      </div>

      {/* Threat Analysis Chart */}
      <motion.div 
        className="glass-panel p-4 rounded-lg flex-1 min-h-0 flex flex-col"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div 
              className="p-1.5 rounded"
              style={{ background: 'var(--accent-cyan-soft)' }}
            >
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
            </div>
            <h3 
              className="text-xs font-bold font-mono tracking-wider"
              style={{ color: 'var(--accent-cyan)', textShadow: '0 0 10px var(--accent-cyan-glow)' }}
            >
              THREAT ANALYSIS
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--status-success)' }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>LIVE</span>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.5}/>
                  <stop offset="50%" stopColor="#00d9ff" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#00d9ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="var(--border-subtle)" 
                vertical={false}
              />
              <XAxis 
                dataKey="time" 
                stroke="var(--border-default)"
                tick={{ fill: 'var(--text-secondary)', fontSize: 9, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tickFormatter={(value) => {
                  if (!value) return '';
                  const parts = value.split(':');
                  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : value;
                }}
              />
              <YAxis 
                stroke="var(--border-default)"
                tick={{ fill: 'var(--text-secondary)', fontSize: 9, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  backdropFilter: 'blur(10px)',
                  fontFamily: 'monospace',
                  fontSize: '11px'
                }}
                labelStyle={{ color: 'var(--text-primary)', marginBottom: '4px' }}
                itemStyle={{ color: 'var(--accent-violet)' }}
                formatter={(value) => [`${value} attacks`, 'Volume']}
              />
              <Area 
                type="monotone" 
                dataKey="attacks" 
                stroke="var(--accent-cyan)" 
                strokeWidth={2}
                fill="url(#threatGradient)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Last Update */}
        <div className="mt-2 text-right shrink-0">
          <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
            UPDATED: {lastUpdate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </motion.div>

      {/* Additional Stats */}
      <motion.div 
        className="glass-panel p-3 rounded-lg shrink-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent-cyan)' }}>
              {stats.totalAttacksToday > 0 ? ((stats.blockedRequests / stats.totalAttacksToday) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>Blocked</div>
          </div>
          <div>
            <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent-violet)' }}>
              {Math.floor(stats.totalAttacksToday / 24)}
            </div>
            <div className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>/Hour</div>
          </div>
          <div>
            <div 
              className="text-lg font-bold font-mono"
              style={{ color: stats.activeThreats > 0 ? 'var(--status-warning)' : 'var(--status-success)' }}
            >
              {stats.activeThreats > 0 ? 'YES' : 'NO'}
            </div>
            <div className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>Active</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LeftPanel;
