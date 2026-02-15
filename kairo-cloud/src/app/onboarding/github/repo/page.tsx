"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Repo = {
  full_name: string;
  name: string;
  owner: { login: string };
  private: boolean;
  description: string | null;
};

export default function GitHubRepoPickerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/github/repos")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setRepos(data.repos || []);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load repositories");
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");

    const [owner, repo] = selected.split("/");

    try {
      const res = await fetch("/api/auth/github/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save repository");
        return;
      }

      router.push(from === "settings" ? "/settings" : "/onboarding/deploy");
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-sm text-gray-500 mb-2">Step 3 of 4</div>
        <h1 className="text-3xl font-bold">Select a Repository</h1>
        <p className="mt-3 text-gray-600">Choose the repository Kairo should track.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
              Loading repositories...
            </div>
          ) : repos.length === 0 && !error ? (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
              No repositories found.
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700">Repository</label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select a repository...</option>
                {repos.map((r) => (
                  <option key={r.full_name} value={r.full_name}>
                    {r.full_name}
                    {r.private ? " (private)" : ""}
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
            className="w-full rounded-lg bg-gray-900 px-6 py-3 text-white font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
