"use client";

import { useEffect, useRef } from "react";

export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const colors = [
      { r: 88, g: 28, b: 135 },
      { r: 15, g: 118, b: 110 },
      { r: 30, g: 64, b: 175 },
      { r: 139, g: 92, b: 246 },
    ];

    const draw = () => {
      time += 0.003;
      ctx.fillStyle = "rgba(0, 0, 0, 0.03)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < 3; i++) {
        const color = colors[i % colors.length];
        
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);

        const segments = 100;
        for (let x = 0; x <= segments; x++) {
          const xPos = (x / segments) * canvas.width;
          const wave1 = Math.sin(x * 0.02 + time + i) * 100;
          const wave2 = Math.sin(x * 0.01 + time * 0.5 + i * 2) * 150;
          const wave3 = Math.cos(x * 0.015 + time * 0.7 + i) * 80;
          const yPos = canvas.height * 0.5 + wave1 + wave2 + wave3 - i * 100;
          
          ctx.lineTo(xPos, yPos);
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.15)`);
        gradient.addColorStop(0.5, `rgba(${color.r + 30}, ${color.g + 30}, ${color.b + 30}, 0.1)`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.05)`);
        
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}
