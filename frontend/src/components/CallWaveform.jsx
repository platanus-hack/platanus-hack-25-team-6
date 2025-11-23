import { useEffect, useRef, useState } from 'react';

export const CallWaveform = ({ isActive, riskLevel = 'low' }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [bars] = useState(() => Array.from({ length: 40 }, () => Math.random()));

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return { r: 220, g: 38, b: 38 };
      case 'high': return { r: 234, g: 88, b: 12 };
      case 'medium': return { r: 245, g: 158, b: 11 };
      case 'low': return { r: 59, g: 130, b: 246 };
      default: return { r: 59, g: 130, b: 246 };
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

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      const barCount = 40;
      const barWidth = width / barCount;
      const centerY = height / 2;

      // Draw waveform bars
      for (let i = 0; i < barCount; i++) {
        // Create wave motion with multiple sine waves
        const baseHeight = bars[i] * 0.3;
        const wave1 = Math.sin(phase + i * 0.3) * 0.4;
        const wave2 = Math.sin(phase * 1.5 - i * 0.2) * 0.3;
        const normalizedHeight = (baseHeight + wave1 + wave2 + 1) / 2;

        const barHeight = normalizedHeight * height * 0.8;
        const x = i * barWidth;
        const y = centerY - barHeight / 2;

        // Gradient from center to edges
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        const alpha = 0.8 - (Math.abs(i - barCount / 2) / barCount) * 0.4;

        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.6})`);
        gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.6})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - 2, barHeight);

        // Add glow effect
        if (i % 3 === 0) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
        } else {
          ctx.shadowBlur = 0;
        }
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
    <div className="relative w-full h-24 sm:h-28 md:h-32 bg-gradient-to-br from-slate-900 to-slate-950 rounded-xl overflow-hidden shadow-inner">
      <canvas ref={canvasRef} className="w-full h-full" />
      {isActive && (
        <div className="absolute top-2 left-3 flex items-center gap-2 bg-slate-950/80 px-2.5 py-1 rounded-lg backdrop-blur-sm">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></div>
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">EN VIVO</span>
        </div>
      )}
    </div>
  );
};
