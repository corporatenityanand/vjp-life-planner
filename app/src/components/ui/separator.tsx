import * as React from "react";
import * as S from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";
export const Separator = React.forwardRef<React.ElementRef<typeof S.Root>, React.ComponentPropsWithoutRef<typeof S.Root>>(({ className, orientation = "horizontal", decorative = true, ...p }, ref) => (
  <S.Root ref={ref} decorative={decorative} orientation={orientation} className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className)} {...p} />));
Separator.displayName = "Separator";
