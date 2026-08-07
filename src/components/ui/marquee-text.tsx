import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MarqueeTextProps {
  children: React.ReactNode;
  className?: string;
  /** Scroll speed in px/s while hovered */
  speed?: number;
}

/**
 * Single-line text that truncates with an ellipsis and, when the content
 * overflows, scrolls the hidden portion into view on hover (sliding back on
 * mouse leave). Animates text-indent rather than transform so the content
 * stays inline and native ellipsis rendering keeps working at rest.
 */
export function MarqueeText({ children, className, speed = 60 }: MarqueeTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [settled, setSettled] = useState(true);

  const handleMouseEnter = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Measured on every hover so virtualized rows and resizes stay accurate
    const overflow = Math.max(0, el.scrollWidth - el.clientWidth);
    setShift(overflow);
    setHovering(true);
    if (overflow > 0) setSettled(false);
  }, []);

  const handleMouseLeave = useCallback(() => setHovering(false), []);

  const scrolling = hovering && shift > 0;

  return (
    <div
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTransitionEnd={() => {
        if (!hovering) setSettled(true);
      }}
      className={cn("min-w-0 overflow-hidden whitespace-nowrap", className)}
      style={{
        textOverflow: settled && !scrolling ? "ellipsis" : "clip",
        textIndent: scrolling ? -shift : 0,
        transition: scrolling
          ? `text-indent ${shift / speed}s linear 0.3s`
          : "text-indent 0.3s ease-out",
      }}
    >
      {children}
    </div>
  );
}
