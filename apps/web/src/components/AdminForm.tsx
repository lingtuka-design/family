import { useState } from "react";
import type { FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { addPage } from "../api/client";
import { ChildSelector } from "./ChildSelector";

type Status = "idle" | "saving" | "success" | "error";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

export function AdminForm({
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

  const activeChildName = selectedChild === "__new__" ? customChild.trim() : selectedChild.trim();

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [story, setStory] = useState("");
  const [bg, setBg] = useState("#FFFFFF");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

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

  return (
    <div className="space-y-8">
      <ChildSelector
        selectedChild={selectedChild}
        onSelect={onSelectChild}
        customChild={customChild}
        onCustomChange={onCustomChildChange}
      />

      {/* Post / Add New Page Form */}
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
              className={`${inputClass} text-base font-bold tracking-wide`}
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
              className={`${inputClass} resize-y leading-relaxed text-base`}
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
    </div>
  );
}
