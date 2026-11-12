import type { CSSProperties, ReactNode } from "react";

interface P {
  className?: string;
  style?: CSSProperties;
}

const Svg = ({ className, style, children }: P & { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
    style={style}
  >
    {children}
  </svg>
);

export const IconDice = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <circle cx="8.6" cy="8.6" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15.4" cy="15.4" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconReset = (p: P) => (
  <Svg {...p}>
    <path d="M4 12a8 8 0 1 0 2.6-5.9" />
    <path d="M4 4.5V9h4.5" />
  </Svg>
);

export const IconArrow = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

export const IconX = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconCamera = (p: P) => (
  <Svg {...p}>
    <path d="M4 8.5h3l1.8-2.8h6.4L17 8.5h3v10.5H4z" />
    <circle cx="12" cy="13.4" r="3.3" />
  </Svg>
);

export const IconPin = (p: P) => (
  <Svg {...p}>
    <path d="M12 21s6.5-6 6.5-11.2a6.5 6.5 0 0 0-13 0C5.500 15 12 21 12 21z" />
    <circle cx="12" cy="9.8" r="2.3" />
  </Svg>
);

export const IconHanger = (p: P) => (
  <Svg {...p}>
    <path d="M12 8.2V10l8.300 5.700a1.500 1.500 0 0 1-.85 2.800H4.550a1.500 1.500 0 0 1-.85-2.800L12 10" />
    <path d="M12 8.200a2.100 2.100 0 1 0-2.100-2.100" />
  </Svg>
);

export const IconHeart = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="var(--color-ink)"
    strokeWidth={2}
    strokeLinejoin="round"
    aria-hidden="true"
    className={p.className}
    style={p.style}
  >
    <path d="M12 20.300S4.200 15.700 4.200 9.900A4.400 4.400 0 0 1 12 7.200a4.400 4.400 0 0 1 7.800 2.700c0 5.800-7.800 10.400-7.800 10.400z" />
  </svg>
);

export const IconSpark = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={p.className} style={p.style}>
    <path
      d="M12 1.500c.7 5.600 3 8.300 9.500 9-6.500.7-8.800 3.400-9.500 9-.7-5.600-3-8.300-9.500-9 6.500-.7 8.800-3.400 9.500-9z"
      fill="currentColor"
      stroke="var(--color-ink)"
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  </svg>
);
