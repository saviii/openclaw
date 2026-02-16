"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Project = { key: string; name: string };

export default function JiraProjectPickerPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/jira/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setProjects(data.projects || []);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load projects");
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/auth/jira/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectKey: selected }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save project");
        return;
      }

      router.push("/onboarding/github");
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-sm text-gray-500 mb-2">Step 2 of 4</div>
        <h1 className="text-3xl font-bold">Select a Jira Project</h1>
        <p className="mt-3 text-gray-600">
          Choose the default project where Kairo will create bug tickets.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
              No projects found in your Jira instance.
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700">Default Project</label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select a project...</option>
                {projects.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.key} — {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !selected}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
