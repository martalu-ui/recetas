import DancingPizza from './DancingPizza';
import { Sprite, SPRITE_NAMES, type SpriteName } from './FoodSprite';

/** Avatares de comida que se pueden elegir en «Cuenta» */
export const AVATARS: { id: string; label: string }[] = [
  { id: 'onigiri', label: 'Onigiri' },
  { id: 'egg', label: 'Huevo frito' },
  { id: 'fish', label: 'Pez' },
  { id: 'broccoli', label: 'Brócoli' },
  { id: 'pot', label: 'Olla' },
  { id: 'pizza', label: 'Pizza' },
];

export function isAvatar(value: unknown): value is string {
  return typeof value === 'string' && AVATARS.some((a) => a.id === value);
}

export default function Avatar({ value, size = 40 }: { value: string; size?: number }) {
  if (value === 'pizza') return <DancingPizza size={size} dancing={false} />;
  if ((SPRITE_NAMES as string[]).includes(value)) return <Sprite name={value as SpriteName} size={size} />;
  return null;
}
