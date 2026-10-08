import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { store } from './lib/store';
import type { Recipe, RecipeDraft } from './lib/types';

interface DataContextValue {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  author: string | null;
  reload(): Promise<void>;
  saveRecipe(draft: RecipeDraft, existing: Recipe | null): Promise<Recipe>;
  deleteRecipe(recipe: Recipe): Promise<void>;
  /** Abre la ficha de una receta */
  openRecipe(recipe: Recipe): void;
  /** Abre el formulario: `null` para una receta nueva */
  editRecipe(recipe: Recipe | null): void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData fuera de DataProvider');
  return ctx;
}

interface ProviderProps {
  author: string | null;
  onOpen(recipe: Recipe): void;
  onEdit(recipe: Recipe | null): void;
  children: ReactNode;
}

export function DataProvider({ author, onOpen, onEdit, children }: ProviderProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setRecipes(await store.listRecipes());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // Al volver a la pestaña, recargamos para ver lo que haya subido la otra persona
    const onVisible = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  const value = useMemo<DataContextValue>(
    () => ({
      recipes,
      loading,
      error,
      author,
      reload,
      async saveRecipe(draft, existing) {
        const saved = await store.saveRecipe(draft, existing, author);
        setRecipes((list) => (existing ? list.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...list]));
        return saved;
      },
      async deleteRecipe(recipe) {
        await store.deleteRecipe(recipe);
        setRecipes((list) => list.filter((r) => r.id !== recipe.id));
      },
      openRecipe: onOpen,
      editRecipe: onEdit,
    }),
    [recipes, loading, error, author, reload, onOpen, onEdit],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
