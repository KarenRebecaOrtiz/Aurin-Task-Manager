"use client"

import type React from "react"
import { motion } from "framer-motion"

interface LoadMoreButtonProps {
  onClick: () => void
  isLoading: boolean
  hasMore: boolean
}

export const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({ onClick, isLoading, hasMore }) => {
  if (!hasMore) return null

  return (
    <motion.div
      className="flex items-center justify-center py-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <button
        onClick={onClick}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          <span>Load More Messages</span>
        )}
      </button>
    </motion.div>
  )
}
