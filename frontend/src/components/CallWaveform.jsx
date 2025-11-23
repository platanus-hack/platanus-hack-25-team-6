import { useEffect, useRef, useState } from 'react';

export const CallWaveform = ({ isActive, riskLevel = 'low' }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [bars] = useState(() => Array.from({ length: 60 }, () => Math.random() * 0.5 + 0.5));

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return { r: 239, g: 68, b: 68, glow: 'rgba(239, 68, 68, 0.3)' };
      case 'high': return { r: 249, g: 115, b: 22, glow: 'rgba(249, 115, 22, 0.3)' };
      case 'medium': return { r: 250, g: 204, b: 21, glow: 'rgba(250, 204, 21, 0.3)' };
      case 'low': return { r: 52, g: 211, b: 153, glow: 'rgba(52, 211, 153, 0.3)' };
      default: return { r: 52, g: 211, b: 153, glow: 'rgba(52, 211, 153, 0.3)' };
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

      // Clear canvas with subtle gradient background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
      bgGradient.addColorStop(1, 'rgba(30, 41, 59, 0.95)');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      const barCount = 60;
      const barWidth = (width / barCount) * 0.7;
      const barGap = (width / barCount) * 0.3;
      const centerY = height / 2;

      // Draw waveform bars with rounded caps
      for (let i = 0; i < barCount; i++) {
        // Create more natural wave motion
        const baseHeight = bars[i];
        const wave1 = Math.sin(phase + i * 0.15) * 0.5;
        const wave2 = Math.sin(phase * 2 - i * 0.1) * 0.3;
        const wave3 = Math.sin(phase * 0.5 + i * 0.05) * 0.2;
        const normalizedHeight = Math.max(0.1, Math.min(1, (baseHeight + wave1 + wave2 + wave3) / 2));

        const barHeight = normalizedHeight * height * 0.7;
        const x = i * (barWidth + barGap) + barGap / 2;
        const y = centerY - barHeight / 2;

        // Create vertical gradient for each bar
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        const centerDistance = Math.abs(i - barCount / 2) / (barCount / 2);
        const alpha = 0.9 - centerDistance * 0.3;

        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`);
        gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`);

        // Draw bar with rounded caps
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color.glow;

        const radius = barWidth / 2;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, y + barHeight - radius);
        ctx.quadraticCurveTo(x + barWidth, y + barHeight, x + barWidth - radius, y + barHeight);
        ctx.lineTo(x + radius, y + barHeight);
        ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();

        // Add extra glow to center bars
        if (Math.abs(i - barCount / 2) < 5) {
          ctx.shadowBlur = 25;
        }
      }

      ctx.shadowBlur = 0;
      phase += 0.08;
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
    <div className="relative w-full h-20 sm:h-24 bg-slate-950 rounded-xl overflow-hidden border border-slate-800/50 shadow-lg">
      <canvas ref={canvasRef} className="w-full h-full" />
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <span className="text-slate-500 text-sm font-medium">En espera...</span>
        </div>
      )}
    </div>
  );
};
