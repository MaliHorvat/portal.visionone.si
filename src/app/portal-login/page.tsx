type PortalLoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function PortalLoginPage({ searchParams }: PortalLoginPageProps) {
  const params = await searchParams;
  const showError = params?.error === "1";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--vo-bg)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-[var(--vo-fg)]">Prijava v portal</h1>
        <p className="mt-1 text-sm text-[var(--vo-muted)]">Dostop je trenutno omejen na interne uporabnike.</p>

        <form action="/api/portal-login" method="post" className="mt-6 space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-[var(--vo-fg)]">
              Uporabniško ime
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm outline-none ring-0 placeholder:text-[var(--vo-muted)] focus:border-[var(--vo-accent)]"
              placeholder="admin"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--vo-fg)]">
              Geslo
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm outline-none ring-0 placeholder:text-[var(--vo-muted)] focus:border-[var(--vo-accent)]"
              placeholder="••••••••"
            />
          </div>

          {showError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Napačno uporabniško ime ali geslo.
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Prijavi se
          </button>
        </form>
      </div>
    </div>
  );
}
