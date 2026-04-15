import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <main className="min-h-screen bg-white text-[#1A1A1A] flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <p className="text-xs uppercase tracking-widest text-amber-600">404</p>
        <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="text-sm text-gray-500">
          That link doesn&rsquo;t go anywhere we recognize.
        </p>
        <Link
          to="/"
          className="inline-block mt-4 text-sm text-amber-600 hover:text-amber-700 underline underline-offset-4"
        >
          Back to the portal
        </Link>
      </div>
    </main>
  );
}
