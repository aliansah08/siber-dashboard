import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HologramProps {
  isAttacked?: boolean;
  systemStatus?: string;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
}

interface ProjectedFace {
  points: ProjectedPoint[];
  avgZ: number;
  index: number;
}

// Icosahedron vertices (golden ratio)
const phi = (1 + Math.sqrt(5)) / 2;
const vertices: number[][] = [
  [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
  [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
  [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
];

// Icosahedron faces (indices of vertices)
const faces: number[][] = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
];

const Hologram: React.FC<HologramProps> = ({ isAttacked = false, systemStatus = 'ACTIVE' }) => {
  const [rotation, setRotation] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isGlitching, setIsGlitching] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

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

  // Project 3D point to 2D
  const project = useCallback((point: number[], rotX: number, rotY: number): ProjectedPoint => {
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

  // Handle click - trigger glitch and ripple
  const handleClick = () => {
    setIsGlitching(true);
    
    // Add ripple
    const newRipple: Ripple = {
      id: Date.now(),
      x: 150,
      y: 150
    };
    setRipples(prev => [...prev, newRipple]);
    
    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
    
    setTimeout(() => setIsGlitching(false), 300);
  };

  // Generate projected faces
  const projectedFaces: ProjectedFace[] = faces.map((face, index) => {
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

  // Determine ring color based on system status
  const getRingColor = () => {
    if (systemStatus === 'INACTIVE') return '#FF0040';
    return '#00FF00';
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-[300px] h-[300px] cursor-pointer hologram-container"
      onClick={handleClick}
    >
      {/* Outer glowing ring */}
      <motion.div
        className={`absolute inset-0 rounded-full hologram-ring ${
          systemStatus === 'INACTIVE' ? 'danger' : 'active pulse-glow'
        }`}
        animate={{
          scale: isShaking ? [1, 1.05, 0.95, 1] : 1,
          borderColor: getRingColor(),
          boxShadow: `0 0 30px ${getRingColor()}, inset 0 0 30px ${getRingColor()}40`
        }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Inner ring */}
      <motion.div
        className="absolute inset-4 rounded-full border border-cyan-500/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{
          borderStyle: 'dashed'
        }}
      />
      
      {/* SVG Wireframe Sphere */}
      <motion.svg
        width="300"
        height="300"
        viewBox="0 0 300 300"
        className={`absolute inset-0 wireframe-sphere ${isGlitching ? 'glitch-effect' : ''} ${isShaking ? 'shake-effect' : ''}`}
        animate={{
          filter: isGlitching 
            ? ['hue-rotate(0deg)', 'hue-rotate(90deg)', 'hue-rotate(180deg)', 'hue-rotate(0deg)']
            : 'hue-rotate(0deg)'
        }}
        transition={{ duration: 0.3 }}
      >
        <defs>
          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Gradient for faces */}
          <linearGradient id="faceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00FFFF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FF00FF" stopOpacity="0.1" />
          </linearGradient>
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
                fillOpacity={brightness * 0.3}
                stroke="none"
              />
              {/* Face edges */}
              <motion.path
                d={pathData}
                fill="none"
                stroke={isAttacked ? '#FF0040' : '#00FFFF'}
                strokeWidth={brightness * 1.5}
                strokeOpacity={brightness}
                filter="url(#glow)"
                animate={{
                  stroke: isAttacked ? '#FF0040' : '#00FFFF'
                }}
              />
            </g>
          );
        })}
        
        {/* Center point */}
        <motion.circle
          cx="150"
          cy="150"
          r="4"
          fill="#FF00FF"
          filter="url(#glow)"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Orbiting particles */}
        {[...Array(6)].map((_, i) => (
          <motion.circle
            key={`particle-${i}`}
            r="2"
            fill="#00FFFF"
            filter="url(#glow)"
            animate={{
              cx: [
                150 + Math.cos((i * 60 * Math.PI) / 180) * 120,
                150 + Math.cos(((i * 60 + 360) * Math.PI) / 180) * 120
              ],
              cy: [
                150 + Math.sin((i * 60 * Math.PI) / 180) * 120,
                150 + Math.sin(((i * 60 + 360) * Math.PI) / 180) * 120
              ]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.5
            }}
          />
        ))}
      </motion.svg>
      
      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            className="ripple-effect"
            style={{
              left: ripple.x - 50,
              top: ripple.y - 50,
              width: 100,
              height: 100
            }}
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
      
      {/* Status text */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        <motion.span
          className={`text-xs font-mono tracking-widest ${
            systemStatus === 'ACTIVE' ? 'neon-text-green' : 'neon-text-red'
          }`}
          animate={{
            opacity: [0.5, 1, 0.5]
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
      
      {/* Scan line overlay */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(0, 255, 255, 0.1) 50%, transparent 100%)'
        }}
        animate={{
          top: ['-100%', '100%']
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );
};

export default Hologram;
