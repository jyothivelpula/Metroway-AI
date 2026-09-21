/** MetroWay AI design tokens. Prefer Tailwind classes mapped from `index.css` @theme. */

export const colors = {
  primary: "#086B82",
  primaryDark: "#064E5F",
  primaryLight: "#DCEFF2",
  accent: "#C92A20",
  assist: "#D47842",
  background: "#F5F0E7",
  surface: "#FFFDF9",
  surfaceSecondary: "#EEE7DA",
  text: "#102A3A",
  muted: "#647887",
  border: "#DDD5C8",
  redLine: "#d61f26",
  blueLine: "#0077c8",
  greenLine: "#009a44",
} as const;

export const radius = {
  control: "0.75rem",
  card: "1.25rem",
  pill: "999px",
} as const;

export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "2rem",
} as const;
