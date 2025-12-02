"use client";

import * as React from "react";
import styles from "./label.module.scss";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={[styles.label, className].filter(Boolean).join(" ")}
      {...props}
    />
  ),
);
Label.displayName = "Label";

export { Label };
