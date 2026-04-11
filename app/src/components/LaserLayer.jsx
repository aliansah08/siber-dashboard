import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LaserLayer = ({ attacks, onHit, hologramPosition }) => {
  const canvasRef = useRef(null);
  const lasersRef = useRef([]);
  const animationRef = useRef(null);
  const [hitEffects, setHitEffects] = useState([]);

  // Convert percentage position to pixels
  const getPixelPosition = (percentPos) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    return {
      x: (percentPos.x / 100) * canvas.width,
      y: (percentPos.y / 100) * canvas.height
    };
  };

  // Get hologram center position
  const getHologramCenter = () => {
    if (!canvasRef.current || !hologramPosition) {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      return { x: canvas.width / 2, y: canvas.height / 2 };
    }
    return hologramPosition;
  };

  // Add new laser when attack arrives
  useEffect(() => {
    if (attacks.length === 0) return;
    
    const latestAttack = attacks[attacks.length - 1];
    if (!latestAttack.laserOrigin) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const startPos = getPixelPosition(latestAttack.laserOrigin);
    const endPos = getHologramCenter();
    
    const newLaser = {
      id: latestAttack.id,
      startX: startPos.x,
      startY: startPos.y,
      endX: endPos.x,
      endY: endPos.y,
      progress: 0,
      speed: 0.08 + Math.random() * 0.04, // Random speed
      color: latestAttack.level >= 10 ? '#ef4444' : latestAttack.level >= 5 ? '#f59e0b' : '#00d9ff',
      intensity: latestAttack.level / 15
    };
    
    lasersRef.current.push(newLaser);
  }, [attacks]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw lasers
      lasersRef.current = lasersRef.current.filter(laser => {
        laser.progress += laser.speed;
        
        if (laser.progress >= 1) {
          // Laser hit the target
          onHit();
          
          // Add hit effect
          const hitEffect = {
            id: laser.id,
            x: laser.endX,
            y: laser.endY,
            color: laser.color
          };
          setHitEffects(prev => [...prev, hitEffect]);
          
          // Remove hit effect after animation
          setTimeout(() => {
            setHitEffects(prev => prev.filter(h => h.id !== laser.id));
          }, 500);
          
          return false; // Remove this laser
        }
        
        // Calculate current position
        const currentX = laser.startX + (laser.endX - laser.startX) * laser.progress;
        const currentY = laser.startY + (laser.endY - laser.startY) * laser.progress;
        
        // Draw laser beam with glow
        const gradient = ctx.createLinearGradient(
          laser.startX, laser.startY, currentX, currentY
        );
        gradient.addColorStop(0, `${laser.color}00`);
        gradient.addColorStop(0.5, laser.color);
        gradient.addColorStop(1, laser.color);
        
        // Outer glow
        ctx.beginPath();
        ctx.moveTo(laser.startX, laser.startY);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 8 * laser.intensity;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 20;
        ctx.shadowColor = laser.color;
        ctx.stroke();
        
        // Inner beam
        ctx.beginPath();
        ctx.moveTo(laser.startX, laser.startY);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = laser.color;
        ctx.stroke();
        
        // Draw source glow
        ctx.beginPath();
        ctx.arc(laser.startX, laser.startY, 6, 0, Math.PI * 2);
        ctx.fillStyle = laser.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = laser.color;
        ctx.fill();
        
        // Draw head glow
        ctx.beginPath();
        ctx.arc(currentX, currentY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowBlur = 10;
        ctx.shadowColor = laser.color;
        ctx.fill();
        
        return true;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [onHit]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />
      
      {/* Hit effects */}
      <AnimatePresence>
        {hitEffects.map(effect => (
          <motion.div
            key={effect.id}
            className="absolute"
            style={{
              left: effect.x - 30,
              top: effect.y - 30,
              width: 60,
              height: 60
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div 
              className="w-full h-full rounded-full"
              style={{
                border: `2px solid ${effect.color}`,
                boxShadow: `0 0 20px ${effect.color}, inset 0 0 20px ${effect.color}`
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Impact sparks */}
      <AnimatePresence>
        {hitEffects.map(effect => (
          <React.Fragment key={`sparks-${effect.id}`}>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`spark-${effect.id}-${i}`}
                className="absolute w-1 h-1 rounded-full"
                style={{
                  left: effect.x,
                  top: effect.y,
                  backgroundColor: effect.color,
                  boxShadow: `0 0 6px ${effect.color}`
                }}
                initial={{ scale: 1, opacity: 1 }}
                animate={{
                  x: Math.cos((i * 45 * Math.PI) / 180) * 50,
                  y: Math.sin((i * 45 * Math.PI) / 180) * 50,
                  scale: 0,
                  opacity: 0
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            ))}
          </React.Fragment>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LaserLayer;
