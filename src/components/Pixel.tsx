/**
 * Dibujos pixel art a partir de un mapa de caracteres: cada carácter es un píxel
 * y `palette` dice de qué color pintarlo ('.' = transparente, 'x' = color del texto).
 */
function PixelArt({ rows, palette = {}, size, className }: { rows: string[]; palette?: Record<string, string>; size: number; className?: string }) {
  const w = rows[0].length;
  const h = rows.length;
  const rects = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      if (c === '.' || c === ' ') continue;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={c === 'x' ? 'currentColor' : palette[c]} />);
    }
  }
  return (
    <svg className={className} width={size} height={(size * h) / w} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true">
      {rects}
    </svg>
  );
}

const ICONS = {
  dice: [
    '.xxxxxxxxxx.',
    'x..........x',
    'x.xx....xx.x',
    'x.xx....xx.x',
    'x..........x',
    'x....xx....x',
    'x....xx....x',
    'x..........x',
    'x.xx....xx.x',
    'x.xx....xx.x',
    'x..........x',
    '.xxxxxxxxxx.',
  ],
  list: [
    '.xxxxxxxxxx.',
    '.x........x.',
    '.x.xxxxxx.x.',
    '.x........x.',
    '.x.xxxxxx.x.',
    '.x........x.',
    '.x.xxxxxx.x.',
    '.x........x.',
    '.x.xxxx...x.',
    '.x........x.',
    '.x.x.x.x.xx.',
    '..x.x.x.x...',
  ],
  search: [
    '..xxxxx.....',
    '.x.....x....',
    'x.......x...',
    'x.......x...',
    'x.......x...',
    'x.......x...',
    '.x.....x....',
    '..xxxxxxx...',
    '.......xxx..',
    '........xxx.',
    '.........xxx',
    '..........x.',
  ],
  calendar: [
    '..x.....x...',
    'xxxxxxxxxxxx',
    'xxxxxxxxxxxx',
    'x..........x',
    'x.xx.xx.xx.x',
    'x.xx.xx.xx.x',
    'x..........x',
    'x.xx.xx.xx.x',
    'x.xx.xx.xx.x',
    'x..........x',
    'x..........x',
    'xxxxxxxxxxxx',
  ],
  plus: [
    '....xxxx....',
    '....xxxx....',
    '....xxxx....',
    '....xxxx....',
    'xxxxxxxxxxxx',
    'xxxxxxxxxxxx',
    'xxxxxxxxxxxx',
    'xxxxxxxxxxxx',
    '....xxxx....',
    '....xxxx....',
    '....xxxx....',
    '....xxxx....',
  ],
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <PixelArt rows={[...ICONS[name]]} size={size} className="icon" />;
}

/** Las patatas del icono de MajoChef, en pixel art */
const FRIES = [
  '.....Y..Y.......',
  '..Y..YW.YW..Y...',
  '..YW.YO.YO.YW...',
  '..YO.YO.YOYYO...',
  '.YYOYYOYYOYOO.Y.',
  '.YOOYOOYOOYOOYO.',
  'KKKKKKKKKKKKKKKK',
  'KRRRRRRRRRRRRRRK',
  'KRWRRRRRRRRRRRDK',
  '.KRRRRRRRRRRRDK.',
  '.KRRRRRRRRRRRDK.',
  '.KRRRRRRRRRRRDK.',
  '.KRRRRRRRRRRRDK.',
  '..KRRRRRRRRRDK..',
  '..KDDDDDDDDDDK..',
  '..KKKKKKKKKKKK..',
];

export function Fries({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <PixelArt
      rows={FRIES}
      size={size}
      className={className}
      palette={{ K: '#1d2b53', Y: '#ffec27', O: '#ffa300', W: '#fff1e8', R: '#ff004d', D: '#7e2553' }}
    />
  );
}
