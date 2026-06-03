import Link from "next/link";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  signedIn: boolean;
}

export function EmptyState({ signedIn }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <Star
        className="mb-4 size-10 text-amber-400/70"
        strokeWidth={1.5}
        aria-hidden
      />
      <h2 className="text-lg font-semibold">Your watchlist is empty</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {signedIn
          ? "Star coins from the dashboard to track them here. The list syncs across devices once you sign in."
          : "Sign in with your wallet from the top bar, then star coins to start your personal watchlist."}
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Browse dashboard</Link>
      </Button>
    </div>
  );
}
