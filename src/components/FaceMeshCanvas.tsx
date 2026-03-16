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
    
    // 1. Draw Vertical Midline (Requested)
    const topPoint = landmarks[10];
    const bottomPoint = landmarks[152];
    if (topPoint && bottomPoint) {
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(59, 255, 156, 0.3)';
      ctx.lineWidth = 1;
      ctx.moveTo(topPoint.x * width, 0);
      ctx.lineTo(topPoint.x * width, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'; // Visible but subtle white lines
    ctx.lineWidth = 1; // 1px thickness
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; // Pure white points with higher opacity

    // 2. Draw ALL landmarks as tiny dots for "Deep AI" feel
    landmarks.forEach((p, idx) => {
      if (p) {
        ctx.beginPath();
        // Slightly larger dots (1.5px diameter)
        ctx.arc(p.x * width, p.y * height, 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 3. Draw connections (Restoring more dense connections)
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

    const connections = [
      // Face Oval
      [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], [389, 356], [356, 454],
      [454, 323], [323, 361], [361, 288], [288, 397], [397, 365], [365, 379], [379, 378], [378, 400],
      [400, 377], [377, 152], [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
      [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162], [162, 21], [21, 54], [54, 103],
      [103, 67], [67, 109], [109, 10],
      
      // Eyes
      [33, 133], [133, 153], [153, 144], [144, 163], [163, 7], [7, 33],
      [362, 263], [263, 466], [466, 388], [388, 387], [387, 386], [386, 362],
      
      // Brows
      [70, 63], [63, 105], [105, 66], [66, 107],
      [300, 293], [293, 334], [334, 296], [296, 336],
      
      // Nose
      [168, 6], [6, 197], [197, 195], [195, 5], [5, 4], [4, 1],
      [98, 97], [97, 2], [2, 326], [326, 327],
      
      // Mouth
      [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314], [314, 405], [405, 321], [321, 375], [375, 291],
      [61, 185], [185, 40], [40, 39], [39, 37], [37, 0], [0, 267], [267, 269], [269, 270], [270, 409], [409, 291],
    ];

    drawConnectors(connections);

    // 4. Highlight key points with glow
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const keyIndices = [1, 4, 10, 152, 33, 263, 61, 291, 199, 454, 234];
    keyIndices.forEach((idx) => {
      const p = landmarks[idx];
      if (p) {
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });
  }, [landmarks, width, height]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};
