import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deletePage, fetchPages, updatePage } from "../api/client";
import type { StoryPage } from "../types";
import { ChildSelector } from "./ChildSelector";

type Status = "idle" | "saving" | "success" | "error";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

export function PagesList({
  selectedChild,
  onSelectChild,
  customChild,
  onCustomChildChange,
}: {
  selectedChild: string;
  onSelectChild: (value: string) => void;
  customChild: string;
  onCustomChildChange: (value: string) => void;
}) {
  const queryClient = useQueryClient();
  const activeChild = selectedChild === "__new__" ? customChild.trim() : selectedChild.trim();

  const { data: pages, isLoading } = useQuery({
    queryKey: ["pages", activeChild.toLowerCase()],
    queryFn: () => fetchPages(activeChild.toLowerCase()),
    enabled: Boolean(activeChild),
  });

  const [editingPage, setEditingPage] = useState<StoryPage | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStory, setEditStory] = useState("");
  const [editBg, setEditBg] = useState("#FFFFFF");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editStatus, setEditStatus] = useState<Status>("idle");
  const [editMessage, setEditMessage] = useState("");

  function startEditing(page: StoryPage) {
    setEditingPage(page);
    setEditTitle(page.title || "");
    setEditStory(page.story_text || "");
    setEditBg(page.bg_color || "#FFFFFF");
    setEditFile(null);
    setEditStatus("idle");
    setEditMessage("");
  }

  async function handleUpdateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingPage) return;
    setEditMessage("");

    if (!editTitle.trim()) {
      setEditStatus("error");
      setEditMessage("Heading Title cannot be empty.");
      return;
    }
    if (!editStory.trim()) {
      setEditStatus("error");
      setEditMessage("Story text cannot be empty.");
      return;
    }

    const form = new FormData();
    form.set("title", editTitle.trim());
    form.set("story_text", editStory.trim());
    form.set("bg_color", editBg);
    if (editFile) form.set("image", editFile);

    setEditStatus("saving");
    try {
      await updatePage(editingPage.id, form);
      setEditStatus("success");
      setEditMessage("Page updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["pages", activeChild.toLowerCase()] });
      setTimeout(() => setEditingPage(null), 1000);
    } catch (err) {
      setEditStatus("error");
      setEditMessage(err instanceof Error ? err.message : "Update failed.");
    }
  }

  async function handleDelete(pageId: number) {
    if (!confirm("Are you sure you want to delete this page?")) return;
    try {
      await deletePage(pageId);
      queryClient.invalidateQueries({ queryKey: ["children"] });
      queryClient.invalidateQueries({ queryKey: ["pages", activeChild.toLowerCase()] });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <div className="space-y-6">
      <ChildSelector
        selectedChild={selectedChild}
        onSelect={onSelectChild}
        customChild={customChild}
        onCustomChange={onCustomChildChange}
      />

      {!activeChild && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Choose a child above to see their pages.
        </div>
      )}

      {activeChild && isLoading && <p className="text-slate-400">Loading pages…</p>}

      {activeChild && pages && pages.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No pages added for {activeChild} yet.
        </div>
      )}

      {activeChild && pages && pages.length > 0 && (
        <ul className="space-y-3">
          {pages.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-4 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-sm backdrop-blur"
            >
              {/* thumbnail only - no excerpt */}
              <img
                src={p.image_url}
                alt={p.title}
                className="h-12 w-16 shrink-0 rounded-md object-cover ring-1 ring-slate-900/10"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
                  Page {p.page_number}
                </span>
                <h4 className="truncate font-medium text-slate-900">{p.title || "Untitled Page"}</h4>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEditing(p)}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  ✏️ Edit page
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                >
                  🗑️ Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Edit Page Modal */}
      {editingPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Edit Page {editingPage.page_number} ({editingPage.child_name})
              </h3>
              <button
                type="button"
                onClick={() => setEditingPage(null)}
                className="font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="mt-6 space-y-5">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  Heading Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={`${inputClass} font-bold tracking-wide`}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  Story Text
                </label>
                <textarea
                  rows={5}
                  value={editStory}
                  onChange={(e) => setEditStory(e.target.value)}
                  className={`${inputClass} leading-relaxed`}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  Page Background Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editBg}
                    onChange={(e) => setEditBg(e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded border border-slate-200 p-1"
                  />
                  <input
                    type="text"
                    value={editBg}
                    onChange={(e) => setEditBg(e.target.value)}
                    className={`${inputClass} w-28 font-mono`}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  Replace Image <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                  className={inputClass}
                />
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
                <p
                  className={`text-sm font-medium ${
                    editStatus === "success"
                      ? "text-emerald-600"
                      : editStatus === "error"
                      ? "text-rose-500"
                      : "text-transparent"
                  }`}
                >
                  {editMessage}
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingPage(null)}
                    className="rounded-full bg-slate-100 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editStatus === "saving"}
                    className="rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
                  >
                    {editStatus === "saving" ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
