import { useState, useRef, useEffect, useCallback } from "react"
import { nanoid } from "nanoid"
import type { Message, ChatbotTranslations } from "../types"
import {
  validateFile,
  formatFileSize,
  createSessionId,
  loadSession,
  updateSessionActivity,
  isOnline as checkOnline,
} from "../utils"
import { DEFAULT_TRANSLATIONS } from "../constants"

interface UseChatOptions {
  translations?: ChatbotTranslations
  onRefreshNeeded?: () => void
}

export function useChat(options: UseChatOptions = {}) {
  const t = options.translations || DEFAULT_TRANSLATIONS

  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [sessionId, setSessionId] = useState("")
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [audioModeEnabled, setAudioModeEnabled] = useState(false)

  const hasInitialized = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  // Initialize session
  useEffect(() => {
    if (hasInitialized.current) return

    const savedSession = loadSession()

    if (savedSession && savedSession.messages.length > 0) {
      setSessionId(savedSession.sessionId)
      setMessages(savedSession.messages)
    } else {
      const newSessionId = createSessionId()
      setSessionId(newSessionId)

      const welcomeMessage: Message = {
        id: nanoid(8),
        text: t.welcome,
        sender: "bot",
        timestamp: new Date().toISOString(),
      }
      setMessages([welcomeMessage])
    }

    hasInitialized.current = true
  }, [t.welcome])

  // Online status
  useEffect(() => {
    const checkConnection = () => setIsOnline(checkOnline())

    window.addEventListener("online", checkConnection)
    window.addEventListener("offline", checkConnection)

    return () => {
      window.removeEventListener("online", checkConnection)
      window.removeEventListener("offline", checkConnection)
    }
  }, [])

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  const validateAndSetFile = useCallback((file: File) => {
    const validation = validateFile(file)
    if (!validation.isValid) {
      alert(validation.error)
      return false
    }
    setSelectedFile(file)
    return true
  }, [])

  const clearFile = useCallback(() => {
    setSelectedFile(null)
  }, [])

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() && !selectedFile) return
    if (!isOnline) {
      alert(t.noConnection)
      return
    }

    const messageText = inputValue.trim()
    let fileUrl: string | undefined
    let fileMetadata: { name: string; size: string; type: string; url: string } | undefined

    // Upload file if present
    if (selectedFile) {
      try {
        const formData = new FormData()
        formData.append("file", selectedFile)
        formData.append("type", "attachment")
        formData.append("conversationId", sessionId)

        const uploadResponse = await fetch("/api/upload-blob", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}))
          throw new Error(errorData.message || "Failed to upload file")
        }

        const uploadData = await uploadResponse.json()
        fileUrl = uploadData.data?.url || uploadData.url

        if (fileUrl) {
          fileMetadata = {
            name: selectedFile.name,
            size: formatFileSize(selectedFile.size),
            type: selectedFile.type,
            url: fileUrl,
          }
        }
      } catch (error) {
        console.error("File upload error:", error)
        alert("Error al subir el archivo. Intenta de nuevo.")
        return
      }
    }

    // Create user message
    const userMessage: Message = {
      id: nanoid(8),
      text: messageText,
      sender: "user",
      timestamp: new Date().toISOString(),
      file: fileMetadata,
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)

    if (updatedMessages.length >= 2) {
      updateSessionActivity(sessionId, updatedMessages)
    }

    setInputValue("")
    setSelectedFile(null)
    setIsTyping(true)

    try {
      const conversationHistory = updatedMessages.slice(1, -1).map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text + (msg.file ? `\n[Archivo adjunto: ${msg.file.url}]` : ""),
      }))

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          sessionId,
          fileUrl,
          conversationHistory,
          webSearch: webSearchEnabled,
          audioMode: audioModeEnabled,
          canvasMode: false,
        }),
      })

      setIsTyping(false)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage: Message = {
          id: nanoid(8),
          text: errorData.output || errorData.error || t.errorResponse,
          sender: "bot",
          timestamp: new Date().toISOString(),
        }
        const messagesWithError = [...updatedMessages, errorMessage]
        setMessages(messagesWithError)
        updateSessionActivity(sessionId, messagesWithError)
        return
      }

      const data = await response.json()
      let botResponseText = data.output || data.response || t.errorProcess

      const shouldRefresh = botResponseText.includes("[REFRESH_PAGE]")
      if (shouldRefresh) {
        botResponseText = botResponseText.replace("[REFRESH_PAGE]", "").trim()
      }

      const botMessage: Message = {
        id: nanoid(8),
        text: botResponseText,
        sender: "bot",
        timestamp: new Date().toISOString(),
      }

      const messagesWithBot = [...updatedMessages, botMessage]
      setMessages(messagesWithBot)
      updateSessionActivity(sessionId, messagesWithBot)

      if (shouldRefresh && options.onRefreshNeeded) {
        setTimeout(options.onRefreshNeeded, 2500)
      }
    } catch (error) {
      console.error("Chat error:", error)
      setIsTyping(false)

      const errorMessage: Message = {
        id: nanoid(8),
        text: t.errorGeneric,
        sender: "bot",
        timestamp: new Date().toISOString(),
      }
      const messagesWithError = [...updatedMessages, errorMessage]
      setMessages(messagesWithError)
      updateSessionActivity(sessionId, messagesWithError)
    }
  }, [inputValue, selectedFile, isOnline, sessionId, messages, webSearchEnabled, audioModeEnabled, t, options])

  const toggleWebSearch = useCallback(() => {
    setWebSearchEnabled((prev) => !prev)
  }, [])

  const toggleAudioMode = useCallback(() => {
    setAudioModeEnabled((prev) => !prev)
  }, [])

  return {
    messages,
    inputValue,
    setInputValue,
    selectedFile,
    isTyping,
    isOnline,
    webSearchEnabled,
    audioModeEnabled,
    messagesEndRef,
    validateAndSetFile,
    clearFile,
    sendMessage,
    toggleWebSearch,
    toggleAudioMode,
    scrollToBottom,
  }
}
