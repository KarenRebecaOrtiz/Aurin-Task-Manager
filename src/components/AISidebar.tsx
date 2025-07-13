'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import SafeImage from "@/components/ui/SafeImage";
import { useUser, User } from "@clerk/nextjs";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  setDoc,
  getDocs,
  doc,

} from "firebase/firestore";
import { getGenerativeModel, HarmCategory, HarmBlockThreshold, Part } from "@firebase/ai";
import { db, ai, appCheck } from "@/lib/firebase";
import { gsap } from "gsap";
import styles from "./AISidebar.module.scss";
import InputAI from "./ui/InputAI";
import Loader from '@/components/Loader';
import { useAuth } from '@/contexts/AuthContext';

// Extender la interfaz User de Clerk para incluir id
declare module "@clerk/nextjs" {
  interface User {
    id: string;
  }
}

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

interface Client {
  id: string;
  name: string;
  imageUrl: string;
  projectCount: number;
  projects: string[];
  createdAt: string;
  createdBy: string;
}

interface Task {
  id: string;
  title: string;
  createdBy: string;
  clientId: string;
  project: string;
  description: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: string;
  priority: string;
  LeadedBy: string[];
  AssignedTo: string[];
  budget: number;
  hours: number;
  objectives?: string;
  methodology?: string;
  risks?: string;
  mitigation?: string;
  stakeholders?: string;
  messages: AIMessage[];
}

interface TaskData {
  clientId: string;
  project: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  priority: string;
  LeadedBy: string[];
  AssignedTo: string[];
  budget: string | number;
  hours: string | number;
}

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const AISidebar: React.FC<AISidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useUser();
  const { isAdmin, isLoading } = useAuth();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Optimización: Consolidar todos los useEffect de scroll en uno solo
  useEffect(() => {
    if (!chatRef.current || !messages.length || !isOpen) return;

    const chat = chatRef.current;
    const scrollThreshold = 50;
    const isNearBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight < scrollThreshold;
    const lastMessage = messages[messages.length - 1];

    // Scroll automático si:
    // 1. El último mensaje es del usuario
    // 2. El usuario está cerca del final del chat
    // 3. Es el primer mensaje
    if (lastMessage.sender === "user" || isNearBottom || messages.length === 1) {
      requestAnimationFrame(() => {
        if (chatRef.current) {
          chatRef.current.scrollTo({
            top: chatRef.current.scrollHeight,
            behavior: messages.length === 1 ? "auto" : "smooth",
          });
        }
      });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const currentSidebar = sidebarRef.current;
    if (!currentSidebar) return;
    if (isOpen) {
      gsap.fromTo(
        currentSidebar,
        { x: "100%", opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: "power2.out" },
      );
    } else {
      gsap.to(currentSidebar, {
        x: "100%",
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: onClose,
      });
    }
    return () => {
      if (currentSidebar) {
        gsap.killTweensOf(currentSidebar);
      }
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Prevenir cierre si se está enviando un mensaje
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node) && isOpen && !isSending) {
        gsap.to(sidebarRef.current, {
          x: "100%",
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: onClose,
        });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, isSending]);

  useEffect(() => {
    if (!isOpen || !user?.id) {
      setError(!user?.id ? "Usuario no autenticado." : null);
      return;
    }

    if (!isAdmin) {
      setError("Solo administradores pueden usar este chat. Contacta a tu administrador para obtener acceso.");
      return;
    }

    setIsConnecting(true);
    const conversationId = `ai_${user.id}`;
    const messagesRef = collection(db, "ai_conversations", conversationId, "messages");
    const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const data: AIMessage[] = snapshot.docs.map((d) => {
          const m = d.data();
          return {
            id: d.id,
            userId: m.userId,
            text: m.text || "",
            sender: m.sender,
            timestamp: m.timestamp || null,
            isPending: m.isPending || false,
            hasError: m.hasError || false,
            imageUrl: m.imageUrl || null,
            fileUrl: m.fileUrl || null,
            fileName: m.fileName || null,
            fileType: m.fileType || null,
            filePath: m.filePath || null,
          };
        });
        const uniqueMessages = data.filter((msg, index, self) => index === self.findIndex((m) => m.id === msg.id));
        setMessages((prev) => {
          const pendingMessages = prev.filter((msg) => msg.isPending);
          const updatedMessages = [...pendingMessages, ...uniqueMessages.filter((msg) => !msg.isPending)];
          const messageMap = new Map<string, AIMessage>();
          updatedMessages.forEach((msg) => messageMap.set(msg.id, msg));
          return Array.from(messageMap.values());
        });
        setError(null);
        setIsConnecting(false);
      },
      (error) => {
        console.error("[AISidebar] Firestore messages listener error:", error, "[Error Code: FS-001]");
        setError("No se pudo cargar la conversación. Por favor, recarga la página. [Error Code: FS-001]");
        setIsConnecting(false);
      },
    );

    return () => unsubscribe();
  }, [isOpen, user?.id, isAdmin]);

  const getClients = useCallback(
    async (options: { forGemini?: boolean } = {}) => {
      try {
        const clientsRef = collection(db, "clients");
        const snapshot = await getDocs(clientsRef);
        const clients: Client[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            imageUrl: data.imageUrl,
            projectCount: data.projectCount,
            projects: data.projects,
            createdAt: data.createdAt,
            createdBy: data.createdBy,
          };
        });
        console.log("[AISidebar] Fetched clients:", clients, "[Debug Code: CLIENT-001]");
        return options.forGemini && !isAdmin ? [] : clients;
      } catch (error) {
        console.error("[AISidebar] Failed to fetch clients:", error, "[Error Code: CLIENT-002]");
        return [];
      }
    },
    [isAdmin],
  );

  const getTasks = useCallback(
    async (userId: string, options: { forGemini?: boolean } = {}) => {
      try {
        const tasksRef = collection(db, "tasks");
        const snapshot = await getDocs(tasksRef);
        const tasks: Task[] = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const messagesRef = collection(db, "tasks", doc.id, "messages");
            const messagesSnapshot = await getDocs(messagesRef);
            const messages: AIMessage[] = messagesSnapshot.docs.map((msgDoc) => {
              const msgData = msgDoc.data();
              return {
                id: msgDoc.id,
                userId: msgData.userId,
                text: msgData.text || "",
                sender: msgData.sender,
                timestamp: msgData.timestamp || null,
                isPending: msgData.isPending || false,
                hasError: msgData.hasError || false,
                imageUrl: msgData.imageUrl || null,
                fileUrl: msgData.fileUrl || null,
                fileName: msgData.fileName || null,
                fileType: msgData.fileType || null,
                filePath: msgData.filePath || null,
              };
            });
            return {
              id: doc.id,
              title: data.title || "Tarea sin título",
              createdBy: data.createdBy,
              clientId: data.clientId || "",
              project: data.project || "",
              description: data.description || "",
              startDate: data.startDate || Timestamp.now(),
              endDate: data.endDate || Timestamp.now(),
              status: data.status || "Por comenzar",
              priority: data.priority || "Baja",
              LeadedBy: data.LeadedBy || [],
              AssignedTo: data.AssignedTo || [],
              budget: data.budget || 0,
              hours: data.hours || 0,
              objectives: data.objectives || "",
              methodology: data.methodology || "",
              risks: data.risks || "",
              mitigation: data.mitigation || "",
              stakeholders: data.stakeholders || "",
              messages,
            };
          }),
        );
        console.log("[AISidebar] Fetched tasks:", tasks, "[Debug Code: TASK-001]");
        return options.forGemini && !isAdmin ? [] : tasks.filter((task) => task.createdBy === userId);
      } catch (error) {
        console.error("[AISidebar] Failed to fetch tasks:", error, "[Error Code: TASK-002]");
        return [];
      }
    },
    [isAdmin],
  );

  const createTaskFromGemini = useCallback(
    async (taskData: TaskData, user: User) => {
      if (!isAdmin) return;
      try {
        // Validación mejorada de datos numéricos
        const budget = parseFloat(taskData.budget.toString());
        const hours = parseInt(taskData.hours.toString());
        
        if (isNaN(budget) || budget < 0) {
          throw new Error("Presupuesto inválido. Debe ser un número positivo. [Error Code: TASK-CREATE-002]");
        }
        
        if (isNaN(hours) || hours < 0) {
          throw new Error("Horas inválidas. Debe ser un número entero positivo. [Error Code: TASK-CREATE-003]");
        }

        const taskDocRef = doc(collection(db, "tasks"));
        const taskId = taskDocRef.id;
        await setDoc(taskDocRef, {
          ...taskData,
          CreatedBy: user.id,
          createdAt: serverTimestamp(),
          id: taskId,
          budget,
          hours,
          startDate: taskData.startDate ? Timestamp.fromDate(new Date(taskData.startDate)) : Timestamp.now(),
          endDate: taskData.endDate ? Timestamp.fromDate(new Date(taskData.endDate)) : Timestamp.now(),
        });
      } catch (error) {
        console.error("[AISidebar] Failed to create task:", error, "[Error Code: TASK-CREATE-001]");
        throw error instanceof Error ? error : new Error("Error al crear la tarea [Error Code: TASK-CREATE-001]");
      }
    },
    [isAdmin],
  );

  const handleSendMessage = useCallback(
    async (messageData: Partial<AIMessage>, file?: File) => {
      if (!user?.id || isSending || !isAdmin) return;

      setIsSending(true);
      setError(null);
      const conversationId = `ai_${user.id}`;
      
      // Mejora en la generación de tempId usando solo UUID y timestamp
      const tempId = `${crypto.randomUUID()}-${Date.now()}`;

      const optimisticMessage: AIMessage = {
        id: tempId,
        userId: user.id,
        text: messageData.text || "",
        sender: "user",
        timestamp: Timestamp.fromDate(new Date()),
        isPending: true,
        hasError: messageData.hasError || false,
        imageUrl: messageData.imageUrl || null,
        fileUrl: messageData.fileUrl || null,
        fileName: messageData.fileName || null,
        fileType: messageData.fileType || null,
        filePath: messageData.filePath || null,
      };

      setMessages((prev) => {
        const messageMap = new Map(prev.map((msg) => [msg.id, msg]));
        if (!messageMap.has(tempId)) {
          messageMap.set(tempId, optimisticMessage);
        }
        return Array.from(messageMap.values());
      });
      console.log("[AISidebar] Sending message with tempId:", tempId, "[Debug Code: MSG-001]");

      try {
        // Validación crítica de AppCheck
        if (!appCheck) {
          throw new Error("App Check no está inicializado. La funcionalidad no está disponible por seguridad. [Error Code: APPCHECK-003]");
        }

        await setDoc(
          doc(db, "ai_conversations", conversationId),
          {
            userId: user.id,
            createdAt: serverTimestamp(),
            lastMessage: messageData.text || "Archivo subido",
            lastMessageTimestamp: serverTimestamp(),
          },
          { merge: true },
        );

        const messageDocRef = await addDoc(collection(db, "ai_conversations", conversationId, "messages"), {
          userId: user.id,
          text: messageData.text || null,
          sender: "user",
          timestamp: serverTimestamp(),
          isPending: false,
          hasError: messageData.hasError || false,
          imageUrl: messageData.imageUrl || null,
          fileUrl: messageData.fileUrl || null,
          fileName: messageData.fileName || null,
          fileType: messageData.fileType || null,
          filePath: messageData.filePath || null,
        });

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? { ...msg, id: messageDocRef.id, isPending: false, timestamp: Timestamp.now() }
              : msg,
          ),
        );

        const tasks = await getTasks(user.id, { forGemini: true });
        const clients = await getClients({ forGemini: true });
        let imagePart: Part | undefined;

        if (file && messageData.imageUrl && file.type.startsWith("image/")) {
          try {
            const base64Image = await fileToGenerativePart(file);
            imagePart = { inlineData: { data: base64Image, mimeType: file.type } };
            console.log("[AISidebar] Image converted to base64 for Gemini:", file.name, "[Debug Code: IMG-001]");
          } catch (error) {
            console.error("[AISidebar] Failed to convert image to base64:", error, "[Error Code: IMG-002]");
            throw new Error("Error al procesar la imagen para Gemini [Error Code: IMG-002]");
          }
        }

        // Configuración más flexible de Gemini
        const geminiConfig = {
          maxOutputTokens: parseInt(process.env.NEXT_PUBLIC_GEMINI_MAX_TOKENS || "500"),
          temperature: parseFloat(process.env.NEXT_PUBLIC_GEMINI_TEMPERATURE || "0.7"),
          topK: parseInt(process.env.NEXT_PUBLIC_GEMINI_TOP_K || "40"),
          topP: parseFloat(process.env.NEXT_PUBLIC_GEMINI_TOP_P || "0.9"),
        };

        const prompt = `Eres un asistente útil que puede procesar texto e imágenes. Con base en la siguiente información: ${JSON.stringify({ tasks, clients })}, responde al prompt del usuario: "${messageData.text || "Analiza el archivo adjunto"}". Si se incluye una imagen, analízala y relaciónala con el contexto del prompt. Si el usuario pide crear una tarea, genera un JSON con los campos: clientId, project, name, description, startDate, endDate, status, priority, LeadedBy, AssignedTo, budget, hours. Devuelve la respuesta en texto claro o JSON si aplica.`;
        console.log("[AISidebar] Generated prompt:", prompt, "[Debug Code: PROMPT-001]");

        const safetySettings = [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ];

        const systemInstruction = "Eres Gemini, un asistente útil y amigable. Responde de manera clara y concisa. Puedes procesar imágenes y crear tareas si se te solicita.";

        let textResponse: string;
        try {
          const model = getGenerativeModel(ai, {
            model: "gemini-2.5-flash",
            generationConfig: geminiConfig,
            safetySettings,
            systemInstruction,
          });
          const result = await model.generateContent(imagePart ? [prompt, imagePart] : [prompt]);
          console.log("[AISidebar] Raw response from Gemini API:", result, "[Debug Code: RESP-RAW-001]");

          if (!result || !result.response || !result.response.text) {
            throw new Error("Respuesta inválida de la API de Gemini [Error Code: API-001]");
          }

          textResponse = result.response.text();
          console.log("[AISidebar] Received response from Gemini API:", textResponse, "[Debug Code: RESP-001]");
        } catch (error) {
          console.error("[AISidebar] Gemini API error:", error, "[Error Code: API-002]");
          throw new Error(`Error al llamar a la API de Gemini: ${error instanceof Error ? error.message : "Desconocido"} [Error Code: API-002]`);
        }

        try {
          const jsonResponse = JSON.parse(textResponse);
          if (jsonResponse.clientId && jsonResponse.name) {
            await createTaskFromGemini(jsonResponse, user);
            textResponse = "Tarea creada exitosamente. " + (jsonResponse.description || "");
          }
        } catch {
          console.log("[AISidebar] Response is not JSON, treating as plain text:", textResponse, "[Debug Code: RESP-002]");
        }

        await addDoc(collection(db, "ai_conversations", conversationId, "messages"), {
          userId: user.id,
          text: textResponse,
          sender: "ai",
          timestamp: serverTimestamp(),
          isPending: false,
          hasError: false,
          imageUrl: messageData.imageUrl || null,
          fileUrl: messageData.fileUrl || null,
          fileName: messageData.fileName || null,
          fileType: messageData.fileType || null,
          filePath: messageData.filePath || null,
        });

        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        console.error("[AISidebar] Failed to send message:", errorMessage, `[Error Code: ${errorMessage.includes("API") ? errorMessage.split("[")[1]?.split("]")[0] || "API-003" : "GEN-001"}]`);
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? { ...msg, isPending: false, hasError: true } : msg)),
        );
        setError(`No se pudo enviar el mensaje: ${errorMessage}`);
      } finally {
        setIsSending(false);
        console.log("[AISidebar] Message handling completed.", "[Debug Code: MSG-002]");
      }
    },
    [user, isSending, isAdmin, getClients, getTasks, createTaskFromGemini],
  );

  const fileToGenerativePart = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result?.toString().split(",")[1];
        if (result) {
          resolve(result);
        } else {
          reject(new Error("No se pudo convertir el archivo a base64 [Error Code: BASE64-001]"));
        }
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo [Error Code: BASE64-002]"));
      reader.readAsDataURL(file);
    });
  };

  if (!isMounted) {
    return null;
  }

  if (isLoading) {
    return <Loader />;
  }

  if (!user) {
    return (
      <div className={`${styles.container} ${isOpen ? styles.open : ""}`} ref={sidebarRef}>
        <div className={styles.header}>
          <div className={styles.controls}>
            <div
              className={styles.arrowLeft}
              onClick={() =>
                gsap.to(sidebarRef.current, {
                  x: "100%",
                  opacity: 0,
                  duration: 0.3,
                  ease: "power2.in",
                  onComplete: onClose,
                })
              }
            >
              <Image src="/arrow-left.svg" alt="Cerrar" width={15} height={16} />
            </div>
            <div className={styles.breadcrumb}>Gemini</div>
          </div>
          <div className={styles.title}>Asistente de Proyectos</div>
          <div className={styles.description}>
            Consulta cualquier dato de tus tareas, cuentas o deadlines.
          </div>
        </div>
        <div className={styles.error}>Debes iniciar sesión para usar el asistente.</div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${isOpen ? styles.open : ""}`} ref={sidebarRef}>
      <div className={styles.header}>
        <div className={styles.controls}>
          <div
            className={styles.arrowLeft}
            onClick={() =>
              gsap.to(sidebarRef.current, {
                x: "100%",
                opacity: 0,
                duration: 0.3,
                ease: "power2.in",
                onComplete: onClose,
              })
            }
          >
            <Image src="/arrow-left.svg" alt="Cerrar" width={15} height={16} />
          </div>
          <div className={styles.breadcrumb}>Gemini</div>
        </div>
        <div className={styles.title}>Asistente de Proyectos</div>
        <div className={styles.description}>
          Consulta cualquier dato de tus tareas, cuentas o deadlines.
        </div>
      </div>

      <div className={styles.chat} ref={chatRef}>
        {error && <div className={styles.error}>{error}</div>}
        {isConnecting && (
          <div className={styles.connecting}>
            <Loader />
            <span>Conectando con el asistente...</span>
          </div>
        )}
        {!isLoading && !isConnecting && messages.length === 0 && (
          <div className={styles.noMessages}>
            <div className={styles.welcomeMessage}>
              <Image 
                src="https://storage.googleapis.com/aurin-plattform/assets/gemini-icon-logo-png_seeklogo-611605.png" 
                alt="Gemini" 
                width={48} 
                height={48} 
                className={styles.geminiIcon}
              />
              <h3>¡Hola! Soy tu asistente de proyectos</h3>
              <p>Puedo ayudarte a:</p>
              <ul>
                <li>Consultar información de tus tareas y clientes</li>
                <li>Crear nuevas tareas automáticamente</li>
                <li>Analizar imágenes y documentos</li>
                <li>Responder preguntas sobre deadlines y presupuestos</li>
              </ul>
              <p>¡Empieza escribiendo un mensaje!</p>
            </div>
          </div>
        )}
        {messages.map((m, index) => {
          const isUser = m.sender === "user";
          const senderName = isUser ? (user.firstName || "Tú") : "Gemini";
          const avatarSrc = isUser
            ? user.imageUrl || "/user-avatar.png"
            : "https://storage.googleapis.com/aurin-plattform/assets/gemini-icon-logo-png_seeklogo-611605.png";

          return (
            <div
              key={`${m.id}-${index}`}
              data-message-id={m.id}
              className={`${styles.message} ${m.isPending ? styles.pending : ""} ${m.hasError ? styles.error : ""}`}
              ref={index === messages.length - 1 ? lastMessageRef : null}
            >
              <Image
                src={avatarSrc}
                alt={senderName}
                width={46}
                height={46}
                className={styles.avatar}
                onError={(e) => {
                  e.currentTarget.src = isUser
                    ? "/user-avatar.png"
                    : "https://storage.googleapis.com/aurin-plattform/assets/gemini-icon-logo-png_seeklogo-611605.png";
                }}
              />
              <div className={styles.messageContent}>
                <div className={styles.messageHeader}>
                  <span className={styles.sender}>{senderName}</span>
                  <span className={styles.timestamp}>
                    {m.timestamp instanceof Timestamp
                      ? m.timestamp.toDate().toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "America/Mexico_City",
                        })
                      : "Enviando..."}
                  </span>
                </div>
                <div className={styles.text}>
                  {m.hasError && (
                    <div className={styles.errorBadge}>
                      <Image src="/circle-x.svg" alt="Error" width={16} height={16} />
                      Error al enviar mensaje
                    </div>
                  )}
                  {m.text &&
                    m.text.split("\n").map((line, i) => (
                      <span key={i}>
                        {line}
                        <br />
                      </span>
                    ))}
                </div>
                {m.imageUrl && (
                  <SafeImage 
                    src={m.imageUrl} 
                    alt="Adjunto" 
                    width={200} 
                    height={200} 
                    className={styles.image}
                    maxRetries={3}
                    fallbackSrc="/empty-image.png"
                  />
                )}
                {m.fileUrl && (
                  <div className={styles.file}>
                    <a href={m.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Image src="/file.svg" alt="Archivo" width={16} height={16} />
                      <span>{m.fileName}</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <InputAI
        onSendMessage={handleSendMessage}
        isSending={isSending}
        containerRef={sidebarRef}
        isAdmin={isAdmin}
        user={user}
        onError={setError}
      />
    </div>
  );
};

export default AISidebar;