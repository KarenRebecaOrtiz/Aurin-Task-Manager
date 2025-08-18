#!/usr/bin/env ts-node

/**
 * Script para probar el envío de emails directamente
 * Uso: npx ts-node src/scripts/test-email-direct.ts
 */

import nodemailer from 'nodemailer';

async function testEmailDirect() {
  console.log('🧪 Probando envío de email directamente...\n');

  try {
    // Configuración
    const emailUser = process.env.EMAIL_USER || 'sodioanalytics@gmail.com';
    const emailPass = process.env.EMAIL_PASS || 'sxfu ovry zccb bcui';
    
    console.log('📧 Configuración:');
    console.log(`   Usuario: ${emailUser}`);
    console.log(`   Contraseña: ${emailPass ? '✅ Configurada' : '❌ No configurada'}`);
    console.log('');

    if (!emailPass) {
      console.error('❌ EMAIL_PASS no está configurada');
      return;
    }

    // Crear transporter
    console.log('🔧 Creando transporter de Nodemailer...');
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    // Verificar configuración
    console.log('✅ Verificando configuración del transporter...');
    await transporter.verify();
    console.log('✅ Transporter verificado correctamente\n');

    // Enviar email de prueba
    console.log('📤 Enviando email de prueba...');
    const info = await transporter.sendMail({
      from: `"Sodio Task App" <${emailUser}>`,
      to: emailUser, // Enviar a ti mismo para prueba
      subject: '🧪 Prueba de Email - Sistema de Notificaciones',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Sodio Task App - Prueba de Email</h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              Este es un email de prueba para verificar que el sistema de notificaciones funciona correctamente.
            </p>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="text-align: center; color: #999; font-size: 12px;">
            ✅ Sistema de emails funcionando correctamente
          </p>
        </div>
      `,
    });

    console.log('✅ Email enviado exitosamente!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📤 Respuesta del servidor:', info.response);

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    
    if (error instanceof Error) {
      console.error('📋 Detalles del error:');
      console.error('   Mensaje:', error.message);
      console.error('   Stack:', error.stack);
      
      // Errores comunes de Gmail
      if (error.message.includes('Invalid login')) {
        console.error('\n🔑 Error de autenticación:');
        console.error('   - Verifica que EMAIL_USER y EMAIL_PASS sean correctos');
        console.error('   - Asegúrate de usar una App Password, no tu contraseña normal');
        console.error('   - Verifica que la verificación en 2 pasos esté habilitada');
      } else if (error.message.includes('Less secure app access')) {
        console.error('\n🔒 Error de seguridad:');
        console.error('   - Gmail requiere App Passwords para aplicaciones');
        console.error('   - Ve a: Google Account > Security > 2-Step Verification > App passwords');
      }
    }
  }
}

// Ejecutar la función
testEmailDirect().catch(console.error);
