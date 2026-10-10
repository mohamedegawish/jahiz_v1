import { AdColor } from '../../types';

export interface AdPalette {
  key: AdColor;
  label: string;
  /** the brand color of the palette (badge/arrow accent) */
  hex: string;
  /** very light tint used behind covers / soft surfaces */
  soft: string;
  /** readable dark tone of the same hue (text/icons on light bg) */
  ink: string;
  /** extremely light focus tint drawn on the card border/ring */
  focus: string;
}

export const colorOptions: AdPalette[] = [
  { key: 'green', label: 'أخضر', hex: '#35B779', soft: '#E7F8EE', ink: '#1D7E4C', focus: '#D7F2E5' },
  { key: 'blue', label: 'أزرق', hex: '#004A93', soft: '#DDEBFD', ink: '#003a75', focus: '#DDEBFD' },
  { key: 'orange', label: 'برتقالي', hex: '#F2B84B', soft: '#FEDCC2', ink: '#A66F0B', focus: '#FDF0D6' },
  { key: 'red', label: 'أحمر', hex: '#E45B6A', soft: '#FDECEE', ink: '#B82B3B', focus: '#FADDE1' },
  { key: 'beige', label: 'بيج', hex: '#C9A66B', soft: '#F8F2E6', ink: '#8C5D08', focus: '#F1E9D9' },
  { key: 'purple', label: 'بنفسجي', hex: '#E67E00', soft: '#FFEDD5', ink: '#002E4A', focus: '#FFE2C7' }
];

/** Resolve the full palette for an ad color key (falls back to purple). */
export function getAdPalette(color: AdColor | string): AdPalette {
  return colorOptions.find((c) => c.key === color) ?? colorOptions[colorOptions.length - 1];
}

