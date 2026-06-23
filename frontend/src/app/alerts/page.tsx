import { AlertList } from "@/components/alerts/AlertList";

export const metadata = {
  title: "Alerts - CryptoLens",
};

interface PageProps {
  searchParams?: Promise<{
    selected?: string | string[];
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const selected = Array.isArray(params.selected)
    ? params.selected[0]
    : (params.selected ?? null);

  return (
    <div>
      <header className="border-b border-border px-4 py-4 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GenLayer monitor records persistent incidents every 4 hours with one
          curated 10-coin batch transaction.
        </p>
      </header>
      <AlertList selectedId={selected} />
    </div>
  );
}
