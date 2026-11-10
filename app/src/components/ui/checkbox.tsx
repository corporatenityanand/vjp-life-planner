import * as React from "react";
import * as C from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
export const Checkbox = React.forwardRef<React.ElementRef<typeof C.Root>, React.ComponentPropsWithoutRef<typeof C.Root>>(({ className, ...props }, ref) => (
  <C.Root ref={ref} className={cn("peer h-5 w-5 shrink-0 rounded-[5px] border-2 border-muted-foreground/50 shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white", className)} {...props}>
    <C.Indicator className="flex items-center justify-center text-current"><Check className="h-3.5 w-3.5" strokeWidth={3} /></C.Indicator>
  </C.Root>));
Checkbox.displayName = "Checkbox";
