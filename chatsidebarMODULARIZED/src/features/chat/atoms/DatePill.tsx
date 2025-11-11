"use client"

import type React from "react"

interface DatePillProps {
  date: string
}

export const DatePill: React.FC<DatePillProps> = ({ date }) => {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-gray-100 px-3 py-1 rounded-full">
        <span className="text-xs text-gray-600 font-medium">{date}</span>
      </div>
    </div>
  )
}
