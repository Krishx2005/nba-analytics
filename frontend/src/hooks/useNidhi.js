import { useState, useEffect, useCallback, useRef } from "react";

const SECRET = "nidhi";

export function useNidhi() {
  const [active, setActive] = useState(false);
  const bufferRef = useRef("");
  const tabIntervalRef = useRef(null);
  const originalTitle = useRef(document.title);

  const toggle = useCallback(() => {
    setActive((prev) => {
      const next = !prev;
      if (next) {
        originalTitle.current = document.title;
        // Flash browser tab
        let flip = false;
        tabIntervalRef.current = setInterval(() => {
          document.title = flip ? "\u{1F496} hi nidhi \u{1F496}" : "\u{1F3C0} made by krish \u{1F3C0}";
          flip = !flip;
        }, 800);
      } else {
        // Restore everything
        clearInterval(tabIntervalRef.current);
        document.title = originalTitle.current;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key.length !== 1) return;
      bufferRef.current = (bufferRef.current + key).slice(-SECRET.length);
      if (bufferRef.current === SECRET) {
        bufferRef.current = "";
        toggle();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      clearInterval(tabIntervalRef.current);
    };
  }, [toggle]);

  return active;
}
