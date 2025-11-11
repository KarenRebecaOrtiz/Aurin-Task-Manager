"use client"

import { useState, useCallback, useRef } from "react"
import type { QueryDocumentSnapshot } from "firebase/firestore"
import { useChatStore } from "../stores/chatStore"
import { firebaseService } from "../services/firebaseService"

export function useMessagePagination(pageSize = 50) {
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null)
  const isLoadingRef = useRef(false)

  const { messages, hasMoreMessages, isLoadingMore, setMessages, setHasMoreMessages, setIsLoadingMore } = useChatStore()

  const loadMoreMessages = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreMessages) return

    isLoadingRef.current = true
    setIsLoadingMore(true)

    try {
      const { messages: newMessages, lastDoc: newLastDoc } = await firebaseService.loadMessages(
        pageSize,
        lastDoc || undefined,
      )

      if (newMessages.length < pageSize) {
        setHasMoreMessages(false)
      }

      // Prepend older messages (since we're loading in reverse chronological order)
      setMessages([...newMessages.reverse(), ...messages])
      setLastDoc(newLastDoc)
    } catch (error) {
      console.error("Error loading messages:", error)
    } finally {
      isLoadingRef.current = false
      setIsLoadingMore(false)
    }
  }, [hasMoreMessages, lastDoc, messages, pageSize, setHasMoreMessages, setIsLoadingMore, setMessages])

  const initialLoad = useCallback(async () => {
    if (messages.length > 0) return

    setIsLoadingMore(true)

    try {
      const { messages: initialMessages, lastDoc: initialLastDoc } = await firebaseService.loadMessages(pageSize)

      setMessages(initialMessages.reverse())
      setLastDoc(initialLastDoc)

      if (initialMessages.length < pageSize) {
        setHasMoreMessages(false)
      }
    } catch (error) {
      console.error("Error loading initial messages:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [messages.length, pageSize, setHasMoreMessages, setIsLoadingMore, setMessages])

  return {
    loadMoreMessages,
    initialLoad,
    isLoadingMore,
    hasMoreMessages,
  }
}
