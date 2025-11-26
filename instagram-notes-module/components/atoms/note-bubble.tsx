"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface NoteBubbleProps {
  content: string
  className?: string
}

export function NoteBubble({ content, className }: NoteBubbleProps) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={cn("relative", className)}
    >
      {/* Main bubble */}
      <div className="relative rounded-2xl bg-card px-3 py-2 shadow-md dark:bg-zinc-800">
        <p className="line-clamp-3 max-w-[120px] text-center text-xs leading-tight text-card-foreground">{content}</p>
      </div>

      {/* Tail/arrow pointing down */}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2">
        <div className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-card dark:border-t-zinc-800" />
      </div>
    </motion.div>
  )
}
