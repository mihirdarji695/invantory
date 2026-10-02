"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const dbMissing = /no such table|unable to open database/i.test(error.message);
  return (
    <Card>
      <EmptyState
        icon={AlertTriangle}
        title={dbMissing ? "The database isn't set up yet" : "Something went wrong loading this page"}
        description={
          dbMissing ? (
            <>Stop the app and run <code className="font-mono">npm run setup</code>, then start it again.</>
          ) : (
            "Details are in the terminal running npm run dev."
          )
        }
        action={<Button variant="secondary" onClick={reset}>Try again</Button>}
      />
    </Card>
  );
}
