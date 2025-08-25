const admin = require('firebase-admin');

// Configuración de Firebase Admin
const serviceAccount = {
  "type": "service_account",
  "project_id": "aurinplattform",
  "private_key_id": "your_private_key_id",
  "private_key": process.env.FIREBASE_PRIVATE_KEY,
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": "your_client_id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'aurinplattform'
});

const db = admin.firestore();

async function initializeFirestore() {
  try {
    console.log('🚀 Inicializando Firestore...');

    // 1. Crear usuario admin inicial
    const adminUser = {
      uid: 'admin-user-id',
      email: 'admin@aurin.com',
      displayName: 'Admin User',
      access: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      currentLocation: {
        isOnline: true,
        status: 'available',
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }
    };

    await db.collection('users').doc(adminUser.uid).set(adminUser);
    console.log('✅ Usuario admin creado');

    // 2. Crear colección de tareas de ejemplo
    const sampleTask = {
      id: 'sample-task-1',
      title: 'Tarea de ejemplo',
      description: 'Esta es una tarea de ejemplo para probar la aplicación',
      status: 'pending',
      priority: 'medium',
      CreatedBy: adminUser.uid,
      AssignedTo: [adminUser.uid],
      LeadedBy: [adminUser.uid],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      archived: false,
      lastViewedBy: {},
      unreadCountByUser: {},
      hasUnreadUpdates: false
    };

    await db.collection('tasks').doc(sampleTask.id).set(sampleTask);
    console.log('✅ Tarea de ejemplo creada');

    // 3. Crear colección de todos de ejemplo
    const sampleTodo = {
      id: 'sample-todo-1',
      title: 'Todo de ejemplo',
      description: 'Este es un todo de ejemplo',
      completed: false,
      userId: adminUser.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completedDate: null
    };

    await db.collection('todos').doc(sampleTodo.id).set(sampleTodo);
    console.log('✅ Todo de ejemplo creado');

    // 4. Crear colección de notificaciones de ejemplo
    const sampleNotification = {
      id: 'sample-notification-1',
      userId: adminUser.uid,
      recipientId: adminUser.uid,
      message: 'Notificación de ejemplo',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      type: 'info'
    };

    await db.collection('notifications').doc(sampleNotification.id).set(sampleNotification);
    console.log('✅ Notificación de ejemplo creada');

    console.log('🎉 Firestore inicializado correctamente!');
    console.log('📝 Ahora puedes acceder a la aplicación sin errores de permisos');

  } catch (error) {
    console.error('❌ Error inicializando Firestore:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar la inicialización
initializeFirestore();
