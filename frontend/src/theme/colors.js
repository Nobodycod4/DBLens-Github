export const palette = {
  accent: '#2563EB',
  accentHover: '#1d4ed8',
  primary: '#FAFAF9',
  secondary: '#1C1917',
  primaryHover: '#F5F5F4',
  primaryLight: '#FFFFFF',
  surfaceDark: '#1C1917',
  surfaceLight: '#FAFAF9',
  muted: '#78716C',
  mutedSubtle: '#A8A29E',
  secondaryAccent: '#0891B2',
  secondaryAccentHover: '#0e7490',
  borderDefault: '#E7E5E4',
  borderMuted: '#D6D3D1',
  success: '#22c55e',
  successMuted: 'rgba(34, 197, 94, 0.12)',
  warning: '#eab308',
  warningMuted: 'rgba(234, 179, 8, 0.12)',
  danger: '#dc2626',
  dangerMuted: 'rgba(220, 38, 38, 0.12)',
  info: '#2563EB',
  infoMuted: 'rgba(37, 99, 235, 0.12)',
};

export function applyPaletteToCss() {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', palette.accent);
  root.style.setProperty('--brand-primary-hover', palette.accentHover);
  root.style.setProperty('--brand-primary-light', palette.info);
  root.style.setProperty('--brand-accent', palette.accent);
  root.style.setProperty('--bg-base', palette.primary);
  root.style.setProperty('--bg-base-dark', palette.secondary);
  root.style.setProperty('--fg-default', palette.secondary);
  root.style.setProperty('--fg-muted', palette.muted);
  root.style.setProperty('--fg-subtle', palette.mutedSubtle);
  root.style.setProperty('--border-default', palette.borderDefault);
  root.style.setProperty('--border-muted', palette.borderMuted);
  root.style.setProperty('--secondary-accent', palette.secondaryAccent);
  root.style.setProperty('--secondary-accent-muted', 'rgba(8, 145, 178, 0.12)');
  root.style.setProperty('--accent', palette.accent);
  root.style.setProperty('--accent-emphasis', palette.accentHover);
  root.style.setProperty('--accent-muted', palette.infoMuted);
  root.style.setProperty('--danger', palette.danger);
  root.style.setProperty('--danger-muted', palette.dangerMuted);
  root.style.setProperty('--success', palette.success);
  root.style.setProperty('--success-muted', palette.successMuted);
  root.style.setProperty('--warning', palette.warning);
  root.style.setProperty('--warning-muted', palette.warningMuted);
  root.style.setProperty('--info', palette.info);
  root.style.setProperty('--info-muted', palette.infoMuted);
}

export default palette;

