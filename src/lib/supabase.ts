import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** null cuando no hay Supabase configurado → la app funciona en modo local (solo este navegador). */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const PHOTO_BUCKET = 'fotos';
