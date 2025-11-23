import { useEffect, useRef, useState } from 'react';

export const CallWaveform = ({ isActive, riskLevel = 'low' }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [bars] = useState(() => Array.from({ length: 30 }, () => Math.random() * 0.4 + 0.3));

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return { r: 239, g: 68, b: 68 };
      case 'high': return { r: 249, g: 115, b: 22 };
      case 'medium': return { r: 250, g: 204, b: 21 };
      case 'low': return { r: 52, g: 211, b: 153 };
      default: return { r: 52, g: 211, b: 153 };
    }
  };

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const color = getRiskColor(riskLevel);

    // Set canvas size
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    let phase = 0;

    const draw = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      // Clear canvas with simple background
      ctx.fillStyle = 'rgba(2, 6, 23, 0.5)';
      ctx.fillRect(0, 0, width, height);

      const barCount = 30;
      const barWidth = 2;
      const barGap = width / barCount;
      const centerY = height / 2;

      // Draw simple waveform bars
      for (let i = 0; i < barCount; i++) {
        // Simple wave motion
        const baseHeight = bars[i];
        const wave = Math.sin(phase + i * 0.2) * 0.3;
        const normalizedHeight = Math.max(0.15, Math.min(1, baseHeight + wave));

        const barHeight = normalizedHeight * height * 0.5;
        const x = i * barGap + (barGap - barWidth) / 2;
        const y = centerY - barHeight / 2;

        // Simple solid color with opacity
        const centerDistance = Math.abs(i - barCount / 2) / (barCount / 2);
        const alpha = 0.7 - centerDistance * 0.2;

        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;

        // Draw simple rounded rectangle
        const radius = barWidth / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();
      }

      phase += 0.05;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, riskLevel, bars]);

  return (
    <div className="relative w-full h-16 sm:h-20 bg-slate-950/30 rounded-lg overflow-hidden border border-slate-800/30">
      <canvas ref={canvasRef} className="w-full h-full" />
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40">
          <span className="text-slate-500 text-xs font-medium">En espera...</span>
        </div>
      )}
    </div>
  );
};
