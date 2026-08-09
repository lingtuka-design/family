import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addPage, updatePage, deletePage, fetchChildren, fetchPages } from "../api/client";
import type { StoryPage } from "../types";

type Status = "idle" | "saving" | "success" | "error";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

export function AdminForm() {
  const queryClient = useQueryClient();

  const { data: childrenList } = useQuery({
    queryKey: ["children"],
    queryFn: fetchChildren,
  });

  const dynamicChildren = childrenList?.map((c) => c.name) ?? [];

  const [selectedChild, setSelectedChild] = useState<string>("");
  const [customChild, setCustomChild] = useState<string>("");

  const activeChildName = selectedChild === "__new__" ? customChild.trim() : selectedChild.trim();

  // Query pages for selected child
  const { data: activeChildPages, isLoading: isLoadingPages } = useQuery({
    queryKey: ["pages", activeChildName.toLowerCase()],
    queryFn: () => fetchPages(activeChildName.toLowerCase()),
    enabled: Boolean(activeChildName),
  });

  // Add Page Form State
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [story, setStory] = useState("");
  const [bg, setBg] = useState("#FFFFFF");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  // Edit Page Modal State
  const [editingPage, setEditingPage] = useState<StoryPage | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStory, setEditStory] = useState("");
  const [editBg, setEditBg] = useState("#FFFFFF");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editStatus, setEditStatus] = useState<Status>("idle");
  const [editMessage, setEditMessage] = useState("");

  async function handleAddSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!activeChildName) {
      setStatus("error");
      setMessage("Please choose a child name or enter a new child's name.");
      return;
    }
    if (!title.trim()) {
      setStatus("error");
      setMessage("Heading Title is required (e.g. VENA A PIANG).");
      return;
    }
    if (!file) {
      setStatus("error");
      setMessage("Please select a photo/image file.");
      return;
    }
    if (!story.trim()) {
      setStatus("error");
      setMessage("Please write the story text.");
      return;
    }

    const form = new FormData();
    form.set("child_name", activeChildName);
    form.set("title", title.trim());
    form.set("story_text", story.trim());
    form.set("bg_color", bg);
    form.set("image", file);

    setStatus("saving");
    try {
      const result = await addPage(form);
      setStatus("success");
      setMessage(`Successfully saved page ${result.page_number} for ${activeChildName}!`);
      queryClient.invalidateQueries({ queryKey: ["children"] });
      queryClient.invalidateQueries({ queryKey: ["pages", activeChildName.toLowerCase()] });

      setTitle("");
      setFile(null);
      setStory("");
      const input = document.getElementById("image-input") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    }
  }

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
      queryClient.invalidateQueries({ queryKey: ["pages", activeChildName.toLowerCase()] });
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
      queryClient.invalidateQueries({ queryKey: ["pages", activeChildName.toLowerCase()] });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <div className="mt-8 space-y-10">
      {/* 1. Child Selection / Addition Section */}
      <div className="rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-lg shadow-sky-50 backdrop-blur">
        <label className="mb-2 block text-sm font-bold text-slate-800" htmlFor="child-select">
          Select or Add Child:
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            id="child-select"
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
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
              onChange={(e) => setCustomChild(e.target.value)}
              placeholder="Enter child's name (e.g. Vena, Kimi, Mia)"
              className={`${inputClass} max-w-sm`}
            />
          )}
        </div>
      </div>

      {/* 2. Add New Page Form */}
      <form
        onSubmit={handleAddSubmit}
        className="space-y-6 rounded-3xl border border-white bg-white/90 p-8 shadow-xl shadow-slate-100 backdrop-blur"
      >
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-900">
            Post / Add New Page {activeChildName ? `for ${activeChildName}` : ""}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Fill in the heading title, story text, photo, and background color.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* HEADING TITLE INPUT */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-bold text-slate-800" htmlFor="page-title">
              Heading Title <span className="text-rose-500">*</span>{" "}
              <span className="font-normal text-slate-400">(e.g. VENA A PIANG)</span>
            </label>
            <input
              id="page-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VENA A PIANG"
              className={`${inputClass} font-serif font-bold italic tracking-wide text-base border-sky-200 focus:border-sky-500`}
            />
          </div>

          {/* Photo / Image Upload */}
          <div className="sm:col-span-1">
            <label className="mb-1.5 block text-sm font-bold text-slate-800" htmlFor="image-input">
              Photo / Image <span className="text-rose-500">*</span>{" "}
              <span className="font-normal text-slate-400">(JPG, PNG, WEBP)</span>
            </label>
            <input
              id="image-input"
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

          {/* Background Color */}
          <div className="sm:col-span-1">
            <label className="mb-1.5 block text-sm font-bold text-slate-800" htmlFor="bg-color">
              Page Background Color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="bg-color"
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
              />
              <input
                type="text"
                value={bg}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) setBg(v.toUpperCase());
                }}
                className={`${inputClass} w-28 font-mono`}
              />
            </div>
          </div>

          {/* Story Text Area */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-bold text-slate-800" htmlFor="story-text">
              Story Text <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="story-text"
              rows={6}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Vena hi kum 2021 September ni 13 khan Ebenezer Hospital-ah a piang a..."
              className={`${inputClass} resize-y font-serif leading-relaxed text-base`}
            />
          </div>
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
            {status === "saving" ? "Saving…" : "Save / Post Page"}
          </button>
        </div>
      </form>

      {/* 3. Existing Pages Management List */}
      {activeChildName && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900">
            Existing Pages for <span className="text-sky-600">{activeChildName}</span>
          </h3>

          {isLoadingPages && <p className="text-slate-400">Loading pages…</p>}

          {activeChildPages && activeChildPages.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              No pages added for {activeChildName} yet.
            </div>
          )}

          {activeChildPages && activeChildPages.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2">
              {activeChildPages.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col justify-between rounded-2xl border border-white bg-white/90 p-5 shadow-lg shadow-slate-100 backdrop-blur"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="h-16 w-16 rounded-lg object-cover border border-slate-200"
                      />
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
                          Page {p.page_number}
                        </span>
                        <h4 className="font-serif text-base font-black italic text-slate-900">
                          {p.title || "Untitled Page"}
                        </h4>
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-3 font-serif text-sm leading-relaxed text-slate-600">
                      {p.story_text}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => startEditing(p)}
                      className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      ✏️ Edit Page
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="rounded-lg bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
                className="text-slate-400 hover:text-slate-600 font-bold"
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
                  className={`${inputClass} font-serif font-bold italic`}
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
                  className={`${inputClass} font-serif leading-relaxed`}
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

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
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
