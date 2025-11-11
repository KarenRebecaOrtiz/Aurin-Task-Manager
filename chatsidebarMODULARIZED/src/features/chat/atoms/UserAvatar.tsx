"use client"

import type React from "react"

interface UserAvatarProps {
  src?: string
  alt: string
  size?: "small" | "medium" | "large"
  isOnline?: boolean
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ src, alt, size = "medium", isOnline }) => {
  const sizeClasses = {
    small: "w-8 h-8 text-xs",
    medium: "w-10 h-10 text-sm",
    large: "w-12 h-12 text-base",
  }

  return (
    <div className={`relative ${sizeClasses[size]} flex-shrink-0`}>
      {src ? (
        <img src={src || "/placeholder.svg"} alt={alt} className="w-full h-full rounded-full object-cover" />
      ) : (
        <div className="w-full h-full rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
          {alt.charAt(0).toUpperCase()}
        </div>
      )}
      {isOnline !== undefined && (
        <div
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
            isOnline ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      )}
    </div>
  )
}
