import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-xl bg-white p-10 text-center shadow-sm">
      <h1 className="font-display text-2xl font-bold text-charcoal">Page nahi mila (404)</h1>
      <p className="mt-2 text-sm text-ink/60">Ye page maujood nahi hai.</p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-charcoal px-5 py-2.5 text-sm font-semibold text-white"
      >
        Dashboard par wapas jao
      </Link>
    </div>
  );
}
