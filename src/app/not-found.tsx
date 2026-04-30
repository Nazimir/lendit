import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-accent-400 mb-4" />
      <h1 className="text-2xl font-semibold mb-2">Not found</h1>
      <p className="text-gray-500 mb-6">That page or item doesn&apos;t exist (or isn&apos;t yours to see).</p>
      <Link href="/home" className="btn-primary">Back to home</Link>
    </main>
  );
}
