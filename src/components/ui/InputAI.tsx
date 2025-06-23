'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useUser as ClerkUserType } from "@clerk/nextjs";
import { Timestamp } from "firebase/firestore";
import styles from "../ChatSidebar.module.scss";
import { EmojiSelector } from "./EmojiSelector";

interface AIMessage {
  id: string;
  userId: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Timestamp | null;
  isPending?: boolean;
  hasError?: boolean;
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  filePath?: string | null;
}

interface InputAIProps {
  onSendMessage: (message: Partial<AIMessage>, file?: File) => Promise<void>;
  isSending: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  isAdmin: boolean;
  user: ReturnType<typeof ClerkUserType>["user"] | null;
  onError?: (error: string) => void; // Callback para manejo centralizado de errores
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const UPLOAD_PROGRESS_THRESHOLD = 5 * 1024 * 1024; // 5 MB para mostrar progreso

const InputAI: React.FC<InputAIProps> = ({ 
  onSendMessage, 
  isSending, 
  containerRef, 
  isAdmin, 
  user, 
  onError 
}) => {
  const [message, setMessage] = useState("");
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputWrapperRef.current &&
        !inputWrapperRef.current.contains(event.target as Node)
      ) {
        // No manejamos timers aquí
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const toggleFormat = useCallback((format: string) => {
    setActiveFormats((prev) => {
      const newFormats = new Set(prev);
      if (newFormats.has(format)) {
        newFormats.delete(format);
      } else {
        newFormats.add(format);
      }
      return newFormats;
    });
  }, []);

  const applyFormatting = (text: string) => {
    let formattedText = text;
    if (activeFormats.has("bold")) formattedText = `**${formattedText}**`;
    if (activeFormats.has("italic")) formattedText = `*${formattedText}*`;
    if (activeFormats.has("underline")) formattedText = `__${formattedText}__`;
    if (activeFormats.has("code")) formattedText = `\`${formattedText}\``;
    if (activeFormats.has("bullet")) {
      formattedText = formattedText
        .split("\n")
        .map((line) => (line ? `- ${line}` : line))
        .join("\n");
    }
    if (activeFormats.has("numbered")) {
      formattedText = formattedText
        .split("\n")
        .map((line, index) => (line ? `${index + 1}. ${line}` : line))
        .join("\n");
    }
    return formattedText;
  };

  const getDisplayText = () => {
    if (!message) return "";
    let displayText = message;
    if (activeFormats.has("bullet")) {
      displayText = displayText
        .split("\n")
        .map((line) => (line ? `• ${line}` : line))
        .join("\n");
    }
    if (activeFormats.has("numbered")) {
      displayText = displayText
        .split("\n")
        .map((line, index) => (line ? `${index + 1}. ${line}` : line))
        .join("\n");
    }
    return displayText;
  };

  const getTextStyle = () => {
    const styles: React.CSSProperties = {};
    if (activeFormats.has("bold")) styles.fontWeight = "bold";
    if (activeFormats.has("italic")) styles.fontStyle = "italic";
    if (activeFormats.has("underline")) styles.textDecoration = "underline";
    if (activeFormats.has("code")) {
      styles.fontFamily = "monospace";
      styles.backgroundColor = "#f3f4f6";
      styles.padding = "2px 4px";
      styles.borderRadius = "4px";
    }
    return styles;
  };

  const handleError = useCallback((errorMessage: string) => {
    console.error("[InputAI] Error:", errorMessage);
    if (onError) {
      onError(errorMessage);
    } else {
      // Fallback a alert si no se proporciona callback
      alert(errorMessage);
    }
  }, [onError]);

  const selectFile = useCallback((f: File) => {
    if (f.size > MAX_FILE_SIZE) {
      handleError("El archivo supera los 10 MB. Por favor selecciona un archivo más pequeño.");
      return;
    }
    
    const fileExtension = f.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"];
    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      handleError(`Extensión de archivo no permitida. Extensiones válidas: ${validExtensions.join(", ")}`);
      return;
    }
    
    setFile(f);
    setPreviewUrl(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }, [handleError]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && !f.name.includes("/paperclip.svg")) {
      selectFile(f);
    }
    if (e.target) e.target.value = "";
  }, [selectFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && !f.name.includes("/paperclip.svg")) {
      selectFile(f);
    }
  }, [selectFile]);

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  const handleSend = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!user?.id || (!message.trim() && !file) || isSending || !isAdmin) {
      return;
    }

    if (!isAdmin) {
      handleError("Solo administradores pueden enviar mensajes en este chat.");
      return;
    }

    const messageData: Partial<AIMessage> = {
      userId: user.id,
      sender: "user",
      text: message.trim() ? applyFormatting(message.trim()) : null,
      timestamp: null, // Temporal, manejado en AISidebar.tsx
      isPending: true,
      hasError: false,
      imageUrl: null,
      fileUrl: null,
      fileName: file ? file.name : null,
      fileType: file ? file.type : null,
      filePath: null,
    };

    if (file) {
      try {
        setIsUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", user.id);
        formData.append("type", "message");
        formData.append("conversationId", `ai_${user.id}`);

        console.log("[InputAI] Iniciando subida de archivo:", {
          userId: user.id,
          conversationId: `ai_${user.id}`,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });

        // Simular progreso para archivos grandes
        let progressInterval: NodeJS.Timeout | null = null;
        if (file.size > UPLOAD_PROGRESS_THRESHOLD) {
          progressInterval = setInterval(() => {
            setUploadProgress(prev => Math.min(prev + 10, 90));
          }, 200);
        }

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          headers: { "x-clerk-user-id": user.id },
        });

        if (progressInterval) {
          clearInterval(progressInterval);
          setUploadProgress(100);
        }

        if (!response.ok) {
          const errorData = await response.json();
          console.error("[InputAI] Upload failed:", response.status, errorData, "[Error Code: UPLOAD-001]");
          throw new Error(errorData.error || `Error al subir archivo (${response.status})`);
        }

        const { url, fileName, fileType, filePath } = await response.json();
        console.log("[InputAI] Archivo subido exitosamente:", { url, fileName, fileType, filePath });

        if (fileName) messageData.fileName = fileName;
        if (fileType) messageData.fileType = fileType;
        if (filePath) messageData.filePath = filePath;

        if (file.type.startsWith("image/") && url) {
          messageData.imageUrl = url;
        } else if (url) {
          messageData.fileUrl = url;
        }
      } catch (error) {
        console.error("[InputAI] Error en subida de archivo:", error, "[Error Code: UPLOAD-002]");
        messageData.hasError = true;
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al subir archivo";
        handleError(`Error al subir archivo: ${errorMessage}`);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }

    try {
      await onSendMessage(messageData, file);
      setMessage("");
      setFile(null);
      setPreviewUrl(null);
      setActiveFormats(new Set());
    } catch (error) {
      console.error("[InputAI] Error al enviar mensaje:", error, "[Error Code: SEND-001]");
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      handleError(`Error al enviar mensaje: ${errorMessage}`);
    }
  };

  const formatButtons = [
    { id: "bold", icon: "/input/bold.svg", label: "Negrita", shortcut: "Ctrl+B" },
    { id: "italic", icon: "/input/italic.svg", label: "Cursiva", shortcut: "Ctrl+I" },
    { id: "underline", icon: "/input/underline.svg", label: "Subrayado", shortcut: "Ctrl+U" },
    { id: "code", icon: "/input/square-code.svg", label: "Código", shortcut: "Ctrl+`" },
    { id: "bullet", icon: "/list-bullets.svg", label: "Lista con viñetas", shortcut: "Ctrl+Shift+8" },
    { id: "numbered", icon: "/list-ordered.svg", label: "Lista numerada", shortcut: "Ctrl+Shift+7" },
  ];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      switch (e.key) {
        case "b":
          toggleFormat("bold");
          break;
        case "i":
          toggleFormat("italic");
          break;
        case "u":
          toggleFormat("underline");
          break;
        case "`":
          toggleFormat("code");
          break;
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      switch (e.key) {
        case "8":
          toggleFormat("bullet");
          break;
        case "7":
          toggleFormat("numbered");
          break;
      }
    }
  }, [toggleFormat]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <form
      className={`${styles.inputWrapper} ${isDragging ? styles.dragging : ""}`}
      ref={inputWrapperRef}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onSubmit={handleSend}
      role="form"
      aria-label="Enviar mensaje al asistente AI"
    >
      <div className={styles.inputContainer}>
        <div className={styles.toolbar} role="toolbar" aria-label="Herramientas de formato">
          {formatButtons.map(({ id, icon, label, shortcut }) => (
            <button
              key={id}
              type="button"
              className={`${styles.imageButton} ${activeFormats.has(id) ? styles.activeFormat : ""}`}
              onClick={() => toggleFormat(id)}
              disabled={isSending || isUploading}
              title={`${label} (${shortcut})`}
              aria-label={label}
              aria-pressed={activeFormats.has(id)}
              role="button"
            >
              <Image
                src={icon}
                alt=""
                width={16}
                height={16}
                className={`${styles[`${id}Svg`]} ${styles.toolbarIcon}`}
                style={{ filter: "none", fill: "#000000" }}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        {/* Indicador de progreso de subida */}
        {isUploading && (
          <div className={styles.uploadProgress}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className={styles.progressText}>
              {uploadProgress < 100 ? `Subiendo... ${uploadProgress}%` : "Procesando..."}
            </span>
          </div>
        )}

        {/* Previsualización de archivo */}
        {previewUrl && (
          <div className={styles.imagePreview} role="img" aria-label="Previsualización de imagen">
            <Image 
              src={previewUrl} 
              alt="Previsualización de imagen adjunta" 
              width={50} 
              height={50} 
              className={styles.previewImage} 
            />
            <button 
              className={styles.removeImageButton} 
              onClick={handleRemoveFile}
              aria-label="Eliminar imagen adjunta"
              type="button"
            >
              <Image 
                src="/x.svg" 
                alt="" 
                width={16} 
                height={16} 
                style={{ filter: "invert(100)" }}
                aria-hidden="true"
              />
            </button>
          </div>
        )}
        
        {file && !previewUrl && (
          <div className={styles.filePreview} role="group" aria-label="Archivo adjunto">
            <Image src="/file.svg" alt="" width={16} height={16} aria-hidden="true" />
            <span>{file.name}</span>
            <button 
              className={styles.removeImageButton} 
              onClick={handleRemoveFile}
              aria-label="Eliminar archivo adjunto"
              type="button"
            >
              <Image 
                src="/x.svg" 
                alt="" 
                width={16} 
                height={16} 
                style={{ filter: "invert(100)" }}
                aria-hidden="true"
              />
            </button>
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={getDisplayText()}
            onChange={(e) => {
              let cleanValue = e.target.value;
              if (activeFormats.has("bullet")) {
                cleanValue = cleanValue
                  .split("\n")
                  .map((line) => line.replace(/^• /, ""))
                  .join("\n");
              }
              if (activeFormats.has("numbered")) {
                cleanValue = cleanValue
                  .split("\n")
                  .map((line) => line.replace(/^\d+\. /, ""))
                  .join("\n");
              }
              setMessage(cleanValue);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isSending && !isUploading) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={isAdmin ? "Escribe tu mensaje aquí..." : "Solo administradores pueden usar este chat"}
            disabled={isSending || !isAdmin || isUploading}
            style={{
              ...getTextStyle(),
              fontFamily: '"Inter Tight", sans-serif',
            }}
            className={`${styles.input} min-h-[36px] max-h-[200px] resize-none`}
            aria-label="Mensaje para el asistente AI"
            aria-describedby="input-help"
          />
          <div id="input-help" className="sr-only">
            Presiona Enter para enviar, Shift+Enter para nueva línea
          </div>
        </div>

        <div className={styles.actions} style={{ display: "flex", justifyContent: "flex-end", gap: '15px' }}>
          <button
            type="button"
            className={styles.imageButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isUploading}
            aria-label="Adjuntar archivo"
            title="Adjuntar archivo (máx. 10MB)"
          >
            <Image
              src="/paperclip.svg"
              alt=""
              width={16}
              height={16}
              className={styles.iconInvert}
              style={{ filter: "invert(100)" }}
              aria-hidden="true"
            />
          </button>
          
          <EmojiSelector
            onEmojiSelect={(emoji) => setMessage((prev) => prev + emoji)}
            disabled={isSending || isUploading}
            value={message.match(/[\p{Emoji}\p{Emoji_Component}]+$/u)?.[0] || ""}
            containerRef={containerRef}
          />
          
          <button
            type="submit"
            className={styles.sendButton}
            disabled={isSending || (!message.trim() && !file) || !isAdmin || isUploading}
            aria-label="Enviar mensaje"
            title={!isAdmin ? "Solo administradores pueden enviar mensajes" : "Enviar mensaje"}
          >
            <Image 
              src="/arrow-up.svg" 
              alt="" 
              width={13} 
              height={13} 
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        hidden
        onChange={handleFileInputChange}
        aria-label="Seleccionar archivo para adjuntar"
        disabled={isSending || isUploading}
        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
      />
    </form>
  );
};

export default InputAI;