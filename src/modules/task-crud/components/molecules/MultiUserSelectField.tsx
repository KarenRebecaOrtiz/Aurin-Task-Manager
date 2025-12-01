"use client"

import { useState, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/buttons"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, X } from 'lucide-react'
import { cn } from "@/lib/utils"
import type { User } from "./UserSelectField"
import { motion, AnimatePresence } from "framer-motion"

interface MultiUserSelectFieldProps {
  users: User[]
  selectedUsers?: string[]
  onSelectedUsersChange?: (users: string[]) => void
  placeholder?: string
  className?: string
}

const badgeVariants = {
  hidden: { 
    opacity: 0,
    scale: 0.8
  },
  visible: { 
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.15,
      ease: "easeOut" as const
    }
  }
}

const dropdownVariants = {
  hidden: { 
    opacity: 0,
    scale: 0.95,
    y: -5
  },
  visible: { 
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.15,
      ease: "easeOut" as const
    }
  }
}

export function MultiUserSelectField({
  users,
  selectedUsers = [],
  onSelectedUsersChange,
  placeholder = "Selecciona colaboradores",
  className
}: MultiUserSelectFieldProps) {
  const [open, setOpen] = useState(false)

  const toggleUser = useCallback((userId: string) => {
    const newSelected = selectedUsers.includes(userId)
      ? selectedUsers.filter(id => id !== userId)
      : [...selectedUsers, userId]
    onSelectedUsersChange?.(newSelected)
  }, [selectedUsers, onSelectedUsersChange])

  const removeUser = useCallback((userId: string) => {
    onSelectedUsersChange?.(selectedUsers.filter(id => id !== userId))
  }, [selectedUsers, onSelectedUsersChange])

  const handleRemoveClick = useCallback((e: React.MouseEvent<HTMLButtonElement>, userId: string) => {
    e.stopPropagation()
    removeUser(userId)
  }, [removeUser])

  const selectedUserObjects = users.filter(u => selectedUsers.includes(u.id))

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          intent="secondary"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-start h-auto min-h-10", className)}
        >
          {selectedUsers.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              <AnimatePresence mode="popLayout">
                {selectedUserObjects.map((user) => (
                  <motion.div
                    key={user.id}
                    variants={badgeVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                        <AvatarFallback className="text-[10px]">
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{user.name}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveClick(e, user.id)}
                        className="rounded-full hover:bg-background/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-2 overflow-hidden" align="start" asChild>
        <motion.div
          variants={dropdownVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="space-y-1">
            {users.map((user) => {
              const isSelected = selectedUsers.includes(user.id)
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    toggleUser(user.id)
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 hover:bg-accent text-left transition-colors"
                >
                  <div className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center transition-colors duration-200",
                    isSelected ? "bg-primary border-primary" : "border-input"
                  )}>
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                    <AvatarFallback className="text-xs">
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">{user.name}</span>
                    {user.role && <span className="text-xs text-muted-foreground">{user.role}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>
      </PopoverContent>
    </Popover>
  )
}
