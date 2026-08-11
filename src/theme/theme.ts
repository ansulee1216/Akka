export const colors = {
  primary: '#1E9E63', // green — "fresh food saved"
  primaryDark: '#137A4B',
  primarySoft: '#EAF7EF', // pale green fill

  accent: '#C2410C', // discount / urgency — deep warm orange
  accentSoft: '#FDEBE0',

  // Warm neutrals. The background is a cream rather than a cool grey-white:
  // food reads as appetising against warm tones and clinical against cool ones.
  background: '#FBF7F0',
  card: '#FFFFFF',
  text: '#1F1B16',
  textMuted: '#8A7F70',
  border: '#EDE4D6',
  borderSoft: '#F0E8DC',

  overlay: 'rgba(31,27,22,0.72)', // chips sitting on top of imagery

  danger: '#D64545',
  success: '#1E9E63',
};

/**
 * Tint + icon per food category.
 *
 * Photo upload is currently switched off, so most listings have no image. A
 * single grey placeholder would make every card look identical; tinting by
 * category instead gives the feed variety and a hint of what's on offer.
 * When photos are enabled these become the fallback rather than the norm.
 */
/** The categories a shop can pick from, in the order they're shown. */
export const CATEGORIES = [
  '한식',
  '중식',
  '일식',
  '양식',
  '멕시칸',
  '치킨',
  '버거',
  '피자',
  '분식',
  '스시/회',
  '도시락',
  '간식',
  '디저트',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const categoryStyles: Record<string, { tint: string; ink: string; icon: string }> = {
  한식: { tint: '#E8EFE3', ink: '#4F7A3A', icon: 'restaurant-outline' },
  중식: { tint: '#F7E2DC', ink: '#A8452F', icon: 'flame-outline' },
  일식: { tint: '#E4EDF2', ink: '#3F6B85', icon: 'fish-outline' },
  양식: { tint: '#EFE6F0', ink: '#77518A', icon: 'wine-outline' },
  멕시칸: { tint: '#FBE7D2', ink: '#B0621B', icon: 'flame-outline' },
  치킨: { tint: '#FAEBD7', ink: '#B4761F', icon: 'egg-outline' },
  버거: { tint: '#F7EBD1', ink: '#9E7420', icon: 'fast-food-outline' },
  피자: { tint: '#F6E4E1', ink: '#A34F3C', icon: 'pizza-outline' },
  분식: { tint: '#FAE3E3', ink: '#A8414A', icon: 'flame-outline' },
  '스시/회': { tint: '#E1EEF0', ink: '#3D7480', icon: 'fish-outline' },
  도시락: { tint: '#EAEEE2', ink: '#5E7440', icon: 'cube-outline' },
  간식: { tint: '#F3EAD8', ink: '#8F7434', icon: 'basket-outline' },
  디저트: { tint: '#F7E6EC', ink: '#9E4E69', icon: 'ice-cream-outline' },
  기타: { tint: '#EDE9E1', ink: '#7A7266', icon: 'fast-food-outline' },
};

/**
 * Restaurants registered before categories were renamed to Korean still hold
 * the old English values. Mapping them keeps those cards looking right instead
 * of falling back to the generic grey tile.
 */
const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
  Korean: '한식',
  Japanese: '일식',
  Italian: '양식',
  Bakery: '디저트',
  Cafe: '디저트',
  'Fast Food': '버거',
  Other: '기타',
};

export function categoryStyle(category?: string) {
  if (!category) return categoryStyles.기타;
  const resolved = LEGACY_CATEGORY_ALIASES[category] ?? category;
  return categoryStyles[resolved] ?? categoryStyles.기타;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  price: { fontSize: 20, fontWeight: '700' as const },
};
