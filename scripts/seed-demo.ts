/**
 * Seed script for Demo Firebase project
 *
 * Populates the demo Firestore with abundant, realistic sample data.
 * Run with: npx tsx scripts/seed-demo.ts
 *
 * Requires env vars:
 *   DEMO_FIREBASE_PROJECT_ID
 *   DEMO_FIREBASE_CLIENT_EMAIL
 *   DEMO_FIREBASE_PRIVATE_KEY
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// --- Configuration ---
const projectId = process.env.DEMO_FIREBASE_PROJECT_ID;
const clientEmail = process.env.DEMO_FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.DEMO_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing required env vars: DEMO_FIREBASE_PROJECT_ID, DEMO_FIREBASE_CLIENT_EMAIL, DEMO_FIREBASE_PRIVATE_KEY');
  process.exit(1);
}

const app = initializeApp({
  credential: cert({ projectId, clientEmail, privateKey } as ServiceAccount),
});

const db = getFirestore(app);

// --- Helpers ---
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000);
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86400000);
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 3600000);
}

function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60000);
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- Data ---
const USERS = [
  {
    userId: 'demo_user_001',
    email: 'demo@aurin.com',
    displayName: 'Demo User',
    profilePhoto: '',
    role: 'Admin',
    description: 'Administrador del sistema demo',
    availabilityStatus: 'Disponible',
    lastActive: new Date().toISOString(),
  },
  {
    userId: 'demo_user_002',
    email: 'maria@aurin.com',
    displayName: 'Maria Lopez',
    profilePhoto: '',
    role: 'Designer',
    description: 'UI/UX Designer - Especialista en sistemas de diseño',
    availabilityStatus: 'Disponible',
    lastActive: minutesAgo(12).toISOString(),
  },
  {
    userId: 'demo_user_003',
    email: 'carlos@aurin.com',
    displayName: 'Carlos Rivera',
    profilePhoto: '',
    role: 'Developer',
    description: 'Full-stack Developer - React & Node.js',
    availabilityStatus: 'Ocupado',
    lastActive: minutesAgo(3).toISOString(),
  },
];

const CLIENTS = [
  {
    id: 'client_001',
    name: 'TechCorp Solutions',
    imageUrl: '',
    email: 'contacto@techcorp.mx',
    phone: '+52 55 1234 5678',
    industry: 'Tecnología',
    website: 'https://techcorp.mx',
    projects: ['Website Redesign', 'Mobile App'],
    projectCount: 2,
    createdBy: 'demo_user_001',
    isActive: true,
    notes: 'Cliente premium. Reuniones los martes y jueves.',
  },
  {
    id: 'client_002',
    name: 'GreenLeaf Marketing',
    imageUrl: '',
    email: 'info@greenleaf.com',
    phone: '+52 33 9876 5432',
    industry: 'Marketing',
    website: 'https://greenleaf.com',
    projects: ['Brand Campaign', 'Newsletter', 'Social Media'],
    projectCount: 3,
    createdBy: 'demo_user_001',
    isActive: true,
    notes: 'Agencia de marketing digital. Muy detallistas con la marca.',
  },
  {
    id: 'client_003',
    name: 'Atlas Financiera',
    imageUrl: '',
    email: 'admin@atlasfinanciera.mx',
    phone: '+52 81 5555 1234',
    industry: 'Finanzas',
    projects: ['Dashboard Analytics', 'API Integration'],
    projectCount: 2,
    createdBy: 'demo_user_001',
    isActive: true,
    notes: 'Requiere alto nivel de seguridad. Todo debe pasar por aprobación.',
  },
  {
    id: 'client_004',
    name: 'Nova Retail',
    imageUrl: '',
    email: 'ops@novaretail.com',
    industry: 'E-commerce',
    projects: ['E-commerce Platform', 'Inventory System'],
    projectCount: 2,
    createdBy: 'demo_user_002',
    isActive: true,
    notes: 'Startup en crecimiento. Priorizan velocidad de entrega.',
  },
  {
    id: 'client_005',
    name: 'Meridian Health',
    imageUrl: '',
    email: 'tech@meridianhealth.mx',
    phone: '+52 55 8888 4321',
    industry: 'Salud',
    projects: ['Patient Portal'],
    projectCount: 1,
    createdBy: 'demo_user_001',
    isActive: true,
    notes: 'Regulaciones de privacidad estrictas. HIPAA compliance requerido.',
  },
];

const TASKS = [
  {
    id: 'task_001',
    clientId: 'client_001',
    project: 'Website Redesign',
    name: 'Diseñar mockups del homepage',
    description: 'Crear 3 variaciones de diseño del homepage para revisión del cliente. Incluir versiones desktop y mobile con sistema de grid responsive.',
    objectives: 'Entregar 3 opciones de diseño aprobadas por el equipo interno antes del viernes.',
    status: 'Finalizado',
    priority: 'Alta',
    LeadedBy: ['demo_user_002'],
    AssignedTo: ['demo_user_002', 'demo_user_003'],
    CreatedBy: 'demo_user_001',
    startDate: daysAgo(14),
    endDate: daysAgo(2),
  },
  {
    id: 'task_002',
    clientId: 'client_001',
    project: 'Website Redesign',
    name: 'Implementar navegación responsive',
    description: 'Desarrollar componente de navegación mobile-first con menú hamburguesa, transiciones suaves y soporte para submenu dropdown.',
    status: 'En Proceso',
    priority: 'Alta',
    LeadedBy: ['demo_user_003'],
    AssignedTo: ['demo_user_003'],
    CreatedBy: 'demo_user_001',
    startDate: daysAgo(5),
    endDate: daysFromNow(3),
  },
  {
    id: 'task_003',
    clientId: 'client_001',
    project: 'Mobile App',
    name: 'Flujo de autenticación de usuario',
    description: 'Implementar pantallas de login, registro y recuperación de contraseña con validación de formularios, manejo de errores y autenticación biométrica.',
    status: 'En Proceso',
    priority: 'Media',
    LeadedBy: ['demo_user_003'],
    AssignedTo: ['demo_user_003', 'demo_user_001'],
    CreatedBy: 'demo_user_003',
    startDate: daysAgo(7),
    endDate: daysFromNow(7),
  },
  {
    id: 'task_004',
    clientId: 'client_002',
    project: 'Brand Campaign',
    name: 'Calendario de contenido redes sociales',
    description: 'Planificar calendario de 30 días para Instagram y LinkedIn con copy, assets visuales y horarios de publicación optimizados.',
    status: 'Por Iniciar',
    priority: 'Media',
    LeadedBy: ['demo_user_002'],
    AssignedTo: ['demo_user_002'],
    CreatedBy: 'demo_user_001',
    startDate: daysFromNow(1),
    endDate: daysFromNow(14),
  },
  {
    id: 'task_005',
    clientId: 'client_002',
    project: 'Newsletter',
    name: 'Diseñar template de email newsletter',
    description: 'Crear template reutilizable de email responsive que siga las guías de marca del cliente. Compatible con Mailchimp y SendGrid.',
    status: 'Por Iniciar',
    priority: 'Baja',
    LeadedBy: ['demo_user_002'],
    AssignedTo: ['demo_user_002'],
    CreatedBy: 'demo_user_002',
    startDate: daysFromNow(3),
    endDate: daysFromNow(10),
  },
  {
    id: 'task_006',
    clientId: 'client_003',
    project: 'Dashboard Analytics',
    name: 'Widgets de dashboard de ingresos',
    description: 'Implementar gráficas de ingresos mensuales, tasa de crecimiento, proyecciones y comparativas YoY con Recharts.',
    status: 'En Proceso',
    priority: 'Alta',
    LeadedBy: ['demo_user_001'],
    AssignedTo: ['demo_user_001', 'demo_user_003'],
    CreatedBy: 'demo_user_001',
    startDate: daysAgo(10),
    endDate: daysFromNow(5),
  },
  {
    id: 'task_007',
    clientId: 'client_003',
    project: 'API Integration',
    name: 'Conectar pasarela de pagos',
    description: 'Integrar API de Stripe para procesamiento de pagos con manejo de errores, webhooks, reintentos automáticos y logging detallado.',
    status: 'Por Finalizar',
    priority: 'Alta',
    LeadedBy: ['demo_user_003'],
    AssignedTo: ['demo_user_003'],
    CreatedBy: 'demo_user_003',
    startDate: daysAgo(12),
    endDate: daysAgo(1),
  },
  {
    id: 'task_008',
    clientId: 'client_004',
    project: 'E-commerce Platform',
    name: 'Configurar catálogo de productos',
    description: 'Configurar categorías de productos, filtros avanzados, funcionalidad de búsqueda con Algolia y paginación infinita.',
    status: 'Por Iniciar',
    priority: 'Media',
    LeadedBy: ['demo_user_001'],
    AssignedTo: ['demo_user_001', 'demo_user_002'],
    CreatedBy: 'demo_user_001',
    startDate: daysFromNow(2),
    endDate: daysFromNow(15),
  },
  {
    id: 'task_009',
    clientId: 'client_004',
    project: 'E-commerce Platform',
    name: 'Revisión UX del carrito de compras',
    description: 'Revisar y mejorar la experiencia de checkout para reducir abandono de carrito. A/B testing con 3 variaciones del flujo.',
    status: 'Finalizado',
    priority: 'Alta',
    LeadedBy: ['demo_user_002'],
    AssignedTo: ['demo_user_002'],
    CreatedBy: 'demo_user_001',
    startDate: daysAgo(20),
    endDate: daysAgo(8),
  },
  {
    id: 'task_010',
    clientId: 'client_003',
    project: 'Dashboard Analytics',
    name: 'Exportar reportes a PDF',
    description: 'Agregar funcionalidad para exportar vistas del dashboard como reportes PDF con branding personalizado del cliente.',
    status: 'Backlog',
    priority: 'Baja',
    LeadedBy: ['demo_user_001'],
    AssignedTo: ['demo_user_001'],
    CreatedBy: 'demo_user_001',
    startDate: daysAgo(3),
    endDate: daysFromNow(10),
  },
  {
    id: 'task_011',
    clientId: 'client_002',
    project: 'Social Media',
    name: 'Diseñar kit de redes sociales',
    description: 'Crear templates para stories, posts y reels. Incluir guía de tipografía, paleta de colores y ejemplos de uso.',
    status: 'En Proceso',
    priority: 'Media',
    LeadedBy: ['demo_user_002'],
    AssignedTo: ['demo_user_002'],
    CreatedBy: 'demo_user_001',
    startDate: daysAgo(4),
    endDate: daysFromNow(6),
  },
  {
    id: 'task_012',
    clientId: 'client_005',
    project: 'Patient Portal',
    name: 'Sistema de citas médicas',
    description: 'Implementar módulo de agendamiento de citas con calendario, recordatorios automáticos, y notificaciones al paciente y al doctor.',
    status: 'En Proceso',
    priority: 'Alta',
    LeadedBy: ['demo_user_003'],
    AssignedTo: ['demo_user_003', 'demo_user_001'],
    CreatedBy: 'demo_user_001',
    startDate: daysAgo(6),
    endDate: daysFromNow(8),
  },
  {
    id: 'task_013',
    clientId: 'client_005',
    project: 'Patient Portal',
    name: 'Historial médico del paciente',
    description: 'Crear vista de historial médico con timeline visual, filtros por tipo de consulta y exportación a PDF.',
    status: 'Por Iniciar',
    priority: 'Alta',
    LeadedBy: ['demo_user_001'],
    AssignedTo: ['demo_user_001', 'demo_user_002'],
    CreatedBy: 'demo_user_001',
    startDate: daysFromNow(2),
    endDate: daysFromNow(12),
  },
  {
    id: 'task_014',
    clientId: 'client_004',
    project: 'Inventory System',
    name: 'Dashboard de inventario en tiempo real',
    description: 'Desarrollar dashboard con niveles de stock, alertas de reabastecimiento, y sincronización con el e-commerce.',
    status: 'Backlog',
    priority: 'Media',
    LeadedBy: ['demo_user_003'],
    AssignedTo: ['demo_user_003'],
    CreatedBy: 'demo_user_001',
    startDate: daysFromNow(5),
    endDate: daysFromNow(20),
  },
  {
    id: 'task_015',
    clientId: 'client_001',
    project: 'Website Redesign',
    name: 'Optimización de performance',
    description: 'Auditoría de Core Web Vitals, lazy loading de imágenes, code splitting y optimización de fonts. Target: LCP < 2.5s.',
    status: 'Finalizado',
    priority: 'Alta',
    LeadedBy: ['demo_user_003'],
    AssignedTo: ['demo_user_003'],
    CreatedBy: 'demo_user_003',
    startDate: daysAgo(18),
    endDate: daysAgo(10),
  },
];

// Abundant messages per task - makes conversations feel alive
const MESSAGES_PER_TASK: Record<string, Array<{ text: string; senderId: string; hoursAgo: number }>> = {
  task_001: [
    { text: 'Empiezo con los mockups del homepage hoy. Voy a usar Figma con el design system que armamos.', senderId: 'demo_user_002', hoursAgo: 320 },
    { text: 'Perfecto María. El cliente quiere algo moderno y minimalista. Les gustó mucho el estilo de Linear.', senderId: 'demo_user_001', hoursAgo: 318 },
    { text: 'Entendido! Ya tengo la primera variación lista. Es un hero con gradiente sutil y tipografía bold.', senderId: 'demo_user_002', hoursAgo: 300 },
    { text: 'Se ve increíble! El gradiente le da mucha personalidad. Puedes subir el link de Figma?', senderId: 'demo_user_001', hoursAgo: 298 },
    { text: 'Aquí va: figma.com/file/demo-homepage-v1. La segunda variación va más por el lado de glassmorphism.', senderId: 'demo_user_002', hoursAgo: 280 },
    { text: 'Carlos, ya puedes ir viendo la estructura HTML que necesitaríamos para la opción A.', senderId: 'demo_user_001', hoursAgo: 276 },
    { text: 'Ya le eché un ojo. Se puede implementar con CSS Grid sin problema. El glassmorphism requiere backdrop-filter.', senderId: 'demo_user_003', hoursAgo: 274 },
    { text: 'La tercera opción está lista! Es más corporate, con secciones bien definidas y mucho whitespace.', senderId: 'demo_user_002', hoursAgo: 250 },
    { text: 'Las 3 opciones están geniales. Yo voto por la opción B con el glassmorphism. Se siente premium.', senderId: 'demo_user_003', hoursAgo: 248 },
    { text: 'Concuerdo! La opción B es la que más encaja con la identidad de TechCorp. Voy a presentarla al cliente.', senderId: 'demo_user_001', hoursAgo: 246 },
    { text: 'El cliente aprobó la opción B! Les encantó el glassmorphism. Quieren un ajuste menor en la paleta de colores.', senderId: 'demo_user_001', hoursAgo: 200 },
    { text: 'Genial! Ajusto los colores y subo la versión final en una hora.', senderId: 'demo_user_002', hoursAgo: 199 },
    { text: 'Versión final subida. Los colores ahora están más alineados con la marca. Link actualizado en Figma.', senderId: 'demo_user_002', hoursAgo: 196 },
    { text: 'Aprobado! Cerramos esta task. Excelente trabajo equipo 🎉', senderId: 'demo_user_001', hoursAgo: 180 },
  ],
  task_002: [
    { text: 'Empiezo con el nav responsive. Voy a usar el patrón de off-canvas menu con Framer Motion para las animaciones.', senderId: 'demo_user_003', hoursAgo: 110 },
    { text: 'Suena bien. Asegúrate de que funcione con el design system que María armó.', senderId: 'demo_user_001', hoursAgo: 108 },
    { text: 'Ya tengo la estructura base. El menú hamburguesa tiene una animación de morphing bastante smooth.', senderId: 'demo_user_003', hoursAgo: 90 },
    { text: 'Puedo ver un preview? Quiero validar que las transiciones se sientan naturales.', senderId: 'demo_user_002', hoursAgo: 88 },
    { text: 'Claro, lo subí al branch feature/responsive-nav. En localhost:3000 se ve el componente aislado.', senderId: 'demo_user_003', hoursAgo: 86 },
    { text: 'Se ve muy bien! Solo sugiero que el overlay del menú tenga un blur ligero, no solo opacidad.', senderId: 'demo_user_002', hoursAgo: 82 },
    { text: 'Hecho! Agregué backdrop-blur-sm al overlay. También mejoré la accesibilidad con focus-trap.', senderId: 'demo_user_003', hoursAgo: 72 },
    { text: 'Queda pendiente el submenu dropdown para desktop. Lo tengo para mañana temprano.', senderId: 'demo_user_003', hoursAgo: 48 },
    { text: 'El dropdown ya está funcionando. Usé floating-ui para el posicionamiento automático.', senderId: 'demo_user_003', hoursAgo: 24 },
    { text: 'Probé en Safari y Chrome, todo bien. Solo en Firefox hay un issue menor con el backdrop-blur.', senderId: 'demo_user_003', hoursAgo: 20 },
    { text: 'Firefox fix deployed. Era un tema de -webkit-backdrop-filter vs backdrop-filter.', senderId: 'demo_user_003', hoursAgo: 8 },
    { text: 'Perfecto! Ya solo falta la revisión final de María para cerrar esto.', senderId: 'demo_user_001', hoursAgo: 6 },
  ],
  task_003: [
    { text: 'El flujo de login está listo. Implementé validación con Zod y manejo de errores contextual.', senderId: 'demo_user_003', hoursAgo: 160 },
    { text: 'Cómo estás manejando el estado de autenticación? Redux o Context?', senderId: 'demo_user_001', hoursAgo: 158 },
    { text: 'Zustand con persist middleware. Es más ligero y el estado se mantiene en AsyncStorage.', senderId: 'demo_user_003', hoursAgo: 156 },
    { text: 'Buena decisión. El registro ya tiene los campos que pidió el cliente?', senderId: 'demo_user_001', hoursAgo: 140 },
    { text: 'Sí: nombre, email, teléfono, y contraseña con medidor de strength. También agregué login social con Google.', senderId: 'demo_user_003', hoursAgo: 138 },
    { text: 'Revisé el PR. Todo bien pero la validación del email podría ser más estricta. Hay edge cases con dominios .co', senderId: 'demo_user_001', hoursAgo: 100 },
    { text: 'Tienes razón, actualicé el regex. Ahora valida TLD de 2-10 chars y rechaza emails temporales.', senderId: 'demo_user_003', hoursAgo: 96 },
    { text: 'La pantalla de recuperación de contraseña está lista. Envía un código de 6 dígitos por email.', senderId: 'demo_user_003', hoursAgo: 60 },
    { text: 'Y el biométrico? El cliente lo pidió como prioridad alta.', senderId: 'demo_user_001', hoursAgo: 50 },
    { text: 'Estoy en eso. Face ID funciona perfecto en iOS. Probando huella digital en Android ahora.', senderId: 'demo_user_003', hoursAgo: 30 },
    { text: 'Android listo! Touch ID y Face Unlock funcionando. El fallback a PIN también.', senderId: 'demo_user_003', hoursAgo: 12 },
    { text: 'Excelente! Voy a hacer el QA completo mañana y cerramos.', senderId: 'demo_user_001', hoursAgo: 10 },
  ],
  task_004: [
    { text: 'Ya empecé a investigar los mejores horarios de publicación para Instagram y LinkedIn.', senderId: 'demo_user_002', hoursAgo: 20 },
    { text: 'Según los datos del cliente, su audiencia está más activa entre 10am-12pm y 7pm-9pm.', senderId: 'demo_user_002', hoursAgo: 18 },
    { text: 'Perfecto, arma el calendario con esos horarios. Cuántos posts por semana?', senderId: 'demo_user_001', hoursAgo: 16 },
    { text: 'Propongo: Instagram 5/semana (3 feed + 2 stories), LinkedIn 3/semana. Les parece?', senderId: 'demo_user_002', hoursAgo: 14 },
    { text: 'Suena bien! Incluye al menos 2 reels por semana, el algoritmo de IG los favorece.', senderId: 'demo_user_001', hoursAgo: 12 },
  ],
  task_006: [
    { text: 'Implementé la gráfica de ingresos mensuales con Recharts. Se ve bien en desktop y tablet.', senderId: 'demo_user_003', hoursAgo: 230 },
    { text: 'Los datos se actualizan en real-time con los listeners de Firestore?', senderId: 'demo_user_001', hoursAgo: 228 },
    { text: 'Sí, usé onSnapshot. Los widgets se actualizan al instante cuando cambia un documento.', senderId: 'demo_user_003', hoursAgo: 226 },
    { text: 'Necesitamos ajustar los colores de las barras para que coincidan con la marca del cliente.', senderId: 'demo_user_001', hoursAgo: 210 },
    { text: 'Ajustado! Ahora usa la paleta corporativa: #1A365D para primario y #2B6CB0 para secundario.', senderId: 'demo_user_003', hoursAgo: 200 },
    { text: 'El widget de tasa de crecimiento ya está. Muestra YoY y MoM con indicadores de tendencia.', senderId: 'demo_user_001', hoursAgo: 150 },
    { text: 'Agregué tooltips interactivos en las gráficas. Muestran el desglose al hover.', senderId: 'demo_user_003', hoursAgo: 120 },
    { text: 'El cliente quiere poder cambiar entre vista mensual, trimestral y anual.', senderId: 'demo_user_001', hoursAgo: 72 },
    { text: 'Implementado con un toggle de 3 opciones. Las animaciones de transición son smooth.', senderId: 'demo_user_003', hoursAgo: 48 },
    { text: 'Falta la comparativa YoY. Necesito los datos históricos del API. Ya los tienes?', senderId: 'demo_user_003', hoursAgo: 24 },
    { text: 'Sí, el endpoint /api/analytics/revenue ya retorna data de los últimos 24 meses.', senderId: 'demo_user_001', hoursAgo: 22 },
    { text: 'Perfecto, lo conecto hoy y queda listo el dashboard completo.', senderId: 'demo_user_003', hoursAgo: 20 },
  ],
  task_007: [
    { text: 'Empecé con la integración de Stripe. Voy por el flujo de checkout primero.', senderId: 'demo_user_003', hoursAgo: 280 },
    { text: 'Usa Stripe Elements para el formulario de pago. Es más seguro que manejar datos de tarjeta nosotros.', senderId: 'demo_user_001', hoursAgo: 278 },
    { text: 'Sí, ya estoy con Elements. El PaymentIntent se crea server-side y el confirmPayment client-side.', senderId: 'demo_user_003', hoursAgo: 260 },
    { text: 'Los webhooks ya están configurados. Escucho: payment_intent.succeeded, .failed, y charge.refunded.', senderId: 'demo_user_003', hoursAgo: 240 },
    { text: 'Cómo manejas los reintentos fallidos?', senderId: 'demo_user_001', hoursAgo: 238 },
    { text: 'Exponential backoff con máximo 3 intentos. Si falla, se marca como "requires_action" y se notifica al admin.', senderId: 'demo_user_003', hoursAgo: 236 },
    { text: 'El logging está con Pino en JSON format. Cada transacción tiene un correlation ID para tracing.', senderId: 'demo_user_003', hoursAgo: 200 },
    { text: 'Testing completo: unit tests para la lógica de retry, integration tests contra Stripe test mode.', senderId: 'demo_user_003', hoursAgo: 150 },
    { text: 'Los tests pasaron todos. 98% coverage en el módulo de pagos.', senderId: 'demo_user_003', hoursAgo: 100 },
    { text: 'La integración con Stripe está completa. Webhooks configurados y testeados en staging.', senderId: 'demo_user_003', hoursAgo: 50 },
    { text: 'Excelente! Solo falta la revisión de seguridad antes de pasar a producción.', senderId: 'demo_user_001', hoursAgo: 48 },
    { text: 'Agendé la revisión para el jueves con el equipo de seguridad de Atlas.', senderId: 'demo_user_003', hoursAgo: 40 },
    { text: 'La revisión salió bien. Solo un finding menor: headers de seguridad faltantes en la respuesta del webhook.', senderId: 'demo_user_001', hoursAgo: 26 },
    { text: 'Corregido y deployed. Agregué X-Content-Type-Options, X-Frame-Options y CSP headers.', senderId: 'demo_user_003', hoursAgo: 24 },
  ],
  task_009: [
    { text: 'Empiezo la revisión UX del carrito. Primero analizo los datos de abandono actuales.', senderId: 'demo_user_002', hoursAgo: 480 },
    { text: 'Los datos muestran 68% de abandono. El mayor drop-off es en el paso de datos de envío.', senderId: 'demo_user_002', hoursAgo: 460 },
    { text: 'Eso es alto. Qué propones para mejorar?', senderId: 'demo_user_001', hoursAgo: 458 },
    { text: 'Rediseñé el checkout en 3 pasos claros: carrito → datos → confirmación. Con progress bar visual.', senderId: 'demo_user_002', hoursAgo: 440 },
    { text: 'También agregué autocompletado de dirección con Google Places API y guardado de datos para la próxima compra.', senderId: 'demo_user_002', hoursAgo: 420 },
    { text: 'Las 3 variaciones del A/B test están listas. Variante A: 3 pasos, B: single page, C: accordion.', senderId: 'demo_user_002', hoursAgo: 380 },
    { text: 'Los resultados del A/B test: Variante A ganó con 42% menos abandono! El progress bar fue clave.', senderId: 'demo_user_002', hoursAgo: 250 },
    { text: 'Increíble resultado! La tasa de conversión pasó de 32% a 54%.', senderId: 'demo_user_001', hoursAgo: 248 },
    { text: 'La tasa de abandono debería bajar bastante con este flujo. Aprobado por el cliente!', senderId: 'demo_user_001', hoursAgo: 200 },
    { text: 'Deploy en producción completado. Monitoring activo las próximas 48hrs.', senderId: 'demo_user_002', hoursAgo: 192 },
  ],
  task_011: [
    { text: 'Estoy armando el kit de redes sociales. Primer entrega: templates para feed posts.', senderId: 'demo_user_002', hoursAgo: 90 },
    { text: 'Genial! Incluye templates para carousels? El engagement es 3x mayor que posts individuales.', senderId: 'demo_user_001', hoursAgo: 88 },
    { text: 'Sí! 3 templates de carousel: educativo, producto showcase y testimonial.', senderId: 'demo_user_002', hoursAgo: 80 },
    { text: 'Los templates de stories están listos. Incluyen: encuesta, countdown, detrás de cámaras y promoción.', senderId: 'demo_user_002', hoursAgo: 50 },
    { text: 'Me falta la guía de tipografía y los templates de reels. Los tengo para el jueves.', senderId: 'demo_user_002', hoursAgo: 24 },
    { text: 'Perfecto, el cliente los necesita para la próxima semana. Vamos bien de tiempo.', senderId: 'demo_user_001', hoursAgo: 22 },
  ],
  task_012: [
    { text: 'El sistema de citas tiene la estructura base. Usé FullCalendar como componente de calendario.', senderId: 'demo_user_003', hoursAgo: 140 },
    { text: 'Recuerda que los horarios deben respetar la disponibilidad del doctor y los horarios del consultorio.', senderId: 'demo_user_001', hoursAgo: 138 },
    { text: 'Implementado. El slot picker solo muestra horarios disponibles según el schedule del doctor.', senderId: 'demo_user_003', hoursAgo: 120 },
    { text: 'Los recordatorios automáticos: email 24hrs antes, push notification 1hr antes. Ambos configurables.', senderId: 'demo_user_003', hoursAgo: 90 },
    { text: 'El paciente puede reagendar hasta 4hrs antes de la cita. Después necesita llamar.', senderId: 'demo_user_003', hoursAgo: 60 },
    { text: 'La vista del doctor muestra: agenda del día, próximas citas, y stats de consultas del mes.', senderId: 'demo_user_003', hoursAgo: 36 },
    { text: 'Falta la parte de videoconsulta. Estoy evaluando Daily.co vs Twilio Video.', senderId: 'demo_user_003', hoursAgo: 20 },
    { text: 'Daily.co tiene mejor pricing para nuestro caso. Aprobado, ve con ese.', senderId: 'demo_user_001', hoursAgo: 18 },
  ],
  task_015: [
    { text: 'Corrí Lighthouse en el sitio actual. LCP está en 4.2s, necesitamos bajarlo a <2.5s.', senderId: 'demo_user_003', hoursAgo: 430 },
    { text: 'Qué es lo que más pesa? Las imágenes?', senderId: 'demo_user_001', hoursAgo: 428 },
    { text: 'Sí, imágenes sin optimizar (3.2MB hero image!), fonts blocking render, y un bundle de 850KB.', senderId: 'demo_user_003', hoursAgo: 426 },
    { text: 'Plan: 1) Sharp para optimizar imágenes, 2) font-display: swap, 3) code splitting con dynamic imports.', senderId: 'demo_user_003', hoursAgo: 410 },
    { text: 'Imágenes optimizadas: de 3.2MB a 180KB con WebP. Lazy loading implementado.', senderId: 'demo_user_003', hoursAgo: 370 },
    { text: 'Bundle reducido de 850KB a 320KB con tree shaking y dynamic imports.', senderId: 'demo_user_003', hoursAgo: 330 },
    { text: 'Font optimization done. Subset de Google Fonts + preload. FOUT eliminado.', senderId: 'demo_user_003', hoursAgo: 290 },
    { text: 'Resultados finales de Lighthouse: LCP 1.8s, FID 12ms, CLS 0.02. Todo en verde!', senderId: 'demo_user_003', hoursAgo: 250 },
    { text: 'Increíble mejora! De 4.2s a 1.8s. El cliente va a estar muy contento.', senderId: 'demo_user_001', hoursAgo: 248 },
    { text: 'También implementé service worker para cache de assets estáticos. Segunda visita carga en <1s.', senderId: 'demo_user_003', hoursAgo: 240 },
  ],
};

// Time tracking entries per task
const TIME_TRACKING: Record<string, Array<{ userId: string; description: string; hours: number; minutes: number; date: Date }>> = {
  task_001: [
    { userId: 'demo_user_002', description: 'Investigación de tendencias y moodboard', hours: 2, minutes: 30, date: daysAgo(14) },
    { userId: 'demo_user_002', description: 'Wireframes y layout del homepage', hours: 3, minutes: 0, date: daysAgo(13) },
    { userId: 'demo_user_002', description: 'Diseño visual - Opción A (hero con gradiente)', hours: 4, minutes: 15, date: daysAgo(12) },
    { userId: 'demo_user_002', description: 'Diseño visual - Opción B (glassmorphism)', hours: 4, minutes: 0, date: daysAgo(11) },
    { userId: 'demo_user_002', description: 'Diseño visual - Opción C (corporate)', hours: 3, minutes: 45, date: daysAgo(10) },
    { userId: 'demo_user_003', description: 'Review técnico de factibilidad', hours: 1, minutes: 30, date: daysAgo(9) },
    { userId: 'demo_user_002', description: 'Ajustes de paleta de colores post-aprobación', hours: 1, minutes: 0, date: daysAgo(4) },
    { userId: 'demo_user_002', description: 'Versión final y handoff a desarrollo', hours: 2, minutes: 0, date: daysAgo(2) },
  ],
  task_002: [
    { userId: 'demo_user_003', description: 'Setup componente Nav + estructura base', hours: 2, minutes: 0, date: daysAgo(5) },
    { userId: 'demo_user_003', description: 'Menú hamburguesa con animación morphing', hours: 3, minutes: 30, date: daysAgo(4) },
    { userId: 'demo_user_003', description: 'Off-canvas menu + overlay con blur', hours: 2, minutes: 45, date: daysAgo(3) },
    { userId: 'demo_user_003', description: 'Focus trap + accesibilidad ARIA', hours: 1, minutes: 30, date: daysAgo(2) },
    { userId: 'demo_user_003', description: 'Submenu dropdown desktop + floating-ui', hours: 3, minutes: 0, date: daysAgo(1) },
    { userId: 'demo_user_003', description: 'Firefox fix + cross-browser testing', hours: 1, minutes: 15, date: hoursAgo(8) },
  ],
  task_003: [
    { userId: 'demo_user_003', description: 'Setup auth module + Zustand store', hours: 2, minutes: 0, date: daysAgo(7) },
    { userId: 'demo_user_003', description: 'Pantalla de login + validación Zod', hours: 3, minutes: 0, date: daysAgo(6) },
    { userId: 'demo_user_003', description: 'Pantalla de registro + password strength', hours: 3, minutes: 30, date: daysAgo(5) },
    { userId: 'demo_user_003', description: 'Login social con Google', hours: 2, minutes: 0, date: daysAgo(4) },
    { userId: 'demo_user_003', description: 'Recuperación de contraseña + código OTP', hours: 2, minutes: 45, date: daysAgo(3) },
    { userId: 'demo_user_003', description: 'Autenticación biométrica iOS (Face ID)', hours: 3, minutes: 0, date: daysAgo(2) },
    { userId: 'demo_user_003', description: 'Autenticación biométrica Android + PIN fallback', hours: 2, minutes: 30, date: daysAgo(1) },
    { userId: 'demo_user_001', description: 'Code review y QA del flujo completo', hours: 1, minutes: 30, date: hoursAgo(10) },
  ],
  task_006: [
    { userId: 'demo_user_003', description: 'Setup Recharts + componente base de gráficas', hours: 2, minutes: 0, date: daysAgo(10) },
    { userId: 'demo_user_003', description: 'Widget de ingresos mensuales', hours: 3, minutes: 0, date: daysAgo(9) },
    { userId: 'demo_user_001', description: 'Widget de tasa de crecimiento YoY/MoM', hours: 4, minutes: 0, date: daysAgo(7) },
    { userId: 'demo_user_003', description: 'Tooltips interactivos + responsive', hours: 2, minutes: 0, date: daysAgo(5) },
    { userId: 'demo_user_003', description: 'Toggle mensual/trimestral/anual + animaciones', hours: 2, minutes: 30, date: daysAgo(2) },
    { userId: 'demo_user_001', description: 'API endpoint de analytics + data histórica', hours: 3, minutes: 0, date: daysAgo(1) },
  ],
  task_007: [
    { userId: 'demo_user_003', description: 'Setup Stripe SDK + PaymentIntent flow', hours: 3, minutes: 0, date: daysAgo(12) },
    { userId: 'demo_user_003', description: 'Stripe Elements + checkout UI', hours: 2, minutes: 30, date: daysAgo(11) },
    { userId: 'demo_user_003', description: 'Webhooks: succeeded, failed, refunded', hours: 3, minutes: 0, date: daysAgo(10) },
    { userId: 'demo_user_003', description: 'Retry logic con exponential backoff', hours: 2, minutes: 0, date: daysAgo(8) },
    { userId: 'demo_user_003', description: 'Logging con Pino + correlation IDs', hours: 1, minutes: 30, date: daysAgo(6) },
    { userId: 'demo_user_003', description: 'Unit tests + integration tests', hours: 4, minutes: 0, date: daysAgo(4) },
    { userId: 'demo_user_003', description: 'Security review fixes + CSP headers', hours: 1, minutes: 0, date: daysAgo(1) },
  ],
  task_009: [
    { userId: 'demo_user_002', description: 'Análisis de datos de abandono de carrito', hours: 2, minutes: 0, date: daysAgo(20) },
    { userId: 'demo_user_002', description: 'Wireframes del nuevo checkout (3 variantes)', hours: 3, minutes: 0, date: daysAgo(18) },
    { userId: 'demo_user_002', description: 'Diseño UI de Variante A (3 pasos)', hours: 3, minutes: 30, date: daysAgo(16) },
    { userId: 'demo_user_002', description: 'Diseño UI de Variante B (single page)', hours: 3, minutes: 0, date: daysAgo(15) },
    { userId: 'demo_user_002', description: 'Diseño UI de Variante C (accordion)', hours: 2, minutes: 30, date: daysAgo(14) },
    { userId: 'demo_user_002', description: 'Configuración A/B test + analytics', hours: 1, minutes: 30, date: daysAgo(13) },
    { userId: 'demo_user_002', description: 'Análisis de resultados + reporte', hours: 2, minutes: 0, date: daysAgo(10) },
    { userId: 'demo_user_002', description: 'Implementación final + deploy', hours: 2, minutes: 0, date: daysAgo(8) },
  ],
  task_012: [
    { userId: 'demo_user_003', description: 'Setup FullCalendar + schema de citas', hours: 3, minutes: 0, date: daysAgo(6) },
    { userId: 'demo_user_003', description: 'Slot picker con disponibilidad del doctor', hours: 3, minutes: 30, date: daysAgo(5) },
    { userId: 'demo_user_003', description: 'Recordatorios: email + push notifications', hours: 2, minutes: 30, date: daysAgo(4) },
    { userId: 'demo_user_003', description: 'Reagendamiento + política de cancelación', hours: 2, minutes: 0, date: daysAgo(3) },
    { userId: 'demo_user_003', description: 'Vista dashboard del doctor', hours: 3, minutes: 0, date: daysAgo(1) },
  ],
  task_015: [
    { userId: 'demo_user_003', description: 'Auditoría Lighthouse + análisis de bottlenecks', hours: 1, minutes: 30, date: daysAgo(18) },
    { userId: 'demo_user_003', description: 'Optimización de imágenes con Sharp + WebP', hours: 2, minutes: 0, date: daysAgo(17) },
    { userId: 'demo_user_003', description: 'Lazy loading + responsive images (srcset)', hours: 1, minutes: 30, date: daysAgo(16) },
    { userId: 'demo_user_003', description: 'Code splitting + dynamic imports', hours: 3, minutes: 0, date: daysAgo(15) },
    { userId: 'demo_user_003', description: 'Tree shaking + dead code elimination', hours: 2, minutes: 0, date: daysAgo(14) },
    { userId: 'demo_user_003', description: 'Font optimization + preload + subset', hours: 1, minutes: 30, date: daysAgo(13) },
    { userId: 'demo_user_003', description: 'Service worker + cache strategy', hours: 2, minutes: 0, date: daysAgo(12) },
    { userId: 'demo_user_003', description: 'Final Lighthouse audit + documentation', hours: 1, minutes: 0, date: daysAgo(10) },
  ],
};

const TEAMS = [
  {
    id: 'team_001',
    name: 'Equipo de Diseño',
    description: 'UI/UX y diseño visual para todos los proyectos',
    memberIds: ['demo_user_001', 'demo_user_002'],
    createdBy: 'demo_user_001',
    isPublic: false,
    gradientId: 1,
  },
  {
    id: 'team_002',
    name: 'Equipo de Desarrollo',
    description: 'Desarrollo frontend y backend - React, Node.js, Firebase',
    memberIds: ['demo_user_001', 'demo_user_003'],
    createdBy: 'demo_user_001',
    isPublic: false,
    gradientId: 3,
  },
  {
    id: 'team_003',
    name: 'Project Management',
    description: 'Coordinación cross-funcional y gestión de entregas',
    memberIds: ['demo_user_001', 'demo_user_002', 'demo_user_003'],
    createdBy: 'demo_user_001',
    isPublic: true,
    gradientId: 5,
  },
];

const TEAM_MESSAGES: Record<string, Array<{ text: string; senderId: string; hoursAgo: number }>> = {
  team_001: [
    { text: 'Bienvenidos al Equipo de Diseño! Aquí coordinamos todo lo visual.', senderId: 'demo_user_001', hoursAgo: 700 },
    { text: 'Subí la guía de estilo actualizada al drive. Los colores primarios cambiaron ligeramente.', senderId: 'demo_user_002', hoursAgo: 500 },
    { text: 'Gracias María! La voy a revisar para asegurar que el dev siga las specs.', senderId: 'demo_user_001', hoursAgo: 498 },
    { text: 'Para el proyecto de TechCorp estoy usando el nuevo design system. Queda increíble.', senderId: 'demo_user_002', hoursAgo: 300 },
    { text: 'El cliente de GreenLeaf pidió un cambio en la tipografía. De Inter a Outfit.', senderId: 'demo_user_002', hoursAgo: 150 },
    { text: 'Outfit se ve genial. Más moderna y con mejor legibilidad en mobile.', senderId: 'demo_user_001', hoursAgo: 148 },
    { text: 'Los mockups para Meridian Health están listos. Es un diseño más conservador pero clean.', senderId: 'demo_user_002', hoursAgo: 48 },
    { text: 'Perfecto! Mañana los presentamos al cliente.', senderId: 'demo_user_001', hoursAgo: 46 },
  ],
  team_002: [
    { text: 'Equipo de Desarrollo al aire! Coordinamos aquí todo lo técnico.', senderId: 'demo_user_001', hoursAgo: 700 },
    { text: 'Actualicé las dependencias del monorepo. Next.js 15.5, React 19, TypeScript 5.6.', senderId: 'demo_user_003', hoursAgo: 400 },
    { text: 'Buena actualización. Algún breaking change que debamos vigilar?', senderId: 'demo_user_001', hoursAgo: 398 },
    { text: 'Solo el cambio en useFormStatus de React 19. Ya lo arreglé en todos los formularios.', senderId: 'demo_user_003', hoursAgo: 396 },
    { text: 'Sprint planning: esta semana nos enfocamos en el dashboard de Atlas y la nav de TechCorp.', senderId: 'demo_user_001', hoursAgo: 200 },
    { text: 'Puedo tomar ambas. La nav la tengo casi lista y el dashboard es principalmente componentes de Recharts.', senderId: 'demo_user_003', hoursAgo: 198 },
    { text: 'Cuidado con el scope. Mejor terminar nav y yo apoyo con el dashboard.', senderId: 'demo_user_001', hoursAgo: 196 },
    { text: 'Deploy de staging exitoso. Todos los tests pasando. Build time: 45s.', senderId: 'demo_user_003', hoursAgo: 72 },
    { text: 'Excelente! El CI/CD está funcionando perfecto desde que migramos a GitHub Actions.', senderId: 'demo_user_001', hoursAgo: 70 },
    { text: 'Alguien más tiene el issue de hot reload lento? Mi webpack rebuilds toman ~8s.', senderId: 'demo_user_003', hoursAgo: 24 },
    { text: 'Prueba con turbopack: next dev --turbopack. A mí me bajó a ~2s.', senderId: 'demo_user_001', hoursAgo: 22 },
  ],
  team_003: [
    { text: 'Bienvenidos al canal de Project Management! Aquí va la coordinación general.', senderId: 'demo_user_001', hoursAgo: 700 },
    { text: 'Recordatorio: standup diario a las 10am por este chat. Quick updates de cada proyecto.', senderId: 'demo_user_001', hoursAgo: 500 },
    { text: 'Update: TechCorp homepage mockups aprobados. Pasamos a desarrollo esta semana.', senderId: 'demo_user_002', hoursAgo: 250 },
    { text: 'Update: Stripe integration para Atlas está en code review. Deploy estimado para jueves.', senderId: 'demo_user_003', hoursAgo: 248 },
    { text: 'El cliente de Nova Retail adelantó la fecha de launch. Necesitamos priorizar el catálogo.', senderId: 'demo_user_001', hoursAgo: 150 },
    { text: 'Puedo empezar con los templates del catálogo mañana si Carlos hace el backend hoy.', senderId: 'demo_user_002', hoursAgo: 148 },
    { text: 'Hecho. El API del catálogo con filtros ya está en el branch feature/catalog-api.', senderId: 'demo_user_003', hoursAgo: 100 },
    { text: 'Resumen semanal: 3 tasks completadas, 4 en proceso, 0 bloqueadas. Vamos bien!', senderId: 'demo_user_001', hoursAgo: 48 },
    { text: 'La próxima semana tenemos la demo con Meridian Health. Necesitamos tener el portal de citas listo.', senderId: 'demo_user_001', hoursAgo: 24 },
    { text: 'Lo tengo al 80%. Falta la videoconsulta pero el core está funcional.', senderId: 'demo_user_003', hoursAgo: 22 },
    { text: 'Para la demo podemos mostrar el calendario y agendamiento. La video la dejamos para la siguiente iteración.', senderId: 'demo_user_001', hoursAgo: 20 },
    { text: 'De acuerdo. Me enfoco en pulir la UI del calendario para que se vea impecable.', senderId: 'demo_user_002', hoursAgo: 18 },
  ],
};

// --- Seed functions ---

async function clearCollection(collectionName: string) {
  const snapshot = await db.collection(collectionName).get();
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  if (snapshot.size > 0) {
    await batch.commit();
    console.log(`  🗑️  Cleared ${snapshot.size} docs from ${collectionName}`);
  }
}

async function clearSubcollection(parentCollection: string, parentId: string, subcollection: string) {
  const snapshot = await db.collection(parentCollection).doc(parentId).collection(subcollection).get();
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  if (snapshot.size > 0) await batch.commit();
}

async function seedUsers() {
  console.log('Seeding users...');
  for (const user of USERS) {
    await db.collection('users').doc(user.userId).set({
      ...user,
      lastUpdated: new Date().toISOString(),
      status: 'online',
    });
  }
  console.log(`  ✓ ${USERS.length} users created`);
}

async function seedClients() {
  console.log('Seeding clients...');
  for (const client of CLIENTS) {
    await db.collection('clients').doc(client.id).set({
      ...client,
      createdAt: Timestamp.fromDate(daysAgo(randomBetween(20, 60))),
      lastModified: Timestamp.fromDate(daysAgo(randomBetween(0, 5))),
    });
  }
  console.log(`  ✓ ${CLIENTS.length} clients created`);
}

async function seedTasks() {
  console.log('Seeding tasks...');
  for (const task of TASKS) {
    const { startDate, endDate, ...rest } = task;

    // Calculate total time from time tracking entries
    const timeEntries = TIME_TRACKING[task.id] || [];
    const totalMinutes = timeEntries.reduce((acc, e) => acc + e.hours * 60 + e.minutes, 0);

    await db.collection('tasks').doc(task.id).set({
      ...rest,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      createdAt: Timestamp.fromDate(startDate),
      lastActivity: Timestamp.fromDate(hoursAgo(randomBetween(1, 48))),
      archived: false,
      hasUnreadUpdates: task.status === 'En Proceso',
      timeTracking: {
        totalHours: Math.floor(totalMinutes / 60),
        totalMinutes: totalMinutes % 60,
      },
    });

    // Seed messages
    const messages = MESSAGES_PER_TASK[task.id];
    if (messages) {
      // Clear existing messages first
      await clearSubcollection('tasks', task.id, 'messages');

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const sender = USERS.find(u => u.userId === msg.senderId);
        await db.collection('tasks').doc(task.id).collection('messages').add({
          text: msg.text,
          senderId: msg.senderId,
          senderName: sender?.displayName || 'Unknown',
          imageUrl: '',
          timestamp: Timestamp.fromDate(hoursAgo(msg.hoursAgo)),
          read: true,
        });
      }
    }

    // Seed time tracking entries
    if (timeEntries.length > 0) {
      await clearSubcollection('tasks', task.id, 'timeLogs');

      for (const entry of timeEntries) {
        const user = USERS.find(u => u.userId === entry.userId);
        await db.collection('tasks').doc(task.id).collection('timeLogs').add({
          userId: entry.userId,
          userName: user?.displayName || 'Unknown',
          description: entry.description,
          hours: entry.hours,
          minutes: entry.minutes,
          totalMinutes: entry.hours * 60 + entry.minutes,
          date: Timestamp.fromDate(entry.date),
          createdAt: Timestamp.fromDate(entry.date),
        });
      }
    }
  }

  const totalMessages = Object.values(MESSAGES_PER_TASK).reduce((acc, msgs) => acc + msgs.length, 0);
  const totalTimeLogs = Object.values(TIME_TRACKING).reduce((acc, entries) => acc + entries.length, 0);
  console.log(`  ✓ ${TASKS.length} tasks created`);
  console.log(`  ✓ ${totalMessages} messages created`);
  console.log(`  ✓ ${totalTimeLogs} time log entries created`);
}

async function seedTeams() {
  console.log('Seeding teams...');
  for (const team of TEAMS) {
    await db.collection('teams').doc(team.id).set({
      ...team,
      createdAt: Timestamp.fromDate(daysAgo(30)),
    });

    // Clear existing team messages
    await clearSubcollection('teams', team.id, 'messages');

    // Add team messages
    const teamMessages = TEAM_MESSAGES[team.id] || [];
    for (const msg of teamMessages) {
      const sender = USERS.find(u => u.userId === msg.senderId);
      await db.collection('teams').doc(team.id).collection('messages').add({
        text: msg.text,
        senderId: msg.senderId,
        senderName: sender?.displayName || 'Unknown',
        imageUrl: '',
        timestamp: Timestamp.fromDate(hoursAgo(msg.hoursAgo)),
        read: true,
      });
    }
  }
  const totalTeamMessages = Object.values(TEAM_MESSAGES).reduce((acc, msgs) => acc + msgs.length, 0);
  console.log(`  ✓ ${TEAMS.length} teams created`);
  console.log(`  ✓ ${totalTeamMessages} team messages created`);
}

// --- Main ---
async function main() {
  console.log('\n🌱 Seeding Aurin Demo Database...\n');
  console.log('⚠️  Clearing existing data first...\n');

  // Clear existing data
  await clearCollection('users');
  await clearCollection('clients');

  // Clear tasks and their subcollections
  const tasksSnap = await db.collection('tasks').get();
  for (const doc of tasksSnap.docs) {
    await clearSubcollection('tasks', doc.id, 'messages');
    await clearSubcollection('tasks', doc.id, 'timeLogs');
  }
  await clearCollection('tasks');

  // Clear teams and their subcollections
  const teamsSnap = await db.collection('teams').get();
  for (const doc of teamsSnap.docs) {
    await clearSubcollection('teams', doc.id, 'messages');
  }
  await clearCollection('teams');

  console.log('');

  // Seed fresh data
  await seedUsers();
  await seedClients();
  await seedTasks();
  await seedTeams();

  console.log('\n✅ Demo data seeded successfully!\n');
  console.log('📊 Summary:');
  console.log(`   Users: ${USERS.length}`);
  console.log(`   Clients: ${CLIENTS.length}`);
  console.log(`   Tasks: ${TASKS.length}`);
  console.log(`   Teams: ${TEAMS.length}`);
  const totalMsgs = Object.values(MESSAGES_PER_TASK).reduce((acc, m) => acc + m.length, 0) + Object.values(TEAM_MESSAGES).reduce((acc, m) => acc + m.length, 0);
  const totalTLogs = Object.values(TIME_TRACKING).reduce((acc, e) => acc + e.length, 0);
  console.log(`   Messages: ${totalMsgs}`);
  console.log(`   Time Logs: ${totalTLogs}`);
  console.log('');

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
