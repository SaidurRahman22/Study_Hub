import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";

/**
 * Section entrances.
 *
 * The hidden state is applied by `data-observed`, which is only ever set from
 * a layout effect, so if the script never runs, or the browser has no
 * IntersectionObserver, every word stays on the page at full opacity. That is
 * the whole reason the opacity lives behind an attribute rather than in the
 * class itself.
 *
 * `useLayoutEffect` rather than `useEffect`: the attribute has to land before
 * the browser paints, or the content flashes in and then hides itself.
 */

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** staggered in reading order: heading, then text, then picture */
  delay?: number;
  /** travel in px; a picture that opens from its arch uses `variant="open"` instead */
  y?: number;
  variant?: "rise" | "open";
  once?: boolean;
  style?: React.CSSProperties;
  // id, aria-*, and anything else the element needs
  [key: string]: unknown;
};

export function Reveal({
  children,
  as = "div",
  className = "",
  delay = 0,
  y = 22,
  variant = "rise",
  once = true,
  style,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);

  useLayoutEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    setArmed(true);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !armed) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            if (once) io.unobserve(entry.target);
          } else if (!once) {
            entry.target.classList.remove("is-in");
          }
        }
      },
      // fire when the element's top is ~88% of the way down the viewport
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [armed, once]);

  return createElement(
    as,
    {
      ...rest,
      ref,
      className: `${variant === "open" ? "lp-open" : "lp-reveal"} ${className}`.trim(),
      "data-observed": armed ? "true" : undefined,
      style: {
        ...style,
        ["--reveal-delay" as string]: `${delay}ms`,
        ["--reveal-y" as string]: `${y}px`,
      },
    },
    children,
  );
}

/** The scroll thread. Locked to the scrollbar, no smoothing. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="lp-progress"
      style={{ transform: "scaleX(0)" }}
      aria-hidden="true"
    />
  );
}

/**
 * A figure that counts up once, when it arrives. The final value is the
 * initial render, so it is correct without script and correct under reduced
 * motion; the animation only ever replaces an already-right number.
 */
export function CountUp({ value, className = "" }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const digits = value.match(/\d+/);
    if (!digits) return;
    const target = Number(digits[0]);
    if (!Number.isFinite(target) || target === 0) return;

    let raf = 0;
    let start = 0;
    const DURATION = 1100;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();

        const step = (now: number) => {
          if (!start) start = now;
          const t = Math.min(1, (now - start) / DURATION);
          // expo out, so it lands rather than crawls
          const eased = 1 - Math.pow(2, -10 * t);
          el.textContent = value.replace(
            String(target),
            String(Math.round(target * (t === 1 ? 1 : eased))),
          );
          if (t < 1) raf = requestAnimationFrame(step);
          else el.textContent = value;
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );

    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
