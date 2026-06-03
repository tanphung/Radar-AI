import { AlertList } from "@/components/alerts/AlertList";

export const metadata = {
  title: "Alerts · CryptoLens",
};

export default function Page() {
  return (
    <div>
      <header className="border-b border-border px-4 py-4 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GenLayer monitor flags anomalies every 2 hours. Filter by your
          watchlist or browse the full cycle.
        </p>
      </header>
      <AlertList />
    </div>
  );
}
