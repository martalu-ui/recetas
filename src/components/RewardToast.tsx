import { useEffect } from 'react';
import { usePantry } from '../pantry';
import { isSpriteName, Sprite, SPRITE_LABEL } from './FoodSprite';

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
  );
}
