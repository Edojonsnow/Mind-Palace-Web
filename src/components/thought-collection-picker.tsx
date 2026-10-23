import type { Collection } from "@/lib/api";

type ThoughtCollectionPickerProps = {
  collections: Collection[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function ThoughtCollectionPicker({
  collections,
  selectedIds,
  onChange,
}: ThoughtCollectionPickerProps) {
  function toggleCollection(collectionId: string) {
    onChange(
      selectedIds.includes(collectionId)
        ? selectedIds.filter((id) => id !== collectionId)
        : [...selectedIds, collectionId],
    );
  }

  return (
    <fieldset className="grid gap-2">
      <legend className="text-xs text-[var(--mp-text-3)]">Collections</legend>
      {collections.length === 0 ? (
        <p className="text-xs leading-5 text-[var(--mp-text-3)]">
          No collections yet. Create one from the sidebar before assigning this thought.
        </p>
      ) : (
        <div className="grid max-h-36 gap-1 overflow-y-auto rounded-xl border border-[var(--mp-line)] bg-[var(--mp-surface)] p-2 sm:grid-cols-2">
          {collections.map((collection) => (
            <label
              className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs text-[var(--mp-text-2)] transition-colors hover:bg-[var(--mp-lumen-soft)]"
              key={collection.id}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(collection.id)}
                onChange={() => toggleCollection(collection.id)}
              />
              <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{collection.name}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
