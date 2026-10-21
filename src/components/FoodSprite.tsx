import { foodGroupOf, type FoodGroup } from '../lib/nutrition';
import type { Recipe } from '../lib/types';

/** Comidas "cuquis" en pixel art (16x16) para las recetas sin foto: cada letra es un color de PALETTE */
const PALETTE: Record<string, string> = {
  K: '#3b2a24',
  W: '#ffffff',
  S: '#efe9e1',
  Y: '#fbb829',
  O: '#f08a3c',
  P: '#f4a3a0',
  N: '#2f3a2f',
  G: '#8ba236',
  D: '#5f7420',
  B: '#74433a',
  L: '#a0615a',
  A: '#8fb6d6',
  Z: '#5d8bb0',
  R: '#d9776a',
};

const SPRITES = {
  onigiri: [
    '................',
    '.......KK.......',
    '......KWWK......',
    '.....KWWWWK.....',
    '....KWWWWWWK....',
    '...KWWWWWWWWK...',
    '...KWKWWWWKWK...',
    '..KWWKWWWWKWWK..',
    '..KWPWWKKWWPWK..',
    '.KWWWWWWWWWWWSK.',
    '.KWWWNNNNNNWWSK.',
    '.KWWNNNNNNNNWSK.',
    '.KSWNNNNNNNNSSK.',
    '..KKKKKKKKKKKK..',
    '................',
    '................',
  ],
  egg: [
    '................',
    '.....KKKKKK.....',
    '...KKWWWWWWKK...',
    '..KWWWWWWWWWWK..',
    '.KWWWWKKKKWWWWK.',
    '.KWWWKYYYYKWWWK.',
    'KWWWKYKYYKYKWWK.',
    'KWWWKYKYYKYKWSK.',
    'KWWWKPYKKYPKWSK.',
    '.KWWWKYYYYKWWSK.',
    '.KWWWWKKKKWWSK..',
    '..KWWWWWWWWSK...',
    '...KKSWWWSSK....',
    '.....KKKKKK.....',
    '................',
    '................',
  ],
  fish: [
    '................',
    '................',
    '.....KKKKKK.....',
    '...KKAAAAAAKK.KK',
    '..KAAAAAAAAAAKZK',
    '.KAAKAAAAAAAAZZK',
    '.KAAKAAAAAAAAZZK',
    'KAPAAAAAAAAAAZK.',
    'KAAAKKAAAAAAAZK.',
    '.KAAAAAAAAAAAZZK',
    '.KZAAAAAAAAAZZZK',
    '..KZZAAAAAZZKKZK',
    '...KKZZZZZZK..KK',
    '.....KKKKKK.....',
    '................',
    '................',
  ],
  broccoli: [
    '................',
    '....KKK..KKK....',
    '...KGGGKKGGGK...',
    '..KGGDGGGGDGGK..',
    '.KGGGGGGGGGGGGK.',
    '.KGDGGGGGGGGDGK.',
    '..KGGGGGGGGGGK..',
    '...KKGGGGGGKK...',
    '.....KGGGGK.....',
    '....KGKGGKGK....',
    '....KGGKKGGK....',
    '....KGPGGPGK....',
    '....KGGGGGGK....',
    '.....KKKKKK.....',
    '................',
    '................',
  ],
  pot: [
    '................',
    '......KKKK......',
    '.....KLLLLK.....',
    '...KKKKKKKKKK...',
    '..KBBBBBBBBBBK..',
    '.KKBBBBBBBBBBKK.',
    'KLKBBKBBBBKBBKLK',
    '.KKBBKBBBBKBBKK.',
    '..KBPBBKKBBPBK..',
    '..KBBBBBBBBBBK..',
    '..KLBBBBBBBBLK..',
    '...KLLBBBBLLK...',
    '....KKKKKKKK....',
    '................',
    '................',
    '................',
  ],
} as const;

/** Qué comida sale según el tipo de alimento de la receta */
const SPRITE_FOR: Record<FoodGroup, keyof typeof SPRITES> = {
  huevos: 'egg',
  pescado: 'fish',
  verdura: 'broccoli',
  cereales: 'onigiri',
  legumbres: 'pot',
  carne: 'pot',
};

export default function FoodSprite({ recipe, size = 64 }: { recipe: Recipe; size?: number }) {
  const rows = SPRITES[SPRITE_FOR[foodGroupOf(recipe)]];
  const rects = [];
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch !== '.') rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={PALETTE[ch]} />);
    }
  }
  return (
    <svg className="food-sprite" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      {rects}
    </svg>
  );
}
