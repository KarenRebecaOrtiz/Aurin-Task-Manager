"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Icon } from "../atoms/Icon"
import { UserAvatar } from "../atoms/UserAvatar"
import type { Task } from "../types/chat.types"

interface ChatHeaderProps {
  task: Task
  onBack: () => void
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ task, onBack }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const endDate = new Date(end).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    return `${startDate} - ${endDate}`
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-700",
      "in-progress": "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      "on-hold": "bg-yellow-100 text-yellow-700",
    }
    return colors[status] || "bg-gray-100 text-gray-700"
  }

  return (
    <div className="border-b border-border bg-background">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={onBack} className="p-1 rounded-full hover:bg-gray-100 transition-colors" aria-label="Back">
            <Icon name="chevron-left" size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="text-xs text-gray-500">
              {task.clientName} <span className="mx-1">/</span> {task.project}
            </div>
          </div>
        </div>
        <button className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-1.5">
          <Icon name="sparkles" size={16} />
          <span>Summary</span>
        </button>
      </div>

      {/* Task Title & Description */}
      <div className="px-4 pb-3">
        <h1 className="text-lg font-bold text-foreground mb-1">{task.name}</h1>
        <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p>
      </div>

      {/* Show Details Button */}
      <div className="px-4 pb-3">
        <button
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <span>Show Details</span>
          <motion.div animate={{ rotate: isDetailsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <Icon name="chevron-down" size={16} />
          </motion.div>
        </button>
      </div>

      {/* Collapsible Details */}
      <AnimatePresence>
        {isDetailsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="px-4 py-4 grid grid-cols-2 gap-3">
              {/* Status Card */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 font-medium mb-2">Status</div>
                <button
                  className={`w-full text-left text-sm font-medium py-1.5 px-2 rounded-md transition-colors ${getStatusColor(task.status)} hover:opacity-80`}
                >
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace("-", " ")}
                </button>
              </div>

              {/* Team Card */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 font-medium mb-2">Team</div>
                <button className="w-full text-left text-sm font-medium py-1.5 px-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {task.team.slice(0, 3).map((member) => (
                      <UserAvatar
                        key={member.id}
                        src={member.avatarUrl}
                        alt={member.name}
                        size="small"
                        className="border border-white"
                      />
                    ))}
                  </div>
                  <span>{task.team.length} members</span>
                </button>
              </div>

              {/* Dates Card */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 font-medium mb-2">Dates</div>
                <div className="text-sm font-medium text-gray-700 py-1.5 px-2">
                  {formatDateRange(task.startDate, task.endDate)}
                </div>
              </div>

              {/* Time Registered Card */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 font-medium mb-2">Time Registered</div>
                <div className="text-sm font-medium text-blue-600 py-1.5 px-2 flex items-center gap-1.5">
                  <Icon name="clock" size={16} />
                  <span>{task.totalTimeLogged || 0} hours</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
