import * as React from "react";
import * as P from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
export const Progress = React.forwardRef<React.ElementRef<typeof P.Root>, React.ComponentPropsWithoutRef<typeof P.Root> & { indicatorClassName?: string }>(({ className, value, indicatorClassName, ...props }, ref) => (
  <P.Root ref={ref} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)} {...props}>
    <P.Indicator className={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClassName)} style={{ transform: `translateX(-${100 - Math.max(0, Math.min(100, value || 0))}%)` }} />
  </P.Root>));
Progress.displayName = "Progress";
