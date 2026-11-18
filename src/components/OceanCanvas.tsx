import React, { useEffect, useRef, useState } from 'react';

export const OceanCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const motes = Array.from({ length: 40 }, (_, i) => ({
      x: (i * 137.5) % 1,
      y: 0.25 + ((i * 293.3) % 0.72),
      speed: 0.006 + (i % 5) * 0.0025,
      size: 1.1 + (i % 3) * 0.8,
      alpha: 0.08 + (i % 4) * 0.04,
      phase: i * 0.7,
    }));

    let lastTime = performance.now();
    let elapsed = 0;

    const draw = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      if (!prefersReducedMotion) {
        elapsed += dt;
      }

      ctx.clearRect(0, 0, width, height);

      if (imgFailed) {
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, '#0C2444');
        bg.addColorStop(0.28, '#133763');
        bg.addColorStop(0.65, '#092244');
        bg.addColorStop(1, '#040F1F');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);
      }

      // Subtle living sunlit water glints across the ocean swells
      ctx.lineWidth = 1.1;
      const bandCount = 7;
      for (let b = 0; b < bandCount; b++) {
        const baseY = height * 0.32 + ((height * 0.65) / bandCount) * b;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 32) {
          const wave =
            Math.sin(x * 0.004 + elapsed * 0.65 + b * 1.1) * 9 +
            Math.cos(x * 0.008 - elapsed * 0.4 + b * 0.6) * 4;
          const y = baseY + wave;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(186, 230, 253, ${imgFailed ? 0.08 : 0.045})`;
        ctx.stroke();
      }

      for (const m of motes) {
        const px = ((m.x + elapsed * m.speed * 0.25) % 1) * width;
        const py =
          ((m.y + Math.sin(elapsed * 0.45 + m.phase) * 0.01 + 1) % 1) * height;
        ctx.fillStyle = `rgba(224, 242, 254, ${m.alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, m.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(draw);
      }
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [imgFailed]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-[#0B1726]"
    >
      {!imgFailed && (
        <img
          src={`${import.meta.env.BASE_URL}assets/ocean_naval_bg.jpg`}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover object-center scale-[1.01] brightness-[0.65] contrast-[0.94] saturate-[0.78]"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(11, 24, 42, 0.78) 0%, rgba(14, 32, 54, 0.72) 48%, rgba(8, 20, 36, 0.88) 100%)',
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-40"
      />
    </div>
  );
};
