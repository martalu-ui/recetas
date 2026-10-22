import { useEffect, useState } from 'react';
import { usePantry } from '../pantry';
import { isSpriteName, Sprite, SPRITE_LABEL } from './FoodSprite';
import Unicorn from './Unicorn';

/** Aviso de premio al marcar una receta como cocinada: la comida ganada salta y se va a la despensa */
export default function RewardToast() {
  const pantry = usePantry();
  const reward = pantry?.reward;

  useEffect(() => {
    if (!reward) return;
    const t = window.setTimeout(() => pantry.dismissReward(), 5000);
    return () => window.clearTimeout(t);
  }, [reward, pantry]);

  if (!pantry || !reward) return null;
  const name = isSpriteName(reward.sprite) ? reward.sprite : 'pot';

  return (
    <>
      <UnicornRun key={`uni-${reward.id}`} />
      <div className="reward" role="status" key={reward.id}>
        <span className="reward-sprite">
          <Sprite name={name} size={52} />
        </span>
        <div className="reward-text">
          <strong>¡Has ganado: {SPRITE_LABEL[name]}!</strong>
          <span className="muted small">Por cocinar {reward.recipeTitle}</span>
          <a href="#/cuenta" onClick={pantry.dismissReward}>
            Ver mi despensa →
          </a>
        </div>
        <button className="icon-btn" onClick={pantry.dismissReward} aria-label="Cerrar aviso">
          ×
        </button>
      </div>
    </>
  );
}

/** Al ganar una comida, un unicornio cruza la pantalla una vez (sin movimiento reducido) */
function UnicornRun() {
  const [running, setRunning] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  if (!running) return null;
  return (
    <div className="unicorn-run" aria-hidden onAnimationEnd={(e) => e.target === e.currentTarget && setRunning(false)}>
      <Unicorn size={260} />
    </div>
  );
}
