"use client";

import React, { useEffect, useRef } from "react";

interface AmbientSpaceBackgroundProps {
  isMotionFrozen?: boolean;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  alphaDelta: number;
  vx: number;
  vy: number;
  hue: number;
}

/**
 * Ambient Slow-Drift Cosmic Canvas
 * - Motion-safe: Particle speed is ultra-subtle (~0.04px/frame) to prevent vestibular distress.
 * - Strictly respects @media (prefers-reduced-motion: reduce) by freezing animation.
 * - Respects the user's manual "Freeze Motion" toggle.
 */
export const AmbientSpaceBackground: React.FC<AmbientSpaceBackgroundProps> = ({
  isMotionFrozen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Check system prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const shouldFreeze = isMotionFrozen || prefersReducedMotion;

    // Generate more stars for a richer cosmic feel
    const particleCount = Math.min(150, Math.floor((width * height) / 15000));
    const particles: Particle[] = [];

    const hues = [210, 190, 45, 270]; // Sapphire, Cyan, Dim Amber, Violet

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.6 + 0.6,
        alpha: Math.random() * 0.4 + 0.15,
        alphaDelta: (Math.random() * 0.003 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
        // Ultra-low velocity for imperceptible, calming drift
        vx: (Math.random() - 0.5) * 0.05,
        vy: (Math.random() - 0.5) * 0.05,
        hue: hues[Math.floor(Math.random() * hues.length)],
      });
    }

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep space ambient nebula glow (radial gradient)
      const grad = ctx.createRadialGradient(
        width * 0.3,
        height * 0.25,
        50,
        width * 0.5,
        height * 0.5,
        Math.max(width, height)
      );
      grad.addColorStop(0, "rgba(15, 23, 42, 0.4)");
      grad.addColorStop(0.5, "rgba(8, 12, 22, 0.6)");
      grad.addColorStop(1, "rgba(2, 4, 10, 0.95)");

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render fixed particles
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${p.alpha * 0.7})`;
        ctx.shadowBlur = p.radius * 3;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 70%, 0.4)`;
        ctx.fill();
      }
    };

    if (shouldFreeze) {
      drawStatic();
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    // Animation loop for subtle ambient drift
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep space ambient nebula gradient
      const grad = ctx.createRadialGradient(
        width * 0.3,
        height * 0.25,
        50,
        width * 0.5,
        height * 0.5,
        Math.max(width, height)
      );
      grad.addColorStop(0, "rgba(15, 23, 42, 0.4)");
      grad.addColorStop(0.5, "rgba(8, 12, 22, 0.6)");
      grad.addColorStop(1, "rgba(2, 4, 10, 0.95)");

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw and update particles
      for (const p of particles) {
        // Ultra-slow motion
        p.x += p.vx;
        p.y += p.vy;

        // Subtle alpha pulsation
        p.alpha += p.alphaDelta;
        if (p.alpha > 0.55 || p.alpha < 0.1) {
          p.alphaDelta = -p.alphaDelta;
        }

        // Screen wrap
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${p.alpha * 0.7})`;
        ctx.shadowBlur = p.radius * 3;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 70%, 0.4)`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMotionFrozen]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 opacity-80"
    />
  );
};

