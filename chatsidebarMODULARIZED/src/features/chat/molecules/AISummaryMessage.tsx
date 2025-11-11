"use client"

import type React from "react"
import sanitizeHtml from "sanitize-html"

interface AISummaryMessageProps {
  content: string
}

export const AISummaryMessage: React.FC<AISummaryMessageProps> = ({ content }) => {
  const sanitizedContent = sanitizeHtml(content, {
    allowedTags: ["b", "strong", "em", "i", "ul", "ol", "li", "p", "br"],
    allowedAttributes: {},
  })

  return (
    <div className="mx-4 my-2 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">✨</span>
        <span className="text-sm font-semibold text-purple-700">AI Summary</span>
      </div>
      <div
        className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    </div>
  )
}
