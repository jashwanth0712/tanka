"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import * as React from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/overlays";
import { subscribeRpc } from "@/lib/rpc";
import { WalletProvider } from "@/lib/wallet/useWallet";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, retry: 2, refetchOnWindowFocus: false },
        },
      }),
  );

  // Switching RPC refetches everything from the new endpoint.
  React.useEffect(() => subscribeRpc(() => client.invalidateQueries()), [client]);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <WalletProvider>
          <MotionConfig reducedMotion="user">
            <TooltipProvider>
              {children}
              <Toaster
                position="top-center"
                toastOptions={{
                  className: "glass-strong !bg-[var(--surface-strong)] !text-text !border-border !rounded-[16px]",
                }}
              />
            </TooltipProvider>
          </MotionConfig>
        </WalletProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
