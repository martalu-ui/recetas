import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Los enlaces de los emails (invitación, recuperar contraseña) vuelven con datos en el #.
// Los leemos antes de crear el cliente, que los procesa y limpia la URL.
const authHash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

/** 'invite' o 'recovery' si se ha entrado desde un enlace de email que pide elegir contraseña */
export const authLinkType = authHash.get('type');

/** Error del enlace del email (p. ej. caducado), si lo hay */
export const authLinkError = authHash.get('error_description')?.replace(/\+/g, ' ') ?? null;

/** null cuando no hay Supabase configurado → la app funciona en modo local (solo este navegador). */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

/** Dirección de la app, a la que vuelven los enlaces de los emails */
export const appUrl = () => window.location.origin + window.location.pathname;

export const PHOTO_BUCKET = 'fotos';
