import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-4 py-24 sm:px-6">
      <p className="font-mono text-sm text-chain">404 · no such page</p>
      <h1 className="text-4xl font-semibold sm:text-6xl">This page doesn&apos;t exist.</h1>
      <p className="text-muted">The salaries do, though. They&apos;re on Arkiv, and they&apos;re not going anywhere.</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/salaries/">Browse salaries</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
