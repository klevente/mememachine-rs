import React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { FieldError, GlobalError } from "react-hook-form";

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    error: FieldError | undefined;
  }
  // eslint-disable-next-line react/prop-types
>(({ className, error, ...props }, ref) => {
  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      {...props}
    />
  );
});
FormLabel.displayName = "FormLabel";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    error: FieldError | GlobalError | undefined;
  }
>(({ className, children, error, ...props }, ref) => {
  const body = error ? String(error?.message) : children;

  if (!body) {
    return null;
  }

  return (
    <p
      ref={ref}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

export { FormLabel, FormMessage };
