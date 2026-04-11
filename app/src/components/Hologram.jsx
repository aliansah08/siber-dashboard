import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Icosahedron vertices (golden ratio)
const phi = (1 + Math.sqrt(5)) / 2;
const vertices = [
  [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
  [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
  [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
];

// Icosahedron faces (indices of vertices)
const faces = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
];

const Hologram = ({ isAttacked = false, systemStatus = 'ACTIVE', clickAnim = false, onClick }) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isGlitching, setIsGlitching] = useState(false);
  const [ripples, setRipples] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
  const [scanlinePos, setScanlinePos] = useState(0);
  const [showEnergyBurst, setShowEnergyBurst] = useState(false);
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  // 3D rotation animation
  useEffect(() => {
    let startTime = Date.now();
    
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      setRotation({
        x: elapsed * 15,
        y: elapsed * 25
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Handle attack effect
  useEffect(() => {
    if (isAttacked) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  }, [isAttacked]);

  // Handle click animation from parent
  useEffect(() => {
    if (clickAnim) {
      triggerClickAnimation();
    }
  }, [clickAnim]);

  // Project 3D point to 2D
  const project = useCallback((point, rotX, rotY) => {
    const radX = (rotX * Math.PI) / 180;
    const radY = (rotY * Math.PI) / 180;
    
    // Rotate around Y axis
    let x = point[0] * Math.cos(radY) - point[2] * Math.sin(radY);
    let z = point[0] * Math.sin(radY) + point[2] * Math.cos(radY);
    let y = point[1];
    
    // Rotate around X axis
    let newY = y * Math.cos(radX) - z * Math.sin(radX);
    let newZ = y * Math.sin(radX) + z * Math.cos(radX);
    
    // Perspective projection
    const scale = 200 / (200 + newZ * 30);
    return {
      x: x * scale * 80 + 150,
      y: newY * scale * 80 + 150,
      z: newZ
    };
  }, []);

  // Enhanced click animation
  const triggerClickAnimation = () => {
    setIsGlitching(true);
    setShowEnergyBurst(true);
    
    // Add multiple ripples with harmonious colors
    const centerRipple = {
      id: Date.now(),
      x: 150,
      y: 150,
      color: '#00d9ff'
    };
    
    const secondaryRipple = {
      id: Date.now() + 1,
      x: 150,
      y: 150,
      color: '#7c3aed'
    };
    
    setRipples(prev => [...prev, centerRipple, secondaryRipple]);
    
    // Remove ripples after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== centerRipple.id && r.id !== secondaryRipple.id));
    }, 800);
    
    // Reset glitch
    setTimeout(() => setIsGlitching(false), 400);
    
    // Reset energy burst
    setTimeout(() => setShowEnergyBurst(false), 600);
  };

  // Handle click
  const handleClick = () => {
    triggerClickAnimation();
    if (onClick) onClick();
  };

  // Generate projected faces
  const projectedFaces = faces.map((face, index) => {
    const projectedPoints = face.map(vIndex => 
      project(vertices[vIndex], rotation.x, rotation.y)
    );
    
    // Calculate average Z for depth sorting
    const avgZ = projectedPoints.reduce((sum, p) => sum + p.z, 0) / 3;
    
    return {
      points: projectedPoints,
      avgZ,
      index
    };
  });

  // Sort faces by depth (back to front)
  projectedFaces.sort((a, b) => a.avgZ - b.avgZ);

  // Determine ring color based on system status - Harmonious colors
  const getRingColor = () => {
    if (systemStatus === 'INACTIVE') return '#ef4444';
    return '#10b981';
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-[300px] h-[300px] cursor-pointer select-none"
      onClick={handleClick}
      style={{ perspective: '1000px' }}
    >
      {/* Outer energy field / glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          border: `2px solid ${getRingColor()}`,
          boxShadow: `0 0 30px ${getRingColor()}, inset 0 0 30px ${getRingColor()}30`
        }}
        animate={{
          scale: isShaking ? [1, 1.05, 0.95, 1] : [1, 1.02, 1],
          rotate: 360
        }}
        transition={{ 
          scale: { duration: 0.5 },
          rotate: { duration: 20, repeat: Infinity, ease: "linear" }
        }}
      />

      {/* Pulsing outer ring */}
      <motion.div
        className="absolute -inset-4 rounded-full"
        style={{ border: '1px solid rgba(124, 58, 237, 0.2)' }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Inner rotating ring */}
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{ 
          border: '1px dashed rgba(0, 217, 255, 0.3)'
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />

      {/* Energy burst effect on click */}
      <AnimatePresence>
        {showEnergyBurst && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`burst-${i}`}
                className="absolute w-1 h-20 rounded-full"
                style={{
                  background: `linear-gradient(to bottom, transparent, ${i % 2 === 0 ? '#00d9ff' : '#7c3aed'}, transparent)`,
                  transformOrigin: 'center',
                  rotate: `${i * 30}deg`
                }}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ 
                  scale: [0, 2, 0],
                  opacity: [1, 0.5, 0]
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* SVG Wireframe Sphere */}
      <motion.svg
        width="300"
        height="300"
        viewBox="0 0 300 300"
        className="absolute inset-0"
        style={{ 
          transformStyle: 'preserve-3d',
          filter: isGlitching ? 'hue-rotate(180deg) brightness(1.5)' : 'none'
        }}
        animate={isShaking ? {
          x: [0, -5, 5, -5, 5, 0],
          y: [0, 5, -5, 5, -5, 0]
        } : {}}
        transition={{ duration: 0.5 }}
      >
        <defs>
          {/* Stronger glow filter */}
          <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Gradient for faces - Harmonious purple to cyan */}
          <linearGradient id="faceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#00d9ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00d9ff" stopOpacity="0.1" />
          </linearGradient>

          {/* Radial gradient for center glow */}
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00d9ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* Render faces */}
        {projectedFaces.map((face, i) => {
          const pathData = `M ${face.points[0].x},${face.points[0].y} L ${face.points[1].x},${face.points[1].y} L ${face.points[2].x},${face.points[2].y} Z`;
          const brightness = Math.max(0.2, (face.avgZ + 1) / 2);
          
          return (
            <g key={i}>
              {/* Face fill */}
              <motion.path
                d={pathData}
                fill="url(#faceGradient)"
                fillOpacity={brightness * 0.4}
                stroke="none"
              />
              {/* Face edges */}
              <motion.path
                d={pathData}
                fill="none"
                stroke={isAttacked ? '#ef4444' : isGlitching ? '#d946ef' : '#00d9ff'}
                strokeWidth={brightness * 2}
                strokeOpacity={brightness}
                filter="url(#strongGlow)"
              />
            </g>
          );
        })}
        
        {/* Center core */}
        <motion.circle
          cx="150"
          cy="150"
          r="8"
          fill="url(#centerGlow)"
          filter="url(#strongGlow)"
        />

        {/* Bright center point */}
        <motion.circle
          cx="150"
          cy="150"
          r="3"
          fill="#FFFFFF"
          filter="url(#strongGlow)"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Orbiting particles */}
        {[...Array(8)].map((_, i) => (
          <motion.circle
            key={`particle-${i}`}
            r="3"
            fill={i % 2 === 0 ? '#00d9ff' : '#7c3aed'}
            filter="url(#strongGlow)"
            animate={{
              cx: [
                150 + Math.cos((i * 45 * Math.PI) / 180) * 100,
                150 + Math.cos(((i * 45 + 360) * Math.PI) / 180) * 100
              ],
              cy: [
                150 + Math.sin((i * 45 * Math.PI) / 180) * 100,
                150 + Math.sin(((i * 45 + 360) * Math.PI) / 180) * 100
              ]
            }}
            transition={{
              duration: 6 + i * 0.5,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.2
            }}
          />
        ))}
      </motion.svg>
      
      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x - 50,
              top: ripple.y - 50,
              width: 100,
              height: 100,
              border: `2px solid ${ripple.color}`,
              boxShadow: `0 0 20px ${ripple.color}, inset 0 0 20px ${ripple.color}`
            }}
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>

      {/* Data ring decoration */}
      <motion.div
        className="absolute -inset-8 rounded-full"
        style={{
          border: '1px solid rgba(124, 58, 237, 0.1)',
          background: 'conic-gradient(from 0deg, transparent, rgba(0, 217, 255, 0.05), transparent, rgba(124, 58, 237, 0.05), transparent)'
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Status text */}
      <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        <motion.span
          className="text-xs font-mono tracking-widest px-3 py-1 rounded-full"
          style={{
            color: systemStatus === 'ACTIVE' ? '#10b981' : '#ef4444',
            textShadow: `0 0 10px ${systemStatus === 'ACTIVE' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
            border: `1px solid ${systemStatus === 'ACTIVE' ? '#10b981' : '#ef4444'}`,
            backgroundColor: systemStatus === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'
          }}
          animate={{
            opacity: [0.6, 1, 0.6]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          SYSTEM {systemStatus}
        </motion.span>
      </div>

      {/* Corner markers - Purple/Cyan */}
      <div className="absolute -top-2 -left-2 w-4 h-4" style={{ borderLeft: '2px solid rgba(124, 58, 237, 0.5)', borderTop: '2px solid rgba(124, 58, 237, 0.5)' }} />
      <div className="absolute -top-2 -right-2 w-4 h-4" style={{ borderRight: '2px solid rgba(124, 58, 237, 0.5)', borderTop: '2px solid rgba(124, 58, 237, 0.5)' }} />
      <div className="absolute -bottom-2 -left-2 w-4 h-4" style={{ borderLeft: '2px solid rgba(0, 217, 255, 0.5)', borderBottom: '2px solid rgba(0, 217, 255, 0.5)' }} />
      <div className="absolute -bottom-2 -right-2 w-4 h-4" style={{ borderRight: '2px solid rgba(0, 217, 255, 0.5)', borderBottom: '2px solid rgba(0, 217, 255, 0.5)' }} />
    </div>
  );
};

export default Hologram;
