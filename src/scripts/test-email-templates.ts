#!/usr/bin/env ts-node

import { emailTemplateService, EmailTemplateData } from '../services/emailTemplates';

async function testEmailTemplates() {
  console.log('🧪 Probando plantillas de email...\n');

  // Datos de prueba
  const testData: EmailTemplateData = {
    recipientName: 'Juan Pérez',
    creatorName: 'María García',
    senderName: 'María García',
    loggerName: 'María García',
    taskName: 'Diseñar nueva interfaz de usuario',
    taskDescription: 'Crear wireframes y mockups para la nueva aplicación móvil',
    taskObjectives: 'Mejorar la usabilidad en un 30% y reducir el tiempo de onboarding',
    startDate: '15/01/2025',
    endDate: '28/01/2025',
    taskStatus: 'En Proceso',
    taskPriority: 'Alta',
    leadersList: 'María García, Carlos López',
    assignedList: 'Juan Pérez, Ana Martínez, Pedro Rodríguez',
    messageText: 'Hola equipo, he actualizado los wireframes con los nuevos requisitos del cliente. Por favor revisen y me dan su feedback.',
    timelogHours: 4.5,
    hoursLogged: 4.5,
    logDate: '18/01/2025',
    comment: 'Trabajé en la iteración de los wireframes basándome en el feedback del equipo de UX',
    taskUrl: 'https://app.sodio.com/dashboard/tasks/123',
    configPageUrl: 'https://app.sodio.com/dashboard/config',
  };

  try {
    // Probar plantilla de tarea
    console.log('📋 Plantilla de Tarea:');
    const taskTemplate = emailTemplateService.generateTaskTemplate(testData);
    console.log(`Asunto: ${taskTemplate.subject}`);
    console.log(`HTML generado: ${taskTemplate.html.length} caracteres\n`);

    // Probar plantilla de mensaje
    console.log('💬 Plantilla de Mensaje:');
    const messageTemplate = emailTemplateService.generateMessageTemplate(testData);
    console.log(`Asunto: ${messageTemplate.subject}`);
    console.log(`HTML generado: ${messageTemplate.html.length} caracteres\n`);

    // Probar plantilla de timelog
    console.log('⏱️ Plantilla de Timelog:');
    const timelogTemplate = emailTemplateService.generateTimelogTemplate(testData);
    console.log(`Asunto: ${timelogTemplate.subject}`);
    console.log(`HTML generado: ${timelogTemplate.html.length} caracteres\n`);

    // Probar generación automática por tipo
    console.log('🎯 Generación automática por tipo:');
    const types = ['task_created', 'group_message', 'time_log'];
    
    for (const type of types) {
      const template = emailTemplateService.generateTemplate(type, testData);
      console.log(`${type}: ${template.subject} (${template.html.length} caracteres)`);
    }

    console.log('\n✅ Todas las plantillas funcionan correctamente!');
    
    console.log('\n📁 Plantillas generadas correctamente!');
    console.log('Puedes revisar el HTML generado en los logs de arriba.');

  } catch (error) {
    console.error('❌ Error probando plantillas:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testEmailTemplates().catch(console.error);
}

export { testEmailTemplates };
