import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Float, Text, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

// News article floating in 3D space
const NewsArticle = ({ position, rotation, text, isTrue }: { 
  position: [number, number, number], 
  rotation: [number, number, number], 
  text: string,
  isTrue: boolean
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.001;
      meshRef.current.rotation.y += 0.001;
    }
  });

  const color = isTrue ? new THREE.Color("#2ecc71") : new THREE.Color("#e74c3c");
  
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh position={position} rotation={rotation} ref={meshRef}>
        <boxGeometry args={[3, 1.5, 0.1]} />
        <meshStandardMaterial 
          color="#0a3d62" 
          emissive="#3498db"
          emissiveIntensity={0.2}
          transparent
          opacity={0.85}
          metalness={0.5}
          roughness={0.2}
        />
        <Text
          position={[0, 0, 0.06]}
          fontSize={0.15}
          maxWidth={2.5}
          lineHeight={1.2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {text}
        </Text>
        {/* Verification badge */}
        <mesh position={[1.3, -0.55, 0.06]}>
          <circleGeometry args={[0.15, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
          <Text
            position={[0, 0, 0.06]}
            fontSize={0.12}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {isTrue ? "✓" : "✗"}
          </Text>
        </mesh>
      </mesh>
    </Float>
  );
};

// Floating sphere representing the "truth detection system"
const TruthSphere = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.2;
    }
  });
  
  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[2, 32, 32]} />
      <meshStandardMaterial 
        color="#0a3d62"
        wireframe
        emissive="#3498db"
        emissiveIntensity={0.3}
        transparent
        opacity={0.7}
      />
      {/* Inner glowing sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshStandardMaterial 
          color="#3498db"
          emissive="#3498db"
          emissiveIntensity={0.3}
          transparent
          opacity={0.3}
        />
      </mesh>
    </mesh>
  );
};

// Particles for background atmosphere
const Particles = ({ count = 200 }: { count?: number }) => {
  const { viewport } = useThree();
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      // Calculate positions in a sphere around the center
      const radius = Math.random() * 15 + 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      temp.push({
        position: [x, y, z] as [number, number, number],
        size: Math.random() * 0.05 + 0.02
      });
    }
    return temp;
  }, [count]);
  
  return (
    <group>
      {particles.map((particle, index) => (
        <mesh key={index} position={particle.position}>
          <sphereGeometry args={[particle.size, 8, 8]} />
          <meshBasicMaterial color="#3498db" transparent opacity={Math.random() * 0.5 + 0.2} />
        </mesh>
      ))}
    </group>
  );
};

// Create an array of news headlines - some true, some false
const newsData = [
  {
    text: "Scientists discover new renewable energy source",
    isTrue: true,
    position: [8, 3, -3] as [number, number, number],
    rotation: [0.2, 0.4, 0] as [number, number, number]
  },
  {
    text: "Aliens confirmed to have visited Earth last year",
    isTrue: false,
    position: [6, 2, -5] as [number, number, number],
    rotation: [-0.1, -0.3, 0.1] as [number, number, number]
  },
  {
    text: "Global temperatures rise by 2 degrees over the past decade",
    isTrue: true,
    position: [7, -2, -4] as [number, number, number],
    rotation: [0.3, -0.2, 0] as [number, number, number]
  },
  {
    text: "Study shows chocolate prevents all diseases",
    isTrue: false,
    position: [9, -3, -2] as [number, number, number],
    rotation: [-0.2, 0.1, 0.2] as [number, number, number]
  },
];

// Main Scene Component
const Scene = () => {
  return (
    <Canvas style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
      <PerspectiveCamera makeDefault position={[0, 0, 10]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3498db" />
      
      {/* Positioned more to the right side */}
      <group position={[4, 0, 0]}>
        <TruthSphere />
        {newsData.map((news, index) => (
          <NewsArticle 
            key={index} 
            position={news.position} 
            rotation={news.rotation} 
            text={news.text}
            isTrue={news.isTrue}
          />
        ))}
        <Particles count={300} />
      </group>
      
      <OrbitControls 
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </Canvas>
  );
};

export default Scene;
