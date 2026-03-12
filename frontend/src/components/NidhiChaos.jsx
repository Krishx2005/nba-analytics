import { useEffect, useRef } from "react";

const HEARTS = ["\u{1F495}", "\u{2764}\u{FE0F}", "\u{1F497}", "\u{1F496}"];
const CONFETTI_COLORS = ["#ff69b4", "#ff1493", "#ffffff", "#ffd700", "#ff6b9d", "#c71585"];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

export default function NidhiChaos({ active }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const basketballsRef = useRef([]);
  const heartsRef = useRef([]);
  const spotlightRef = useRef(0);
  const bgPhaseRef = useRef(0);

  // Confetti + basketball + hearts animation loop
  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(animRef.current);
      particlesRef.current = [];
      basketballsRef.current = [];
      heartsRef.current = [];
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Spawn confetti burst
    const burstConfetti = (x, y, count = 30) => {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x,
          y,
          vx: rand(-6, 6),
          vy: rand(-10, -2),
          size: rand(3, 7),
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          rotation: rand(0, 360),
          rotSpeed: rand(-8, 8),
          life: 1,
          decay: rand(0.003, 0.008),
        });
      }
    };

    // Spawn basketball
    const spawnBasketball = () => {
      basketballsRef.current.push({
        x: rand(0, canvas.width),
        y: -60,
        vy: rand(2, 5),
        vx: rand(-1, 1),
        size: rand(20, 45),
        rotation: 0,
        rotSpeed: rand(-5, 5),
        bounce: 0,
      });
    };

    // Spawn floating heart
    const spawnHeart = () => {
      heartsRef.current.push({
        x: rand(0, canvas.width),
        y: canvas.height + 30,
        vy: rand(-1.5, -3.5),
        vx: rand(-0.5, 0.5),
        size: rand(16, 32),
        emoji: HEARTS[Math.floor(Math.random() * HEARTS.length)],
        opacity: 1,
        wobble: rand(0, Math.PI * 2),
      });
    };

    let frame = 0;
    let lastBurst = 0;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      // Background pulse
      bgPhaseRef.current += 0.02;
      const pulse = Math.sin(bgPhaseRef.current) * 0.5 + 0.5;
      const r = Math.round(10 + pulse * 40);
      const g = Math.round(5 + pulse * 5);
      const b = Math.round(20 + pulse * 50);
      document.body.style.background = `rgb(${r},${g},${b})`;

      // Spotlight sweep
      spotlightRef.current += 0.015;
      const spotX = (Math.sin(spotlightRef.current) * 0.5 + 0.5) * canvas.width;
      const spotX2 = (Math.cos(spotlightRef.current * 0.7 + 1) * 0.5 + 0.5) * canvas.width;
      const gradient = ctx.createRadialGradient(spotX, 0, 0, spotX, 0, canvas.height * 0.8);
      gradient.addColorStop(0, "rgba(255, 105, 180, 0.06)");
      gradient.addColorStop(1, "rgba(255, 105, 180, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const gradient2 = ctx.createRadialGradient(spotX2, canvas.height, 0, spotX2, canvas.height, canvas.height * 0.7);
      gradient2.addColorStop(0, "rgba(199, 21, 133, 0.05)");
      gradient2.addColorStop(1, "rgba(199, 21, 133, 0)");
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Spawn stuff
      if (frame % 8 === 0) spawnBasketball();
      if (frame % 12 === 0) spawnHeart();
      if (frame - lastBurst > 60) {
        burstConfetti(rand(50, canvas.width - 50), rand(50, canvas.height - 50), 25);
        lastBurst = frame;
      }
      if (frame % 90 === 0) {
        // Extra burst from edges
        burstConfetti(rand(0, canvas.width), 0, 40);
      }

      // Draw confetti
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.rotation += p.rotSpeed;
        p.life -= p.decay;
        if (p.life <= 0) return false;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
        return true;
      });

      // Draw basketballs
      basketballsRef.current = basketballsRef.current.filter((b) => {
        b.y += b.vy;
        b.x += b.vx;
        b.vy += 0.12;
        b.rotation += b.rotSpeed;

        // Bounce off bottom
        if (b.y > canvas.height - b.size && b.bounce < 3) {
          b.vy = -b.vy * 0.6;
          b.y = canvas.height - b.size;
          b.bounce++;
        }

        if (b.y > canvas.height + 100) return false;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate((b.rotation * Math.PI) / 180);
        ctx.font = `${b.size}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("\u{1F3C0}", 0, 0);
        ctx.restore();
        return true;
      });

      // Draw floating hearts
      heartsRef.current = heartsRef.current.filter((h) => {
        h.y += h.vy;
        h.wobble += 0.03;
        h.x += Math.sin(h.wobble) * 0.8 + h.vx;
        h.opacity -= 0.003;

        if (h.opacity <= 0 || h.y < -50) return false;

        ctx.save();
        ctx.globalAlpha = h.opacity;
        ctx.font = `${h.size}px serif`;
        ctx.textAlign = "center";
        ctx.fillText(h.emoji, h.x, h.y);
        ctx.restore();
        return true;
      });

      animRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      document.body.style.background = "#0a0a0a";
    };
  }, [active]);

  if (!active) return null;

  return (
    <>
      {/* Full-screen canvas for particles */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9998 }}
      />

      {/* Giant center text */}
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 9999 }}
      >
        <div
          style={{
            animation: "nidhiZoom 0.6s ease-out forwards, nidhiPulse 2s ease-in-out 0.6s infinite",
            fontSize: "clamp(2rem, 8vw, 5rem)",
            fontWeight: 800,
            color: "#fff",
            textShadow: "0 0 40px #ff69b4, 0 0 80px #ff1493, 0 0 120px #c71585",
            letterSpacing: "-0.02em",
          }}
        >
          {"\u{1F495}"} HI NIDHI {"\u{1F495}"}
        </div>
      </div>

      {/* Bottom corner message */}
      <div
        className="fixed bottom-4 right-4 pointer-events-none"
        style={{
          zIndex: 9999,
          animation: "nidhiFadeIn 1s ease-out 1s both",
        }}
      >
        <div
          style={{
            background: "rgba(255, 105, 180, 0.15)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 105, 180, 0.3)",
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: 12,
            color: "#ffb6d9",
            fontWeight: 500,
          }}
        >
          krish made this just for you {"\u{1F495}"}
        </div>
      </div>
    </>
  );
}
