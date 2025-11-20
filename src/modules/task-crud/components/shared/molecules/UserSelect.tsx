"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface User {
  id: string
  fullName: string
  role?: string
  imageUrl?: string
}

interface UserSelectProps {
  users: User[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
}

export function UserSelect({ 
  users, 
  value, 
  onValueChange, 
  placeholder = "Selecciona un usuario",
  className 
}: UserSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            <div className="flex items-center gap-3">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.imageUrl || "/placeholder.svg"} alt={user.fullName} />
                <AvatarFallback className="text-xs">
                  {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.fullName}</span>
                {user.role && <span className="text-xs text-muted-foreground">{user.role}</span>}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
