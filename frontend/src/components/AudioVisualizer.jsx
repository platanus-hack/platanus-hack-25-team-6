import { useEffect, useRef } from 'react';

export const AudioVisualizer = ({ analyser, isActive }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!analyser || !isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      // Clear canvas with dark background
      canvasCtx.fillStyle = 'rgba(17, 24, 39, 0.3)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw waveform
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = '#3b82f6'; // Blue color
      canvasCtx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();

      // Draw frequency bars
      analyser.getByteFrequencyData(dataArray);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let barX = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.3;

        const r = barHeight + (25 * (i / bufferLength));
        const g = 250 * (i / bufferLength);
        const b = 50;

        canvasCtx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
        canvasCtx.fillRect(
          barX,
          canvas.height - barHeight,
          barWidth,
          barHeight
        );

        barX += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isActive]);

  return (
    <div className="relative w-full h-32 sm:h-36 md:h-40 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden my-3 sm:my-4 shadow-lg">
      <canvas ref={canvasRef} className="w-full h-full block" />
      {isActive && (
        <div className="absolute top-2 sm:top-2.5 left-3 sm:left-4 flex items-center gap-2 text-xs sm:text-sm text-slate-400 font-medium uppercase tracking-wide bg-slate-900/80 px-2 sm:px-2.5 py-1 rounded backdrop-blur-sm">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50"></div>
          <span className="text-xs sm:text-sm">Escuchando...</span>
        </div>
      )}
    </div>
  );
};
