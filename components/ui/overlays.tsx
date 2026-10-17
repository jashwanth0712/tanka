"use client";
// Radix-based overlays: Popover, Tooltip, Dialog, Drawer (vaul), Tabs, Slider.
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { X } from "lucide-react";
import * as React from "react";
import { Drawer as Vaul } from "vaul";
import { cn } from "@/lib/utils";

const panel = "z-50 glass-strong rounded-[18px] text-text";

/* Popover */
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(panel, "w-72 max-w-[calc(100vw-24px)] p-4 outline-none", className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

/* Tooltip */
export const TooltipProvider = TooltipPrimitive.Provider;
export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TooltipPrimitive.Root delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="z-50 max-w-64 glass-strong rounded-lg px-2.5 py-1.5 text-xs text-text"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/* Dialog */
export const Dialog = DialogPrimitive.Root;
export const DialogTitle = DialogPrimitive.Title;
export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-md" />
      <DialogPrimitive.Content
        className={cn(
          panel,
          "fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-24px)] max-w-lg -translate-x-1/2 p-0 outline-none",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text"
          aria-label="Close"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/* Drawer (bottom sheet) */
export const Drawer = Vaul.Root;
export const DrawerTrigger = Vaul.Trigger;
export const DrawerTitle = Vaul.Title;
export function DrawerContent({ className, children, ...props }: React.ComponentProps<typeof Vaul.Content>) {
  return (
    <Vaul.Portal>
      <Vaul.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-md" />
      <Vaul.Content
        className={cn(
          "glass-strong fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-[24px] outline-none",
          className,
        )}
        {...props}
      >
        <div aria-hidden className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-border" />
        {children}
      </Vaul.Content>
    </Vaul.Portal>
  );
}

/* Tabs */
export const Tabs = TabsPrimitive.Root;
export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex w-full gap-1 overflow-x-auto border-b border-border", className)}
      {...props}
    />
  );
}
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "-mb-px inline-flex h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium text-muted transition-colors hover:text-text data-[state=active]:border-accent-2 data-[state=active]:text-text cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}
export const TabsContent = TabsPrimitive.Content;

/* Slider */
export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const count = (props.value ?? props.defaultValue ?? [0]).length;
  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-11 w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-2">
        <SliderPrimitive.Range className="absolute h-full bg-gradient-primary" />
      </SliderPrimitive.Track>
      {Array.from({ length: count }, (_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={props["aria-label"] ? `${props["aria-label"]} ${i === 0 ? "min" : "max"}` : undefined}
          className="block size-5 rounded-full border-2 border-accent bg-[var(--surface-solid)] glow transition-transform hover:scale-110 cursor-grab active:cursor-grabbing"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
