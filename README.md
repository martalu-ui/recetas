# 🍟 MajoChef

MajoChef: nuestra plataforma para guardar y compartir recetas entre los dos.

## Qué tiene

| Sección | Qué hace |
| --- | --- |
| 🎲 **Al azar** | Te saca un plato principal aleatorio **de los nuestros** (nunca se inventa ninguno). Se puede limitar a comida o cena. |
| 📖 **Recetas** | Todas nuestras recetas con foto, ingredientes (con cantidad), tiempo y preparación, si es plato principal o acompañamiento y si la tenemos en la Thermomix. Filtros por comida / cena, tipo de plato y Thermomix, búsqueda por nombre y orden por más recientes, nombre o más rápidas. Desde aquí se suben, editan y borran. |
| 🔍 **Buscador** | Eliges ingredientes (los que hay en casa) y ordena nuestras recetas de más a menos parecida: primero la que usa más ingredientes elegidos y, a igualdad, la que necesita menos cosas extra. Te dice qué te falta. Entiende plurales, tildes y mayúsculas («Tomates» = «tomate», «pollo» encuentra «pechuga de pollo»). |
| 📅 **Semana** | Menú semanal de lunes a domingo con comida y cena. Cada comida y cena puede tener **dos platos** (p. ej. principal + acompañamiento) y cualquiera puede ser **🥡 Sobras** de otros días o **🍽️ Comemos fuera**. Se elige de nuestras recetas (salen primero las de ese tipo y franja), con un 🎲 por plato y un botón para rellenar al azar los platos principales vacíos. Se puede ir a semanas anteriores y siguientes. |

Funciona en el móvil (la navegación pasa abajo, como una app) y tiene modo oscuro.

## Probarla en local

```bash
npm install
npm run dev
```

La app ya está conectada a nuestro proyecto de Supabase **recetas** (base de datos, fotos y login), configurado en el archivo `.env`. Para probar sin tocar los datos reales, crea un `.env.local` con `VITE_SUPABASE_URL=` y `VITE_SUPABASE_ANON_KEY=` vacíos: arrancará en **modo local** (todo se guarda solo en ese navegador).

## Supabase

El proyecto ya tiene creadas las tablas, los permisos y el almacén de fotos ([`supabase/schema.sql`](supabase/schema.sql)). Solo los usuarios con sesión iniciada pueden leer y escribir recetas y menú. Las fotos están en un bucket público (se ven con su enlace, que es imposible de adivinar).

Para gestionarlo, entra en supabase.com → proyecto **recetas**:

- **Authentication → Users → Add user → Create new user**: un usuario para cada uno (email + contraseña, marca *Auto Confirm User*).
- **Authentication → Sign In / Providers**: desactiva *Allow new users to sign up*, para que nadie más pueda crearse una cuenta.

La URL y la clave del `.env` son públicas por diseño (van dentro de la web); lo que protege los datos es el login.

## Publicarla en internet (GitHub Pages)

El flujo [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) publica la web cada vez que se sube algo a `main`.

1. **Settings → Pages → Source: GitHub Actions**.
2. Sube a `main` (o lanza el flujo a mano desde la pestaña **Actions**). La web quedará en `https://<usuario>.github.io/recetas/`.

En el móvil podéis abrirla y usar «Añadir a pantalla de inicio» para tenerla como una app.

## Desarrollo

- `npm run dev`: servidor de desarrollo
- `npm test`: tests de la lógica (buscador por ingredientes, fechas)
- `npm run build`: comprobación de tipos y build de producción en `dist/`

Hecha con React + TypeScript + Vite. Código en `src/`: `views/` son las cuatro secciones, `components/` las piezas comunes y `lib/` la lógica (`store.ts` guarda los datos en Supabase o en local, `match.ts` el buscador por ingredientes).
