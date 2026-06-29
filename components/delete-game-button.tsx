"use client";

export function DeleteGameButton({
  label = "Eliminar",
}: {
  label?: string;
}) {
  return (
    <button
      className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
      onClick={(event) => {
        if (!window.confirm("Eliminar este partido? Esta acción no se puede deshacer.")) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {label}
    </button>
  );
}
