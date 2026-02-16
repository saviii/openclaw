import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight">Kairo</h1>
        <p className="mt-4 text-xl text-gray-600">
          Your AI co-pilot for product management. Triage bugs from Slack, create Jira tickets
          automatically.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/sign-up"
            className="rounded-lg bg-black px-6 py-3 text-white font-medium hover:bg-gray-800"
          >
            Get Started
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg border border-gray-300 px-6 py-3 font-medium hover:bg-gray-100"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
