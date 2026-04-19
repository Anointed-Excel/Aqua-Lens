// ─── Glassmorphism Design System ─────────────────────────────────────────────
// Primary palette: deep navy base + translucent glass layers + gold accent

export const lightTheme = {
  mode: 'light',

  // Brand
  primary: '#F5C518',
  primaryDark: '#D4A017',
  primaryLight: 'rgba(245,197,24,0.12)',
  primaryGlow: 'rgba(245,197,24,0.15)',

  // Backgrounds
  bg: '#F0F2FA',
  bgSecondary: '#E8EBF5',
  surface: 'rgba(255,255,255,0.85)',
  surfaceElevated: '#FFFFFF',
  card: 'rgba(255,255,255,0.90)',
  glass: 'rgba(255,255,255,0.70)',
  glassBorder: 'rgba(0,0,0,0.07)',

  // Text
  text: '#0A0E1A',
  textSecondary: '#3D4460',
  textMuted: '#8C93B0',
  textOnPrimary: '#0A0E1A',

  // UI
  border: 'rgba(0,0,0,0.08)',
  borderLight: 'rgba(0,0,0,0.04)',
  inputBg: 'rgba(255,255,255,0.80)',
  inputBorder: 'rgba(0,0,0,0.10)',
  shadow: 'rgba(10,14,26,0.10)',
  shadowDark: 'rgba(10,14,26,0.18)',
  overlay: 'rgba(0,0,0,0.85)',
  divider: 'rgba(0,0,0,0.06)',

  // Status
  success: '#00C17A',
  successBg: 'rgba(0,193,122,0.12)',
  error: '#FF3B5C',
  errorBg: 'rgba(255,59,92,0.10)',
  warning: '#FF9500',
  warningBg: 'rgba(255,149,0,0.10)',
  info: '#007AFF',
  infoBg: 'rgba(0,122,255,0.10)',

  // Nav
  tabBar: 'rgba(240,242,250,0.97)',
  tabBarBorder: 'rgba(0,0,0,0.06)',
  tabActive: '#D4A017',
  tabInactive: '#8C93B0',
  header: '#F0F2FA',
  headerText: '#0A0E1A',

  statusBar: 'dark-content',
};

export const darkTheme = {
  mode: 'dark',

  // Brand
  primary: '#F5C518',
  primaryDark: '#D4A017',
  primaryLight: 'rgba(245,197,24,0.12)',
  primaryGlow: 'rgba(245,197,24,0.20)',

  // Backgrounds — deep navy glassmorphism base
  bg: '#070D1A',
  bgSecondary: '#0C1526',
  surface: 'rgba(255,255,255,0.05)',
  surfaceElevated: 'rgba(255,255,255,0.08)',
  card: 'rgba(255,255,255,0.06)',
  glass: 'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(255,255,255,0.10)',

  // Text
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.35)',
  textOnPrimary: '#0A0E1A',

  // UI
  border: 'rgba(255,255,255,0.10)',
  borderLight: 'rgba(255,255,255,0.06)',
  inputBg: 'rgba(255,255,255,0.07)',
  inputBorder: 'rgba(255,255,255,0.12)',
  shadow: 'rgba(0,0,0,0.50)',
  shadowDark: 'rgba(245,197,24,0.12)',
  overlay: 'rgba(0,0,0,0.85)',
  divider: 'rgba(255,255,255,0.06)',

  // Status
  success: '#00D68F',
  successBg: 'rgba(0,214,143,0.12)',
  error: '#FF4757',
  errorBg: 'rgba(255,71,87,0.12)',
  warning: '#FFB300',
  warningBg: 'rgba(255,179,0,0.12)',
  info: '#00AEFF',
  infoBg: 'rgba(0,174,255,0.12)',

  // Nav
  tabBar: 'rgba(7,13,26,0.97)',
  tabBarBorder: 'rgba(255,255,255,0.08)',
  tabActive: '#F5C518',
  tabInactive: 'rgba(255,255,255,0.30)',
  header: '#070D1A',
  headerText: '#FFFFFF',

  statusBar: 'light-content',
};
