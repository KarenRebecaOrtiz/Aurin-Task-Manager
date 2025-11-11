"use client"

import { ChatSidebar } from "@/src/features/chat/ChatSidebar"

export default function Home() {
  // Example current user - replace with your actual auth logic
  const currentUser = {
    id: "user-1",
    name: "John Doe",
    avatarUrl: "/diverse-user-avatars.png",
  }

  return (
    <main className="flex min-h-screen">
      <div className="flex-1 flex items-center justify-center bg-muted">
        <h1 className="text-4xl font-bold">Your App Content</h1>
      </div>
      <aside className="w-[400px]">
        <ChatSidebar currentUser={currentUser} />
      </aside>
    </main>
  )
}
