import React, { useRef, useEffect } from 'react';

interface FaceMeshCanvasProps {
  landmarks: any[];
  imageRef: React.RefObject<HTMLImageElement | null>;
  rawWidth: number;
  rawHeight: number;
}

export const FaceMeshCanvas: React.FC<FaceMeshCanvasProps> = ({ landmarks, imageRef, rawWidth, rawHeight }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !landmarks) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = image.clientWidth;
      const height = image.clientHeight;
      
      // 3. Ensure the canvas overlay matches the image exactly
      canvas.width = width;
      canvas.height = height;
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Calculate object-fit: cover scaling and offsets
      const scale = Math.max(width / rawWidth, height / rawHeight);
      const renderedWidth = rawWidth * scale;
      const renderedHeight = rawHeight * scale;
      const offsetX = (renderedWidth - width) / 2;
      const offsetY = (renderedHeight - height) / 2;

      const getX = (val: number) => (val * renderedWidth) - offsetX;
      const getY = (val: number) => (val * renderedHeight) - offsetY;

      // 1. Draw Vertical Midline
      const topPoint = landmarks[10];
      if (topPoint) {
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(59, 255, 156, 0.3)';
        ctx.lineWidth = 1;
        ctx.moveTo(getX(topPoint.x), 0);
        ctx.lineTo(getX(topPoint.x), canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';

      // 2. Draw ALL landmarks as tiny dots
      landmarks.forEach((p) => {
        if (p) {
          ctx.beginPath();
          ctx.arc(getX(p.x), getY(p.y), 0.75, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 3. Draw connections
      const drawConnectors = (indices: number[][]) => {
        indices.forEach(([start, end]) => {
          const p1 = landmarks[start];
          const p2 = landmarks[end];
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(getX(p1.x), getY(p1.y));
            ctx.lineTo(getX(p2.x), getY(p2.y));
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
          ctx.arc(getX(p.x), getY(p.y), 1.5, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.shadowBlur = 4;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });
    };

    // 6. Recalculate overlay coordinates whenever the image loads
    if (image.complete) {
      draw();
    }
    image.addEventListener('load', draw);
    
    const resizeObserver = new ResizeObserver(() => {
      draw();
    });
    resizeObserver.observe(image);

    window.addEventListener('resize', draw);

    return () => {
      image.removeEventListener('load', draw);
      resizeObserver.disconnect();
      window.removeEventListener('resize', draw);
    };
  }, [landmarks, rawWidth, rawHeight, imageRef]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-10"
    />
  );
};
