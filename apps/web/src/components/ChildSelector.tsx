import { useQuery } from "@tanstack/react-query";
import { fetchChildren } from "../api/client";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

export function ChildSelector({
  selectedChild,
  onSelect,
  customChild,
  onCustomChange,
}: {
  selectedChild: string;
  onSelect: (value: string) => void;
  customChild: string;
  onCustomChange: (value: string) => void;
}) {
  const { data: childrenList } = useQuery({ queryKey: ["children"], queryFn: fetchChildren });
  const dynamicChildren = childrenList?.map((c) => c.name) ?? [];

  return (
    <div className="rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-lg shadow-sky-50 backdrop-blur">
      <label className="mb-2 block text-sm font-bold text-slate-800" htmlFor="child-select">
        Select or Add Child:
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          id="child-select"
          value={selectedChild}
          onChange={(e) => onSelect(e.target.value)}
          className={`${inputClass} max-w-sm font-semibold`}
        >
          <option value="">-- Choose a Child --</option>
          {dynamicChildren.map((name) => (
            <option key={name} value={name}>
              📖 {name}'s Book
            </option>
          ))}
          <option value="__new__">＋ Add a New Child…</option>
        </select>

        {selectedChild === "__new__" && (
          <input
            type="text"
            value={customChild}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder="Enter child's name (e.g. Vena, Kimi, Mia)"
            className={`${inputClass} max-w-sm`}
          />
        )}
      </div>
    </div>
  );
}
