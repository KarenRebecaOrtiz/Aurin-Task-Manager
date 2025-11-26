import { cn } from "@/lib/utils"
import Image from "next/image"

interface AvatarRingProps {
  src: string
  alt: string
  size?: "sm" | "md" | "lg"
  hasGradient?: boolean
  className?: string
}

const sizeClasses = {
  sm: "h-12 w-12",
  md: "h-14 w-14",
  lg: "h-16 w-16",
}

const innerSizeClasses = {
  sm: "h-11 w-11",
  md: "h-13 w-13",
  lg: "h-15 w-15",
}

export function AvatarRing({ src, alt, size = "md", hasGradient = false, className }: AvatarRingProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full p-[2px]",
        hasGradient ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600" : "bg-border",
        sizeClasses[size],
        className,
      )}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-background p-[2px]">
        <Image
          src={src || "/placeholder.svg"}
          alt={alt}
          width={56}
          height={56}
          className="h-full w-full rounded-full object-cover"
        />
      </div>
    </div>
  )
}
