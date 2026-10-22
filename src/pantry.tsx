import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { pickReward } from './lib/reward';
import { store } from './lib/store';
import type { MealType, PantryItem, Recipe } from './lib/types';

interface PantryContextValue {
  items: PantryItem[];
  /** Marca una receta como cocinada y gana una comida; `at` si se marca desde un hueco del menú */
  cook(recipe: Recipe, at?: { day: string; slot: MealType }): Promise<PantryItem>;
  uncook(item: PantryItem): Promise<void>;
  /** La comida ganada al cocinar esa receta en ese hueco, si la hay */
  cookedAt(day: string, slot: MealType, recipeId: string): PantryItem | undefined;
  /** Última comida ganada, para el aviso de premio */
  reward: PantryItem | null;
  dismissReward(): void;
}

const PantryContext = createContext<PantryContextValue | null>(null);

/** null fuera de PantryProvider (p. ej. en el sistema de diseño): los componentes esconden lo de cocinar */
export function usePantry(): PantryContextValue | null {
  return useContext(PantryContext);
}

export function PantryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [reward, setReward] = useState<PantryItem | null>(null);

  useEffect(() => {
    store.listPantry().then(setItems, () => setItems([]));
  }, []);

  const cook = useCallback(async (recipe: Recipe, at?: { day: string; slot: MealType }) => {
    const item = await store.addPantry({
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      sprite: pickReward(recipe),
      day: at?.day ?? null,
      slot: at?.slot ?? null,
    });
    setItems((list) => [item, ...list]);
    setReward(item);
    return item;
  }, []);

  const uncook = useCallback(async (item: PantryItem) => {
    await store.removePantry(item.id);
    setItems((list) => list.filter((i) => i.id !== item.id));
    setReward((r) => (r?.id === item.id ? null : r));
  }, []);

  const value = useMemo<PantryContextValue>(
    () => ({
      items,
      cook,
      uncook,
      cookedAt: (day, slot, recipeId) => items.find((i) => i.day === day && i.slot === slot && i.recipeId === recipeId),
      reward,
      dismissReward: () => setReward(null),
    }),
    [items, cook, uncook, reward],
  );

  return <PantryContext.Provider value={value}>{children}</PantryContext.Provider>;
}
