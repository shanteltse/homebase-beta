"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "./cn";
import type { ComponentPropsWithoutRef } from "react";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  onCloseAutoFocus,
  ...props
}: ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        onCloseAutoFocus={(e) => {
          onCloseAutoFocus?.(e);
          e.preventDefault();
        }}
        className={cn(
          "z-50 w-72 rounded-md border border-border bg-background p-4 shadow-md outline-none",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
