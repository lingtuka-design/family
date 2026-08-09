import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addCover, deleteCover, fetchChildren, fetchCovers, updateCover } from "../api/client";
import type { BookCover } from "../types";

type Status = "idle" | "saving" | "success" | "error";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

export function CoverManager() {
  const queryClient = useQueryClient();

  const { data: covers } = useQuery({ queryKey: ["covers"], queryFn: fetchCovers });
  const { data: childrenList } = useQuery({ queryKey: ["children"], queryFn: fetchChildren });
  const childNames = childrenList?.map((c) => c.name) ?? [];

  const [editing, setEditing] = useState<BookCover | null>(null);
  const [child, setChild] = useState("");
  const [customChild, setCustomChild] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const resolvedChild = child === "__new__" ? customChild.trim() : child.trim();
  const coverPreview = file ? URL.createObjectURL(file) : editing?.image_url;

  function resetForm() {
    setEditing(null);
    setChild("");
    setCustomChild("");
    setFile(null);
    setStatus("idle");
    setMessage("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!resolvedChild) {
      setStatus("error");
      setMessage("Choose a child or type a new child's name.");
      return;
    }
    if (!file && !editing) {
      setStatus("error");
      setMessage("Attach a cover image (portrait 2:3 recommended).");
      return;
    }

    const form = new FormData();
    form.set("child_name", resolvedChild);
    if (file) form.set("image", file);

    setStatus("saving");
    try {
      if (editing) {
        await updateCover(editing.id, form);
        setMessage("Cover updated.");
      } else {
        await addCover(form);
        setMessage("Cover added.");
      }
      setStatus("success");
      queryClient.invalidateQueries({ queryKey: ["covers"] });
      queryClient.invalidateQueries({ queryKey: ["children"] });
      resetForm();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this book cover?")) return;
    try {
      await deleteCover(id);
      queryClient.invalidateQueries({ queryKey: ["covers"] });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <div id="covers-section" className="mt-12 scroll-mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-semibold text-slate-900">Book covers</h2>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-700">
          Home page
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Covers are shown 3-in-a-row on the home page. Use a portrait 2:3 image (e.g. 600×900 px);
        anything else is cropped to fit.
      </p>

      {/* existing covers */}
      {covers && covers.length > 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {covers.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-4 rounded-2xl border border-white bg-white/90 p-4 shadow-lg shadow-slate-100 backdrop-blur"
            >
              <img
                src={c.image_url}
                alt={c.child_name}
                className="aspect-[2/3] w-16 shrink-0 rounded-md object-cover ring-1 ring-slate-900/10"
              />
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-serif text-base font-semibold text-slate-900">
                  {c.child_name}'s Book
                </h4>
                <p className="text-xs text-slate-500">
                  {c.pageCount} page{c.pageCount === 1 ? "" : "s"}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(c);
                      setChild(c.child_name);
                      setFile(null);
                      setStatus("idle");
                      setMessage("");
                      document.getElementById("cover-form")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* add / edit cover */}
      <form
        id="cover-form"
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-3xl border border-white bg-white/80 p-6 shadow-xl shadow-slate-100 backdrop-blur"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-lg font-bold text-slate-900">
            {editing ? `Edit ${editing.child_name}'s cover` : "Add a book cover"}
          </h3>
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-semibold text-slate-400 hover:text-slate-600"
            >
              Cancel editing
            </button>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
          {/* preview in the standard cover ratio */}
          <div>
            <div className="aspect-[2/3] w-full overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-900/10">
              {coverPreview ? (
                <img src={coverPreview} alt="cover preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  no image
                </div>
              )}
            </div>
            <p className="mt-2 text-center text-xs text-slate-400">2:3 preview</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-800" htmlFor="cover-child">
                Child <span className="text-rose-500">*</span>
              </label>
              <select
                id="cover-child"
                value={editing ? editing.child_name : child}
                onChange={(e) => setChild(e.target.value)}
                className={`${inputClass} max-w-sm font-semibold`}
              >
                <option value="">-- Choose a Child --</option>
                {childNames.map((name) => (
                  <option key={name} value={name}>
                    {name}'s Book
                  </option>
                ))}
                <option value="__new__">＋ Add a New Child…</option>
              </select>

              {child === "__new__" && (
                <input
                  type="text"
                  value={customChild}
                  onChange={(e) => setCustomChild(e.target.value)}
                  placeholder="New child's name, e.g. Mia"
                  className={`${inputClass} mt-3 max-w-sm`}
                />
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-800" htmlFor="cover-image">
                Cover image{" "}
                {!editing && <span className="text-rose-500">*</span>}{" "}
                <span className="font-normal text-slate-400">
                  (JPG, PNG, WEBP, GIF — {editing ? "leave empty to keep" : "portrait 2:3"})
                </span>
              </label>
              <input
                id="cover-image"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-sky-700 hover:file:bg-sky-200`}
              />
              {file && (
                <p className="mt-1.5 text-xs text-slate-500">
                  {file.name} · {(file.size / 1024).toFixed(0)} KB
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <p
                className={`text-sm font-medium ${
                  status === "success"
                    ? "text-emerald-600"
                    : status === "error"
                    ? "text-rose-500"
                    : "text-transparent"
                }`}
                role="status"
              >
                {message}
              </p>
              <button
                type="submit"
                disabled={status === "saving"}
                className="rounded-full bg-sky-500 px-8 py-3 font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "saving" ? "Saving…" : editing ? "Save cover" : "Add cover"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
