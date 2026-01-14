import { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Float } from '@react-three/drei';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  intensity?: 'low' | 'medium' | 'high';
  enableTilt?: boolean;
  enableFloat?: boolean;
}

function GlowingCard({ 
  glowColor = '#fbbf24', 
  intensity = 'medium',
  isHovered 
}: { 
  glowColor?: string; 
  intensity?: 'low' | 'medium' | 'high';
  isHovered: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  
  const intensityMap = { low: 0.5, medium: 1, high: 1.5 };
  const baseIntensity = intensityMap[intensity];

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle breathing animation
      meshRef.current.scale.x = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.01;
      meshRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.01;
      
      // Rotate slightly on hover
      if (isHovered) {
        meshRef.current.rotation.x = THREE.MathUtils.lerp(
          meshRef.current.rotation.x,
          Math.sin(state.clock.elapsedTime) * 0.02,
          0.1
        );
        meshRef.current.rotation.y = THREE.MathUtils.lerp(
          meshRef.current.rotation.y,
          Math.cos(state.clock.elapsedTime) * 0.02,
          0.1
        );
      } else {
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0, 0.1);
        meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, 0, 0.1);
      }
    }
    
    if (glowRef.current) {
      // Pulse the glow
      glowRef.current.intensity = baseIntensity + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  return (
    <Float
      speed={1.5}
      rotationIntensity={0.1}
      floatIntensity={0.2}
      enabled={isHovered}
    >
      <mesh ref={meshRef}>
        <RoundedBox args={[3.2, 2, 0.1]} radius={0.1} smoothness={4}>
          <meshStandardMaterial
            color="#1a1a2e"
            metalness={0.8}
            roughness={0.2}
            transparent
            opacity={0.9}
          />
        </RoundedBox>
        
        {/* Edge glow effect */}
        <mesh position={[0, 0, -0.05]}>
          <RoundedBox args={[3.3, 2.1, 0.02]} radius={0.1} smoothness={4}>
            <meshBasicMaterial color={glowColor} transparent opacity={isHovered ? 0.6 : 0.3} />
          </RoundedBox>
        </mesh>
        
        {/* Point light for glow */}
        <pointLight
          ref={glowRef}
          position={[0, 0, 1]}
          color={glowColor}
          intensity={baseIntensity}
          distance={5}
        />
      </mesh>
    </Float>
  );
}

function Scene({ 
  glowColor, 
  intensity, 
  isHovered 
}: { 
  glowColor?: string; 
  intensity?: 'low' | 'medium' | 'high';
  isHovered: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <GlowingCard glowColor={glowColor} intensity={intensity} isHovered={isHovered} />
    </>
  );
}

export function Card3D({ 
  children, 
  className,
  glowColor = '#fbbf24',
  intensity = 'medium',
  enableTilt = true,
  enableFloat = true,
}: Card3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    setTilt({ x: y * 10, y: -x * 10 });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative group transition-all duration-300",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: enableTilt ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` : undefined,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 3D Canvas Background */}
      <div className="absolute inset-0 -z-10 opacity-60 pointer-events-none">
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
            <Scene glowColor={glowColor} intensity={intensity} isHovered={isHovered} />
          </Canvas>
        </Suspense>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Hover glow overlay */}
      <div 
        className={cn(
          "absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-300",
          isHovered ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: `radial-gradient(circle at ${50 + tilt.y * 5}% ${50 + tilt.x * 5}%, ${glowColor}20 0%, transparent 60%)`,
        }}
      />
    </div>
  );
}

// Simpler 3D tilt effect without Three.js for performance
export function Card3DSimple({ 
  children, 
  className,
  glowColor = 'hsl(var(--primary))',
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    setTilt({ x: y * 15, y: -x * 15 });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative transition-all duration-200 ease-out",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.02 : 1})`,
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
      
      {/* Dynamic highlight */}
      <div 
        className="absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-200"
        style={{
          background: isHovered 
            ? `radial-gradient(circle at ${50 + tilt.y * 3}% ${50 - tilt.x * 3}%, ${glowColor} / 0.15 0%, transparent 50%)`
            : 'transparent',
          opacity: isHovered ? 1 : 0,
        }}
      />
      
      {/* Edge highlight */}
      <div 
        className="absolute inset-0 rounded-lg pointer-events-none transition-all duration-200"
        style={{
          boxShadow: isHovered 
            ? `0 20px 40px -20px ${glowColor}, 0 0 20px -5px ${glowColor}`
            : 'none',
        }}
      />
    </div>
  );
}