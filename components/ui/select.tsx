import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const selectVariants = cva(
  "block w-full rounded-md border text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input bg-background text-foreground",
        outline: "border border-input bg-white",
        ghost: "bg-transparent border-none",
      },
      visualSize: {
        default: "h-9 px-3 py-2",
        sm: "h-8 px-2 text-xs",
        lg: "h-10 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      visualSize: "default",
    },
  }
)

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof selectVariants> {

}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, variant, visualSize, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(selectVariants({ variant, visualSize }), className)}
        {...props}
      />
    )
  }
)
Select.displayName = "Select"
