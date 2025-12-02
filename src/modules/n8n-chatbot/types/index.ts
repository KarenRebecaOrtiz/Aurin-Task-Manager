export interface Message {
  id: string
  text: string
  sender: "bot" | "user"
  timestamp: string
  file?: {
    name: string
    size: string
    type: string
    url: string
  }
}

export interface ChatbotState {
  isExpanded: boolean
  messages: Message[]
  inputValue: string
  selectedFile: File | null
  isTyping: boolean
  isDragging: boolean
}

export interface ChatSession {
  sessionId: string
  messages: Message[]
  createdAt: string
  lastActivity: string
}

export interface ChatbotTranslations {
  welcome: string;
  title: string;
  online: string;
  offline: string;
  openChat: string;
  minimizeChat: string;
  placeholder: string;
  send: string;
  attach: string;
  removeFile: string;
  dragFiles: string;
  maxSize: string;
  noConnection: string;
  errorGeneric: string;
  errorResponse: string;
  errorProcess: string;
  avatarAlt: string;
  botAvatarAlt: string;
}

export interface ChatbotWidgetProps {
  lang?: string;
  translations?: ChatbotTranslations;
}
