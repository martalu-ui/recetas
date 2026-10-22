import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { pickReward } from './lib/reward';
import { useData } from './data';
import { store, type Score } from './lib/store';
import { oweText, type Voucher, type VoucherKind } from './lib/vouchers';
import type { MealType, PantryItem, Recipe } from './lib/types';

interface PantryContextValue {
  /** Todas las comidas ganadas (también las gastadas en vales) */
  items: PantryItem[];
  /** Las que siguen en el bote y se pueden canjear */
  available: PantryItem[];
  /** Vales de los dos: los míos me los deben; los de mi pareja los debo yo */
  vouchers: Voucher[];
  /** Catálogo de vales que se pueden canjear (lo editáis los dos) */
  kinds: VoucherKind[];
  saveKind(kind: { id?: string; what: string; cost: number }): Promise<void>;
  deleteKind(kind: VoucherKind): Promise<void>;
  /** Gasta comidas en un vale; a la pareja le llega el aviso */
  redeem(kind: VoucherKind): Promise<Voucher>;
  /** Vales que mi pareja ha canjeado y aún no he visto (para el aviso) */
  incoming: Voucher[];
  markSeen(voucher: Voucher): Promise<void>;
  complete(voucher: Voucher): Promise<void>;
  /** Marcador de quién cocina más, de más a menos */
  scores: Score[];
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
  const { author } = useData();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [reward, setReward] = useState<PantryItem | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [kinds, setKinds] = useState<VoucherKind[]>([]);

  const loadKinds = useCallback(() => {
    store.listVoucherKinds().then(setKinds, () => setKinds([]));
  }, []);
  const known = useRef<Set<string> | null>(null);

  const loadVouchers = useCallback(async () => {
    try {
      const list = await store.listVouchers();
      // Si la app está en segundo plano y hay permiso, también avisa con una notificación del sistema
      if (known.current) {
        for (const v of list) {
          if (!v.mine && !known.current.has(v.id) && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('MajoChef', { body: oweText(v.title, v.author), icon: `${import.meta.env.BASE_URL}icon-192.png` });
          }
        }
      }
      known.current = new Set(list.map((v) => v.id));
      setVouchers(list);
    } catch {
      setVouchers([]);
    }
  }, []);

  const loadScores = useCallback(() => {
    store.listScores(author).then(setScores, () => setScores([]));
  }, [author]);

  useEffect(() => {
    store.listPantry().then(setItems, () => setItems([]));
    loadScores();
    loadVouchers();
    loadKinds();
    // Al volver a la pestaña, por si la otra persona ha cocinado o canjeado un vale
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      loadScores();
      loadVouchers();
      loadKinds();
    };
    document.addEventListener('visibilitychange', onVisible);
    // Y al momento, mientras la app está abierta
    const stop = store.watchVouchers(loadVouchers);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      stop();
    };
  }, [loadScores, loadVouchers, loadKinds]);

  const saveKind = useCallback(
    async (kind: { id?: string; what: string; cost: number }) => {
      const saved = await store.saveVoucherKind(kind);
      setKinds((list) => (kind.id ? list.map((k) => (k.id === saved.id ? saved : k)) : [...list, saved]).sort((a, b) => a.cost - b.cost));
    },
    [],
  );

  const deleteKind = useCallback(async (kind: VoucherKind) => {
    await store.deleteVoucherKind(kind.id);
    setKinds((list) => list.filter((k) => k.id !== kind.id));
  }, []);

  const redeem = useCallback(
    async (kind: VoucherKind) => {
      const voucher = await store.redeemVoucher(kind, author);
      setItems(await store.listPantry());
      setVouchers((list) => [voucher, ...list.filter((v) => v.id !== voucher.id)]);
      known.current?.add(voucher.id);
      return voucher;
    },
    [author],
  );

  const markSeen = useCallback(async (voucher: Voucher) => {
    setVouchers((list) => list.map((v) => (v.id === voucher.id ? { ...v, seenAt: new Date().toISOString() } : v)));
    await store.markVoucherSeen(voucher.id);
  }, []);

  const complete = useCallback(async (voucher: Voucher) => {
    const now = new Date().toISOString();
    setVouchers((list) => list.map((v) => (v.id === voucher.id ? { ...v, status: 'cumplido', doneAt: now, seenAt: v.seenAt ?? now } : v)));
    await store.completeVoucher(voucher.id);
  }, []);

  const cook = useCallback(
    async (recipe: Recipe, at?: { day: string; slot: MealType }) => {
      const item = await store.addPantry(
        {
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          sprite: pickReward(recipe),
          day: at?.day ?? null,
          slot: at?.slot ?? null,
        },
        author,
      );
      setItems((list) => [item, ...list]);
      setReward(item);
      loadScores();
      return item;
    },
    [author, loadScores],
  );

  const uncook = useCallback(
    async (item: PantryItem) => {
      await store.removePantry(item.id);
      setItems((list) => list.filter((i) => i.id !== item.id));
      setReward((r) => (r?.id === item.id ? null : r));
      loadScores();
    },
    [loadScores],
  );

  const value = useMemo<PantryContextValue>(
    () => ({
      items,
      available: items.filter((i) => !i.voucherId),
      vouchers,
      kinds,
      saveKind,
      deleteKind,
      redeem,
      incoming: vouchers.filter((v) => !v.mine && !v.seenAt && v.status === 'pendiente'),
      markSeen,
      complete,
      scores,
      cook,
      uncook,
      cookedAt: (day, slot, recipeId) => items.find((i) => i.day === day && i.slot === slot && i.recipeId === recipeId),
      reward,
      dismissReward: () => setReward(null),
    }),
    [items, vouchers, kinds, saveKind, deleteKind, redeem, markSeen, complete, scores, cook, uncook, reward],
  );

  return <PantryContext.Provider value={value}>{children}</PantryContext.Provider>;
}
