export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  timestamp: string; // ISO string or similar
  text?: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  replyTo?: {
    messageId: string;
    senderName: string;
    textPreview: string;
  };
  hours?: number; // For time log messages
  isPending?: boolean;
  hasError?: boolean;
}

export interface User {
  id: string;
  fullName: string;
  imageUrl: string;
  // Add other user properties as needed
}
