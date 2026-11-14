import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--tt-paper)] px-4 py-10 text-[var(--tt-ink)]">
      <div className="w-full max-w-xl rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-10 text-center">
        <p className="tt-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--tt-primary)]">
          404
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--tt-ink)] sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-[var(--tt-secondary)]">
          We couldn&apos;t find the page you were looking for.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex h-[var(--tt-control-h)] items-center rounded-[var(--tt-radius)] bg-[var(--tt-primary)] px-5 text-sm font-medium text-white hover:bg-[var(--tt-primary-hover)]"
        >
          Go back to sign in
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
