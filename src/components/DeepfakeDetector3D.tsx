import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Float } from "@react-three/drei";
import * as THREE from "three";

const FaceModel = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.2 + clock.getElapsedTime() * 0.1;
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Face Mesh Grid */}
      <mesh>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial 
          color="#3498db" 
          wireframe={true} 
          emissive="#3498db"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* "REAL" Label on front of sphere */}
      <Text
        position={[0, 0, 1.3]}
        color="#2ecc71"
        fontSize={5}
        font="/fonts/inter.woff"
        anchorX="center"
        anchorY="middle"
        renderOrder={1}
        strokeWidth={0.1}
        strokeColor="#2ecc71"
      >
        **REAL**
      </Text>
      
      {/* "FAKE" Label on back of sphere (opposite side) */}
      <Text
        position={[0, 0, -1.3]}
        color="#e74c3c"
        fontSize={5}
        font="/fonts/inter.woff"
        anchorX="center"
        anchorY="middle"
        renderOrder={1}
        rotation={[0, Math.PI, 0]}
        strokeWidth={0.1}
        strokeColor="#e74c3c"
      >
        **FAKE**
      </Text>
      
      {/* Face Detection Points */}
      {Array.from({ length: 50 }).map((_, i) => {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 1.2 * (0.9 + Math.random() * 0.1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial 
              color="#4fc3f7" 
              emissive="#4fc3f7"
              emissiveIntensity={0.5}
            />
          </mesh>
        );
      })}
      
      {/* AI Analysis Beams */}
      {Array.from({ length: 5 }).map((_, i) => {
        const angle = (i / 5) * Math.PI * 2;
        const x = 2.5 * Math.cos(angle);
        const y = 0.2 * (i - 2);
        const z = 2.5 * Math.sin(angle);
        
        return (
          <Float key={i} speed={1} rotationIntensity={1} floatIntensity={1}>
            <mesh position={[x, y, z]}>
              <boxGeometry args={[0.1, 0.1, 0.1]} />
              <meshStandardMaterial 
                color={i % 2 === 0 ? "#f39c12" : "#e74c3c"} 
                emissive={i % 2 === 0 ? "#f39c12" : "#e74c3c"}
                emissiveIntensity={0.7}
              />
            </mesh>
            <mesh>
              <cylinderGeometry args={[0.02, 0.02, 2.5, 8]} />
              <meshStandardMaterial 
                color={i % 2 === 0 ? "#f39c12" : "#e74c3c"} 
                transparent={true}
                opacity={0.3}
                emissive={i % 2 === 0 ? "#f39c12" : "#e74c3c"}
                emissiveIntensity={0.3}
              />
            </mesh>
          </Float>
        );
      })}
      
      {/* Result indicators */}
      <Float speed={0.5} rotationIntensity={0.2} floatIntensity={0.2}>
        <Text
          position={[0, 1.8, 0]}
          color="#ffffff"
          fontSize={0.2}
          font="/fonts/inter.woff"
          anchorX="center"
          anchorY="middle"
        >
          DEEPFAKE ANALYSIS
        </Text>
      </Float>
    </group>
  );
};

const Particles = () => {
  return (
    <group>
      {Array.from({ length: 100 }).map((_, i) => {
        const radius = 5 + Math.random() * 5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial 
              color="#3498db" 
              transparent
              opacity={0.7}
            />
          </mesh>
        );
      })}
    </group>
  );
};

const DeepfakeDetector3D = () => {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden">
      <Canvas>
        <color attach="background" args={['#0a192f']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3498db" />
        
        <FaceModel />
        <Particles />
        
        <OrbitControls 
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
};

export default DeepfakeDetector3D;
