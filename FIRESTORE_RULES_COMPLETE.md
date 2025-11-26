rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Function to check if the user is an admin
    function isAdmin() {
      return request.auth != null &&
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.access == 'admin';
    }

    // Function to check if user is involved in a task (assigned, leading, or created)
    function isInvolvedInTask(taskId) {
      return request.auth != null && (
        request.auth.uid in get(/databases/$(database)/documents/tasks/$(taskId)).data.AssignedTo ||
        request.auth.uid in get(/databases/$(database)/documents/tasks/$(taskId)).data.LeadedBy ||
        request.auth.uid == get(/databases/$(database)/documents/tasks/$(taskId)).data.CreatedBy
      );
    }

    // Function to check if user can access summary by taskId
    function canAccessSummary(summaryId) {
      return request.auth != null && (
        isAdmin() || 
        (summaryId.matches('.*_.*') && 
         exists(/databases/$(database)/documents/tasks/$(summaryId.split('_')[0])) &&
         isInvolvedInTask(summaryId.split('_')[0]))
      );
    }

    // Advices collection
    match /advices/{adviceId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.creatorId == request.auth.uid;
      allow delete: if request.auth != null && resource.data.creatorId == request.auth.uid;
    }

    // ==================== NOTAS (Módulo Notes) ====================
    // Todos los usuarios pueden crear, leer y eliminar sus propias notas
    match /notes/{noteId} {
      // Permitir lectura de todas las notas (filtrado de expiración en cliente)
      allow read: if request.auth != null;
      
      // Permitir crear nota si el usuario está autenticado
      allow create: if request.auth != null &&
                       request.auth.uid == request.resource.data.userId &&
                       request.resource.data.content.size() <= 120 &&
                       request.resource.data.content.size() > 0;
      
      // Permitir eliminar solo la propia nota
      allow delete: if request.auth != null &&
                       request.auth.uid == resource.data.userId;
      
      // No permitir actualizar (las notas son inmutables)
      allow update: if false;
    }

    // Notifications collection
    match /notifications/{notificationId} {
      // Admins pueden ver todas las notificaciones, usuarios solo las suyas
      allow read, list: if request.auth != null && (isAdmin() || resource.data.recipientId == request.auth.uid);
      
      // Crear notificaciones: validar estructura
      allow create: if request.auth != null && 
                    request.resource.data.keys().hasAll(['userId', 'recipientId', 'message', 'timestamp', 'read']) &&
                    request.resource.data.userId == request.auth.uid &&
                    request.resource.data.recipientId is string &&
                    request.resource.data.recipientId != '' &&
                    request.resource.data.read == false &&
                    request.resource.data.timestamp != null;
      
      // Actualizar/eliminar: destinatario o admin
      allow update, delete: if request.auth != null && 
                           (resource.data.recipientId == request.auth.uid || isAdmin());
    }

    // Tasks collection 
    match /tasks/{taskId} {
      // Solo admins o usuarios involucrados pueden leer tareas
      allow read: if request.auth != null && (isAdmin() || isInvolvedInTask(taskId));
      
      // Para list (consultas), permitir solo a admins por seguridad
      // El filtrado detallado se maneja en el frontend
      allow list: if request.auth != null;
      
      // Todos los usuarios autenticados pueden crear tareas
      allow create: if request.auth != null && 
                    request.resource.data.CreatedBy == request.auth.uid;
      
      // Admins pueden editar/eliminar cualquier tarea, 
      // usuarios pueden editar tareas donde están involucrados
      // PERMITIR ACTUALIZACIÓN DE lastViewedBy y unreadCountByUser para usuarios involucrados
      allow update: if isAdmin() || 
                    (request.auth != null && isInvolvedInTask(taskId)) ||
                    (request.auth != null && 
                     (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastViewedBy', 'unreadCountByUser', 'hasUnreadUpdates']) ||
                      request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastViewedBy']) ||
                      request.resource.data.diff(resource.data).affectedKeys().hasOnly(['unreadCountByUser']) ||
                      request.resource.data.diff(resource.data).affectedKeys().hasOnly(['hasUnreadUpdates'])));
      
      // Solo admins pueden eliminar tareas
      allow delete: if isAdmin();

      // Mensajes en tareas - REGLAS SIMPLIFICADAS Y CORREGIDAS
      match /messages/{messageId} {
        // Todos los usuarios autenticados pueden leer mensajes
        allow read, list: if request.auth != null;
        
        // PERMITIR CREACIÓN: Usuarios autenticados
        //    - Mensajes normales: senderId debe ser el del usuario
        //    - Mensajes de agente (Gemini): permitir si el usuario está involucrado en la tarea
        allow create: if request.auth != null && (
                       request.resource.data.senderId == request.auth.uid ||
                       (request.resource.data.senderId == 'gemini' && isInvolvedInTask(taskId))
                     );
        
        // PERMITIR EDICIÓN/ELIMINACIÓN: Admins o el autor del mensaje
        allow update, delete: if request.auth != null && 
                             (isAdmin() || resource.data.senderId == request.auth.uid);
      }

      // Timers en tareas
      match /timers/{userId} {
        // Todos los usuarios autenticados pueden leer timers
        allow read: if request.auth != null;
        
        // Admins o el propio usuario
        allow write: if request.auth != null && 
                    (isAdmin() || request.auth.uid == userId);
      }

      // Typing indicators en tareas
      match /typing/{userId} {
        // Todos los usuarios autenticados pueden leer typing
        allow read: if request.auth != null;
        
        // Admins o el propio usuario
        allow write: if request.auth != null && 
                    (isAdmin() || request.auth.uid == userId);
      }
    }

    // Clients collection
    match /clients/{clientId} {
      allow read: if request.auth != null;
      allow create, update, delete: if isAdmin();
    }

    // Users collection
    match /users/{userId} {
      // Todos pueden leer usuarios (para ver status)
      allow read: if request.auth != null;
      // Solo el dueño o admin puede crear/modificar
      allow create, update: if request.auth != null && 
                           (request.auth.uid == userId || isAdmin());
    }

    // Todos collection - REGLAS SIMPLIFICADAS
    match /todos/{todoId} {
      // Usuarios pueden leer sus propios todos
      allow read: if request.auth != null && 
                  resource.data.userId == request.auth.uid;
      
      // Usuarios autenticados pueden crear sus propios todos
      allow create: if request.auth != null && 
                   request.resource.data.userId == request.auth.uid;
      
      // Usuarios pueden actualizar sus propios todos
      allow update: if request.auth != null && 
                   resource.data.userId == request.auth.uid;
      
      // Usuarios pueden eliminar sus propios todos
      allow delete: if request.auth != null && 
                   resource.data.userId == userId;
    }

    // AI Conversations collection - PERMITIR ACCESO A USUARIOS INVOLUCRADOS EN TAREAS
    match /ai_conversations/{conversationId} {
      // Permitir acceso si el usuario está involucrado en la tarea relacionada
      allow read, write: if request.auth != null && (
        isAdmin() || 
        // Verificar si la conversación está relacionada con una tarea donde el usuario está involucrado
        (resource.data.taskId != null && isInvolvedInTask(resource.data.taskId))
      );
      
      match /messages/{messageId} {
        allow read, create: if request.auth != null && (
          isAdmin() || 
          (resource.data.taskId != null && isInvolvedInTask(resource.data.taskId))
        );
        allow update, delete: if request.auth != null && (
          isAdmin() || 
          (resource.data.taskId != null && isInvolvedInTask(resource.data.taskId))
        );
      }
    }

    // Conversations collection - REGLAS SIMPLIFICADAS
    match /conversations/{conversationId} {
      // ✅ PERMITIR LECTURA: Todos los usuarios autenticados pueden leer conversaciones
      allow read, list: if request.auth != null;
      
      // ✅ PERMITIR CREACIÓN: Todos los usuarios autenticados pueden crear conversaciones
      allow create: if request.auth != null && 
                    request.resource.data.participants.size() == 2 &&
                    request.auth.uid in request.resource.data.participants;
      
      // ✅ PERMITIR ACTUALIZACIÓN: Todos los participantes pueden actualizar
      allow update: if request.auth != null;
      
      match /messages/{messageId} {
        // ✅ PERMITIR LECTURA: Todos los usuarios autenticados pueden leer mensajes
        allow read: if request.auth != null;
        
        // ✅ PERMITIR CREACIÓN: Todos los usuarios autenticados pueden crear mensajes
        allow create: if request.auth != null && 
                     request.resource.data.senderId == request.auth.uid;
        
        // ✅ PERMITIR EDICIÓN/ELIMINACIÓN: Admins, autor del mensaje, o participantes para marcar como leído
        allow update, delete: if request.auth != null && 
                             (isAdmin() || 
                              resource.data.senderId == request.auth.uid ||
                              request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants);
      }
      
      match /typing/{userId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Email Limits collection - Para control de límites de email por usuario
    match /emailLimits/{userId} {
      // ✅ PERMITIR LECTURA: Solo el propio usuario puede leer sus límites
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // ✅ PERMITIR ESCRITURA: Solo el propio usuario puede crear/actualizar sus límites
      allow create, update: if request.auth != null && request.auth.uid == userId;
      
      // ✅ PERMITIR ELIMINACIÓN: Solo admins pueden eliminar límites
      allow delete: if isAdmin();
    }

    // Summaries collection - Para almacenar resúmenes generados por Gemini
    match /summaries/{summaryId} {
      // Permitir acceso a admins o usuarios involucrados en la tarea relacionada
      // El summaryId tiene formato: taskId_interval (ej: task123_1week)
      allow read, write: if canAccessSummary(summaryId);
    }
  }
}
