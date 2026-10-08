# 🍳 Nuestras recetas

Plataforma para guardar y compartir nuestras recetas entre los dos.

## Qué tiene

| Sección | Qué hace |
| --- | --- |
| 🎲 **Al azar** | Te saca una receta aleatoria **de las nuestras** (nunca se inventa ninguna). Se puede limitar a comida o cena. |
| 📖 **Recetas** | Todas nuestras recetas con foto, ingredientes (con cantidad), tiempo y preparación. Filtro por comida / cena, búsqueda por nombre y orden por más recientes, nombre o más rápidas. Desde aquí se suben, editan y borran. |
| 🔍 **Buscador** | Eliges ingredientes (los que hay en casa) y ordena nuestras recetas de más a menos parecida: primero la que usa más ingredientes elegidos y, a igualdad, la que necesita menos cosas extra. Te dice qué te falta. Entiende plurales, tildes y mayúsculas («Tomates» = «tomate», «pollo» encuentra «pechuga de pollo»). |
| 📅 **Semana** | Menú semanal de lunes a domingo con comida y cena. Se elige de nuestras recetas (salen primero las marcadas para esa franja), con un 🎲 por hueco y un botón para rellenar al azar todos los huecos vacíos. Se puede ir a semanas anteriores y siguientes. |

Funciona en el móvil (la navegación pasa abajo, como una app) y tiene modo oscuro.

## Probarla en local

```bash
npm install
npm run dev
```

Sin configurar nada arranca en **modo local**: todo se guarda solo en ese navegador. Sirve para probar, pero no se comparte.

## Compartirla entre los dos (Supabase, gratis)

Para que los dos veáis las mismas recetas, desde el móvil o el ordenador, la app usa [Supabase](https://supabase.com) (base de datos + fotos + login). El plan gratuito sobra.

1. Crea una cuenta en supabase.com y un proyecto nuevo.
2. Ve a **SQL Editor → New query**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y dale a **Run**. Crea las tablas, los permisos y el almacén de fotos.
3. **Authentication → Users → Add user → Create new user**: crea un usuario para cada uno (email + contraseña, marca *Auto Confirm User*).
4. **Authentication → Sign In / Providers**: desactiva *Allow new users to sign up*, para que nadie más pueda registrarse.
5. **Project Settings → API**: copia la *Project URL* y la clave *anon public*.
6. Copia `.env.example` a `.env.local` y pega esos dos valores. Al volver a arrancar `npm run dev` os pedirá iniciar sesión.

Solo los usuarios con sesión iniciada pueden leer y escribir recetas y menú. Las fotos están en un bucket público (se ven con su enlace, que es imposible de adivinar).

## Publicarla en internet (GitHub Pages)

El repositorio ya trae el flujo [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), que publica la web cada vez que se sube algo a `main`.

1. En GitHub: **Settings → Secrets and variables → Actions → New repository secret** y crea `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores del paso 5.
2. **Settings → Pages → Source: GitHub Actions**.
3. Sube a `main` (o lanza el flujo a mano desde la pestaña **Actions**). La web quedará en `https://<usuario>.github.io/recetas/`.

En el móvil podéis abrirla y usar «Añadir a pantalla de inicio» para tenerla como una app.

## Desarrollo

- `npm run dev`: servidor de desarrollo
- `npm test`: tests de la lógica (buscador por ingredientes, fechas)
- `npm run build`: comprobación de tipos y build de producción en `dist/`

Hecha con React + TypeScript + Vite. Código en `src/`: `views/` son las cuatro secciones, `components/` las piezas comunes y `lib/` la lógica (`store.ts` guarda los datos en Supabase o en local, `match.ts` el buscador por ingredientes).
