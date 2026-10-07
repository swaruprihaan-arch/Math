/**
 * Brick theme. The 19 colour swatches from the original Math Lab are kept as "brick colours".
 * "Multi" (rainbow bricks) is the default: every brick on screen cycles through classic toy-brick colours.
 */
import type { AppSettings, Baseplate } from '../state/settings';

export interface ThemeSwatch {
  readonly name: string;
  readonly color?: string;
  readonly rainbow?: boolean;
}

/** Same names and colours as the legacy site (order preserved). */
export const THEMES: readonly ThemeSwatch[] = [
  { name: 'Teal', color: '#14b8a6' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Light Blue', color: '#38bdf8' },
  { name: 'Dark Blue', color: '#1e40af' },
  { name: 'Light Green', color: '#a3e635' },
  { name: 'Dark Green', color: '#166534' },
  { name: 'Dark Violet', color: '#6d28d9' },
  { name: 'Light Violet', color: '#a78bfa' },
  { name: 'Dark Red', color: '#b91c1c' },
  { name: 'Light Red', color: '#f87171' },
  { name: 'Light Orange', color: '#fdba74' },
  { name: 'Dark Orange', color: '#ea580c' },
  { name: 'Light Yellow', color: '#facc15' },
  { name: 'Dark Yellow', color: '#ca8a04' },
  { name: 'Neon Pink', color: '#ff00aa' },
  { name: 'Neon Yellow', color: '#eaff00' },
  { name: 'Neon Lime', color: '#39ff14' },
  { name: 'Multi', rainbow: true },
  { name: 'White', color: '#ffffff' },
];

/** Classic toy-brick colours used for rainbow mode. */
export const BRICK_COLORS = ['#d01012', '#f8c300', '#0057a6', '#00852b', '#fe8a18', '#7f3f98', '#36aebf', '#a5ca18'] as const;

export const BASEPLATES: Record<Baseplate, { plate: string; label: string; dark?: boolean }> = {
  GREEN: { plate: '#4caf50', label: 'Green' },
  BLUE: { plate: '#3d8fd6', label: 'Blue' },
  GRAY: { plate: '#a7adb5', label: 'Gray' },
  TAN: { plate: '#e4cd9e', label: 'Tan' },
  WHITE: { plate: '#f4f5f7', label: 'White' },
  NIGHT: { plate: '#1d2633', label: 'Night', dark: true },
};

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('')}`;
}

export function mix(a: string, b: string, p: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A[0] * (1 - p) + B[0] * p, A[1] * (1 - p) + B[1] * p, A[2] * (1 - p) + B[2] * p);
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Text colour with the better WCAG contrast on a given brick colour. */
export function inkOn(hex: string): string {
  const l = luminance(hex);
  const contrastWhite = 1.05 / (l + 0.05);
  const contrastDark = (l + 0.05) / 0.06;
  return contrastWhite >= contrastDark ? '#ffffff' : '#111827';
}

export function brickColor(settings: AppSettings, index: number): string {
  if (settings.look.useCustomColor) return settings.look.customColor;
  const theme = THEMES[settings.look.theme] ?? THEMES[17];
  if (!theme || theme.rainbow) return BRICK_COLORS[index % BRICK_COLORS.length] as string;
  return theme.color as string;
}

export function accentColor(settings: AppSettings): string {
  if (settings.look.useCustomColor) return settings.look.customColor;
  const theme = THEMES[settings.look.theme];
  if (!theme || theme.rainbow) return '#d01012';
  return theme.color === '#ffffff' ? '#ffffff' : (theme.color as string);
}

/** CSS custom properties for the whole page. */
export function themeVariables(settings: AppSettings): Record<string, string> {
  const accent = accentColor(settings);
  const plate = BASEPLATES[settings.look.baseplate] ?? BASEPLATES.GREEN;
  const dark = !!plate.dark;
  const white = accent === '#ffffff';
  const fontStacks: Record<string, string> = {
    ROUNDED: "'Nunito', 'Fredoka', ui-rounded, system-ui, sans-serif",
    CLASSIC: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
    EASY_READ: "'Atkinson Hyperlegible', 'Nunito', system-ui, sans-serif",
  };
  return {
    '--accent': white ? '#f3f4f6' : accent,
    '--accent-dark': white ? '#9ca3af' : mix(accent, '#000000', 0.28),
    '--accent-ink': white ? '#111827' : inkOn(accent),
    '--accent-soft': white ? '#f9fafb' : mix(accent, '#ffffff', dark ? 0.15 : 0.82),
    '--plate': plate.plate,
    '--plate-stud': dark ? mix(plate.plate, '#ffffff', 0.08) : mix(plate.plate, '#ffffff', 0.22),
    '--plate-shadow': mix(plate.plate, '#000000', 0.22),
    '--tile': dark ? '#273244' : '#ffffff',
    '--tile-2': dark ? '#2f3b50' : '#f6f7f9',
    '--ink': dark ? '#f3f4f6' : '#141a24',
    '--muted': dark ? '#c3cad6' : '#4b5563',
    '--edge': dark ? '#0f141c' : '#1f2937',
    '--font-scale': String(settings.look.fontScale),
    '--font-body': fontStacks[settings.look.font] ?? (fontStacks.ROUNDED as string),
    '--font-display': settings.look.font === 'EASY_READ' ? (fontStacks.EASY_READ as string) : "'Fredoka', 'Nunito', system-ui, sans-serif",
  };
}
