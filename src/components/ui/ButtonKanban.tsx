"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import styles from "./ButtonKanban.module.scss";
import { cn } from "@/lib/utils";

interface ButtonKanbanProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "icon";
}

const ButtonKanban = forwardRef<HTMLButtonElement, ButtonKanbanProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          styles.button,
          {
            [styles.default]: variant === "default",
            [styles.outline]: variant === "outline",
            [styles.ghost]: variant === "ghost",
            [styles.destructive]: variant === "destructive",
            [styles.sm]: size === "sm",
            [styles.icon]: size === "icon",
          },
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

ButtonKanban.displayName = "ButtonKanban";