import React, { useRef, useEffect } from 'react';

interface FaceMeshCanvasProps {
  landmarks: any[];
  width: number;
  height: number;
}

export const FaceMeshCanvas: React.FC<FaceMeshCanvasProps> = ({ landmarks, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !landmarks) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#3BFF9C';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#3BFF9C';

    // Draw connections
    const drawConnectors = (indices: number[][]) => {
      indices.forEach(([start, end]) => {
        const p1 = landmarks[start];
        const p2 = landmarks[end];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x * width, p1.y * height);
          ctx.lineTo(p2.x * width, p2.y * height);
          ctx.stroke();
        }
      });
    };

    // Simplified mesh connections
    const connections = [
      [10, 338], [338, 297], [297, 332], [332, 284], // Forehead
      [152, 377], [377, 400], [400, 378], [378, 379], // Jaw
      [33, 133], [133, 153], [153, 144], [144, 163], [163, 7], // Eyes
      [362, 263], [263, 466], [466, 388], [388, 387], [387, 386], // Eyes
      [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], // Mouth
    ];

    drawConnectors(connections);

    // Draw dots for key points
    landmarks.forEach((p, i) => {
      if (i % 10 === 0) {
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [landmarks, width, height]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
    />
  );
};
