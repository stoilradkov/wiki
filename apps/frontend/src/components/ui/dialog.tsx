import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@wiki/frontend/lib/utils";
import { Button } from "@wiki/frontend/components/ui/button";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-60 bg-black/55" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-60 w-[min(100%-40px,560px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border-[0.5px] border-[var(--border-em)] bg-surface-2 p-5 shadow-[0_18px_80px_rgba(0,0,0,0.35)] outline-none",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close asChild>
          <Button
            aria-label="Close"
            className="absolute right-4 top-4"
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-3.75" />
          </Button>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-1 pr-10", className)} {...props} />;
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("font-serif text-display-sm font-normal leading-tight", className)}
      {...props}
    />
  );
}
