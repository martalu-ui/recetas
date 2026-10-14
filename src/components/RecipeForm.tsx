import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useData } from '../data';
import { compressImage } from '../lib/image';
import { allIngredients } from '../lib/match';
import { COURSE_LABEL, COURSES, MEAL_LABEL, MEAL_TYPES, type Course, type Ingredient, type MealType, type Recipe } from '../lib/types';

const EMPTY_INGREDIENT: Ingredient = { name: '', quantity: '' };

export default function RecipeForm({ recipe, onDone }: { recipe: Recipe | null; onDone(saved: Recipe | null): void }) {
  const { recipes, saveRecipe } = useData();
  const [title, setTitle] = useState(recipe?.title ?? '');
  const [mealTypes, setMealTypes] = useState<MealType[]>(recipe?.mealTypes ?? []);
  const [course, setCourse] = useState<Course>(recipe?.course ?? 'principal');
  const [thermomix, setThermomix] = useState(recipe?.thermomix ?? false);
  const [time, setTime] = useState(recipe?.timeMinutes?.toString() ?? '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients.length ? recipe.ingredients : [{ ...EMPTY_INGREDIENT }],
  );
  const [instructions, setInstructions] = useState(recipe?.instructions ?? '');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sugerir ingredientes que ya usamos ayuda a escribirlos siempre igual (y mejora el buscador)
  const knownIngredients = useMemo(() => allIngredients(recipes), [recipes]);

  const photoPreview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => void (photoPreview && URL.revokeObjectURL(photoPreview)), [photoPreview]);
  const shownPhoto = photoPreview ?? (removePhoto ? null : recipe?.photoUrl ?? null);

  function toggleMeal(t: MealType) {
    setMealTypes((list) => (list.includes(t) ? list.filter((x) => x !== t) : MEAL_TYPES.filter((x) => x === t || list.includes(x))));
  }

  function updateIngredient(idx: number, patch: Partial<Ingredient>) {
    setIngredients((list) => list.map((ing, i) => (i === idx ? { ...ing, ...patch } : ing)));
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await compressImage(file));
      setRemovePhoto(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const minutes = time.trim() ? Number(time) : null;
    if (!title.trim()) return setError('Ponle un nombre a la receta');
    if (mealTypes.length === 0) return setError('Marca si es para comida, para cena o para las dos');
    if (!ingredients.some((i) => i.name.trim())) return setError('Añade al menos un ingrediente');
    if (minutes != null && (!Number.isFinite(minutes) || minutes < 0)) return setError('El tiempo tiene que ser un número de minutos');

    setBusy(true);
    setError(null);
    try {
      const saved = await saveRecipe(
        { title, mealTypes, course, thermomix, timeMinutes: minutes == null ? null : Math.round(minutes), ingredients, instructions, photo, removePhoto },
        recipe,
      );
      onDone(saved);
    } catch (err) {
      setError(`No se ha podido guardar: ${(err as Error).message}`);
      setBusy(false);
    }
  }

  return (
    <form className="recipe-form" onSubmit={submit}>
      <h2>{recipe ? 'Editar receta' : 'Nueva receta'}</h2>

      <label className="field">
        <span>Nombre</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lentejas de la abuela" autoFocus />
      </label>

      <div className="field">
        <span>Foto</span>
        <div className="photo-input">
          {shownPhoto ? <img src={shownPhoto} alt="" /> : <div className="photo photo-empty">📷</div>}
          <div className="photo-input-actions">
            <label className="btn small">
              {shownPhoto ? 'Cambiar foto' : 'Subir foto'}
              <input type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
            </label>
            {shownPhoto && (
              <button
                type="button"
                className="btn ghost small"
                onClick={() => {
                  setPhoto(null);
                  setRemovePhoto(true);
                }}
              >
                Quitar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="field">
          <span>¿Para cuándo?</span>
          <div className="toggle-group">
            {MEAL_TYPES.map((t) => (
              <button
                type="button"
                key={t}
                className={mealTypes.includes(t) ? `toggle on tag-${t}` : 'toggle'}
                aria-pressed={mealTypes.includes(t)}
                onClick={() => toggleMeal(t)}
              >
                {MEAL_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Tipo de plato</span>
          <div className="toggle-group">
            {COURSES.map((c) => (
              <button
                type="button"
                key={c}
                className={course === c ? 'toggle on tag-course' : 'toggle'}
                aria-pressed={course === c}
                onClick={() => setCourse(c)}
              >
                {COURSE_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="field">
          <span>Thermomix</span>
          <div className="toggle-group">
            <button
              type="button"
              className={thermomix ? 'toggle on tag-thermomix' : 'toggle'}
              aria-pressed={thermomix}
              onClick={() => setThermomix((t) => !t)}
            >
              {thermomix ? '✓ Sí, la tenemos' : 'Sí, la tenemos'}
            </button>
          </div>
        </div>
        <label className="field time-field">
          <span>Tiempo (min)</span>
          <input type="number" min={0} inputMode="numeric" value={time} onChange={(e) => setTime(e.target.value)} placeholder="30" />
        </label>
      </div>

      <div className="field">
        <span>Ingredientes</span>
        <datalist id="known-ingredients">
          {knownIngredients.map((i) => (
            <option key={i} value={i} />
          ))}
        </datalist>
        <div className="ingredient-rows">
          {ingredients.map((ing, idx) => (
            <div className="ingredient-row" key={idx}>
              <input
                list="known-ingredients"
                placeholder="Ingrediente (p. ej. tomate)"
                value={ing.name}
                onChange={(e) => updateIngredient(idx, { name: e.target.value })}
                aria-label={`Ingrediente ${idx + 1}`}
              />
              <input
                className="qty"
                placeholder="Cantidad"
                value={ing.quantity}
                onChange={(e) => updateIngredient(idx, { quantity: e.target.value })}
                aria-label={`Cantidad del ingrediente ${idx + 1}`}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label="Quitar ingrediente"
                onClick={() => setIngredients((list) => (list.length > 1 ? list.filter((_, i) => i !== idx) : [{ ...EMPTY_INGREDIENT }]))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn ghost small add-ingredient" onClick={() => setIngredients((l) => [...l, { ...EMPTY_INGREDIENT }])}>
          + Añadir ingrediente
        </button>
      </div>

      <label className="field">
        <span>Preparación (opcional)</span>
        <textarea rows={6} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Pasos, trucos, notas…" />
      </label>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button type="button" className="btn ghost" onClick={() => onDone(null)} disabled={busy}>
          Cancelar
        </button>
        <button className="btn primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar receta'}
        </button>
      </div>
    </form>
  );
}
