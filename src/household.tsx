import { createContext, useContext } from 'react';
import { DEFAULT_SETTINGS, type Household, type HouseholdPatch, type HouseholdSettings } from './lib/household';

interface HouseholdContextValue {
  household: Household;
  /** Guarda un cambio del espacio (ajustes, reinicio del marcador) para los dos */
  update(patch: HouseholdPatch): Promise<void>;
}

export const HouseholdContext = createContext<HouseholdContextValue | null>(null);

/** null fuera del espacio (p. ej. en el sistema de diseño) */
export function useHousehold(): HouseholdContextValue | null {
  return useContext(HouseholdContext);
}

/** Ajustes del espacio; fuera de él, los de por defecto (todo activado) */
export function useSettings(): HouseholdSettings {
  return useContext(HouseholdContext)?.household.settings ?? DEFAULT_SETTINGS;
}
