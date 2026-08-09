import { useState } from "react";
import type { FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { addPage } from "../api/client";

const KNOWN_CHILDREN = ["Vena", "Kimi"];

type Status = "idle" | "saving" | "success" | "error";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

export function AdminForm() {
  const queryClient = useQueryClient();

  const [child, setChild] = useState("");
  const [customChild, setCustomChild] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [story, setStory] = useState("");
  const [bg, setBg] = useState("#F0F8FF");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const resolvedChild = child === "__new__" ? customChild.trim() : child.trim();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!resolvedChild) {
      setStatus("error");
      setMessage("Choose a child or type a new one.");
      return;
    }
    if (!file) {
      setStatus("error");
      setMessage("Attach a PNG image for this page.");
      return;
    }
    if (!story.trim()) {
      setStatus("error");
      setMessage("Write a little story text first.");
      return;
    }

    const form = new FormData();
    form.set("child_name", resolvedChild);
    form.set("story_text", story);
    form.set("bg_color", bg);
    form.set("image", file);

    setStatus("saving");
    try {
      const result = await addPage(form);
      setStatus("success");
      setMessage(`Saved as page ${result.page_number} of ${resolvedChild}'s book.`);
      queryClient.invalidateQueries({ queryKey: ["children"] });

      setFile(null);
      setStory("");
      const input = document.getElementById("image-input") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 space-y-6 rounded-3xl border border-white bg-white/80 p-8 shadow-xl shadow-rose-100/50 backdrop-blur">
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Child */}
        <div className="sm:col-span-1">
          <label className="mb-1.5 block text-sm font-semibold text-slate-600" htmlFor="child-select">
            Child
          </label>
          <select
            id="child-select"
            value={child}
            onChange={(e) => setChild(e.target.value)}
            className={inputClass}
          >
            <option value="">Choose a child…</option>
            {KNOWN_CHILDREN.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value="__new__">＋ Add a new child…</option>
          </select>

          {child === "__new__" && (
            <input
              type="text"
              value={customChild}
              onChange={(e) => setCustomChild(e.target.value)}
              placeholder="New child's name, e.g. Mia"
              className={`${inputClass} mt-3`}
            />
          )}
        </div>

        {/* Background color */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-600" htmlFor="bg-color">
            Page background color
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

        {/* Image upload */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-semibold text-slate-600" htmlFor="image-input">
            Portrait image <span className="font-normal text-slate-400">(PNG with transparent background)</span>
          </label>
          <input
            id="image-input"
            type="file"
            accept="image/png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-sky-700 hover:file:bg-sky-200`}
          />
          {file && <p className="mt-1.5 text-xs text-slate-500">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
        </div>

        {/* Story text */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-semibold text-slate-600" htmlFor="story-text">
            Story text
          </label>
          <textarea
            id="story-text"
            rows={6}
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Once upon a time, on a quiet little street…"
            className={`${inputClass} resize-y font-serif leading-7`}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p
          className={`text-sm font-medium ${
            status === "success" ? "text-emerald-600" : status === "error" ? "text-rose-500" : "text-transparent"
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
          {status === "saving" ? "Saving…" : "Save the page"}
        </button>
      </div>
    </form>
  );
}
