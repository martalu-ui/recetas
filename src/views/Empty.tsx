import { useData } from '../data';

export default function Empty({ text }: { text: string }) {
  const { editRecipe } = useData();
  return (
    <div className="empty">
      <p>{text}</p>
      <button className="btn primary" onClick={() => editRecipe(null)}>
        + Subir una receta
      </button>
    </div>
  );
}
