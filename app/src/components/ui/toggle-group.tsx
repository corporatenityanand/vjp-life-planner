import * as React from "react";
import * as TG from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/utils";
export const ToggleGroup = React.forwardRef<React.ElementRef<typeof TG.Root>, React.ComponentPropsWithoutRef<typeof TG.Root>>(({ className, ...p }, ref) => <TG.Root ref={ref} className={cn("inline-flex items-center rounded-lg bg-muted p-1 gap-0.5", className)} {...p} />);
ToggleGroup.displayName = "ToggleGroup";
export const ToggleGroupItem = React.forwardRef<React.ElementRef<typeof TG.Item>, React.ComponentPropsWithoutRef<typeof TG.Item>>(({ className, ...p }, ref) => (
  <TG.Item ref={ref} className={cn("inline-flex h-7 items-center justify-center gap-1 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow", className)} {...p} />));
ToggleGroupItem.displayName = "ToggleGroupItem";
