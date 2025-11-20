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
  name: string
  role?: string
  avatar?: string
}

interface UserSelectFieldProps {
  users: User[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
}

export function UserSelectField({ 
  users, 
  value, 
  onValueChange, 
  placeholder = "Selecciona un usuario",
  className 
}: UserSelectFieldProps) {
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
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback className="text-xs">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.name}</span>
                {user.role && <span className="text-xs text-muted-foreground">{user.role}</span>}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
