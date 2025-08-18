import { config } from '@/lib/config';

export interface EmailTemplateData {
  recipientName: string;
  creatorName?: string;
  senderName?: string;
  loggerName?: string;
  taskName: string;
  taskDescription?: string;
  taskObjectives?: string;
  startDate?: string;
  endDate?: string;
  taskStatus?: string;
  taskPriority?: string;
  leadersList?: string;
  assignedList?: string;
  messageText?: string;
  timelogHours?: number;
  hoursLogged?: number;
  logDate?: string;
  comment?: string;
  taskUrl: string;
  configPageUrl: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

export class EmailTemplateService {
  private static instance: EmailTemplateService | null = null;

  static getInstance(): EmailTemplateService {
    if (!EmailTemplateService.instance) {
      EmailTemplateService.instance = new EmailTemplateService();
    }
    return EmailTemplateService.instance;
  }

  private constructor() {}

  /**
   * Genera la plantilla para creación/edición de tareas
   */
  generateTaskTemplate(data: EmailTemplateData): EmailTemplate {
    const subject = `Aurin Task Manager - Nueva tarea asignada: ${data.taskName}`;
    
    // Generar mensaje específico según el tipo de cambio
    const getChangeMessage = () => {
      if (data.taskDescription && data.taskDescription.length > 0) {
        return `${data.creatorName} te ha asignado a la tarea "${data.taskName}".`;
      }
      return `${data.creatorName} ha actualizado la tarea "${data.taskName}".`;
    };
    
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { margin: 0; padding: 0; font-family: 'Urbanist', Arial, sans-serif; }
          .email-container { 
            width: 100%; 
            max-width: 442px; 
            margin: 0 auto; 
            background: #D3DE48; 
            padding: 20px 34px; 
            box-sizing: border-box;
          }
          .header { 
            text-align: center; 
            padding: 20px 0; 
            margin-bottom: 30px;
          }
          .logo { width: 96px; height: 36px; }
          .content-box { 
            background: #DDE761; 
            border-radius: 10px; 
            padding: 20px; 
            margin-bottom: 30px;
            text-align: center;
          }
          .greeting { 
            font-size: 24px; 
            font-weight: 700; 
            color: black; 
            margin-bottom: 16px;
            line-height: 25px;
          }
          .main-text { 
            font-size: 16px; 
            font-weight: 400; 
            color: black; 
            line-height: 25px;
            margin-bottom: 8px;
          }
          .label { 
            font-size: 16px; 
            font-weight: 700; 
            color: black;
          }
          .call-to-action { 
            font-size: 20px; 
            font-weight: 700; 
            color: black; 
            text-align: center;
            margin-bottom: 30px;
            line-height: 25px;
          }
          .cta-button { 
            background: #0C0C0C; 
            color: white; 
            padding: 7px 108px; 
            text-decoration: none; 
            border-radius: 4px;
            display: inline-block;
            margin-bottom: 30px;
          }
          .cta-text { 
            font-size: 16px; 
            font-weight: 700; 
            text-transform: uppercase;
            line-height: 25px;
          }
          .illustration { 
            width: 100%; 
            height: 372px; 
            object-fit: cover;
            margin-bottom: 20px;
          }
          .footer { 
            text-align: center; 
            font-size: 12px; 
            color: black;
            line-height: 15px;
          }
          .unsubscribe-link { 
            text-decoration: underline; 
            color: black;
          }
          .task-details { margin: 16px 0; }
          .detail-row { margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img src="https://storage.googleapis.com/aurin-plattform/assets/AurinWhiteLogoTopMail.png" alt="Aurin Logo" class="logo">
          </div>
          
          <div class="content-box">
            <div class="greeting">Hola ${data.recipientName},</div>
            <div class="main-text">${getChangeMessage()}</div>
            <div class="label">Aquí tienes los detalles:</div>
            
            <div class="task-details">
              ${data.taskDescription ? `<div class="detail-row"><span class="label">Descripción:</span> <span class="main-text">${data.taskDescription}</span></div>` : ''}
              ${data.taskObjectives ? `<div class="detail-row"><span class="label">Objetivos:</span> <span class="main-text">${data.taskObjectives}</span></div>` : ''}
              ${data.startDate ? `<div class="detail-row"><span class="label">Fecha de Inicio:</span> <span class="main-text">${data.startDate}</span></div>` : ''}
              ${data.endDate ? `<div class="detail-row"><span class="label">Fecha de Finalización:</span> <span class="main-text">${data.endDate}</span></div>` : ''}
              ${data.taskStatus ? `<div class="detail-row"><span class="label">Estado:</span> <span class="main-text">${data.taskStatus}</span></div>` : ''}
              ${data.taskPriority ? `<div class="detail-row"><span class="label">Prioridad:</span> <span class="main-text">${data.taskPriority}</span></div>` : ''}
              <div class="detail-row"><span class="label">Equipo:</span></div>
              ${data.leadersList ? `<div class="detail-row"><span class="label">- Líder(es):</span> <span class="main-text">${data.leadersList}</span></div>` : ''}
              ${data.assignedList ? `<div class="detail-row"><span class="label">- Asignados:</span> <span class="main-text">${data.assignedList}</span></div>` : ''}
            </div>
          </div>
          
          <div class="call-to-action">
            ¡Revisa la tarea y<br/>comienza a trabajar en ella!
          </div>
          
          <a href="https://pm.aurincloud.com/dashboard/tasks" class="cta-button">
            <div class="cta-text">Ir a la tarea</div>
          </a>
          
          <img src="https://storage.googleapis.com/aurin-plattform/assets/Create-EditMail.png" alt="Task Illustration" class="illustration">
          
          <div class="footer">
            Este es un correo automático de Aurin Task Manager. No respondas a este mensaje.<br/>
            <a href="https://pm.aurincloud.com/dashboard/config" class="unsubscribe-link">Haz click aquí para desuscribirte</a>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html };
  }

  /**
   * Genera la plantilla para mensajes de chat
   */
  generateMessageTemplate(data: EmailTemplateData): EmailTemplate {
    const subject = `Aurin Task Manager - Nuevo mensaje en: ${data.taskName}`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { margin: 0; padding: 0; font-family: 'Urbanist', Arial, sans-serif; }
          .email-container { 
            width: 100%; 
            max-width: 442px; 
            margin: 0 auto; 
            background: #D3DE48; 
            padding: 20px 34px; 
            box-sizing: border-box;
          }
          .header { 
            text-align: center; 
            padding: 20px 0; 
            margin-bottom: 30px;
          }
          .logo { width: 96px; height: 36px; }
          .content-box { 
            background: #DDE761; 
            border-radius: 10px; 
            padding: 20px; 
            margin-bottom: 30px;
            text-align: center;
          }
          .greeting { 
            font-size: 24px; 
            font-weight: 700; 
            color: black; 
            margin-bottom: 16px;
            line-height: 25px;
          }
          .main-text { 
            font-size: 16px; 
            font-weight: 400; 
            color: black; 
            line-height: 25px;
            margin-bottom: 8px;
          }
          .label { 
            font-size: 16px; 
            font-weight: 700; 
            color: black;
          }
          .call-to-action { 
            font-size: 20px; 
            font-weight: 700; 
            color: black; 
            text-align: center;
            margin-bottom: 30px;
            line-height: 25px;
          }
          .cta-button { 
            background: #0C0C0C; 
            color: white; 
            padding: 7px 108px; 
            text-decoration: none; 
            border-radius: 4px;
            display: inline-block;
            margin-bottom: 30px;
          }
          .cta-text { 
            font-size: 16px; 
            font-weight: 700; 
            text-transform: uppercase;
            line-height: 25px;
          }
          .illustration { 
            width: 100%; 
            height: 374px; 
            object-fit: cover;
            margin-bottom: 20px;
          }
          .footer { 
            text-align: center; 
            font-size: 12px; 
            color: black;
            line-height: 15px;
          }
          .unsubscribe-link { 
            text-decoration: underline; 
            color: black;
          }
          .message-content { margin: 16px 0; }
          .timelog-info { 
            margin-top: 16px; 
            padding-top: 16px; 
            border-top: 1px solid rgba(0,0,0,0.1);
          }
          .task-context {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img src="https://storage.googleapis.com/aurin-plattform/assets/AurinWhiteLogoTopMail.png" alt="Aurin Logo" class="logo">
          </div>
          
          <div class="content-box">
            <div class="greeting">Hola ${data.recipientName},</div>
            <div class="main-text">${data.senderName} ha enviado un nuevo mensaje en la tarea "${data.taskName}":</div>
            
            <div class="message-content">
              <div class="label">Mensaje:</div>
              <div class="main-text">${data.messageText}</div>
            </div>
            
            ${data.timelogHours ? `
              <div class="timelog-info">
                <div class="label">Timelog:</div>
                <div class="main-text">${data.timelogHours} horas registradas</div>
              </div>
            ` : ''}
            
            ${data.taskDescription ? `
              <div class="task-context">
                <div class="label">Contexto de la tarea:</div>
                <div class="main-text">${data.taskDescription}</div>
              </div>
            ` : ''}
          </div>
          
          <div class="call-to-action">
            ¡Revisa el mensaje y participa en la conversación!
          </div>
          
          <a href="https://pm.aurincloud.com/dashboard/tasks" class="cta-button">
            <div class="cta-text">Ir a la tarea</div>
          </a>
          
          <img src="https://storage.googleapis.com/aurin-plattform/assets/MessageMail.png" alt="Message Illustration" class="illustration">
          
          <div class="footer">
            Este es un correo automático de Aurin Task Manager. No respondas a este mensaje.<br/>
            <a href="https://pm.aurincloud.com/dashboard/config" class="unsubscribe-link">Haz click aquí para desuscribirte</a>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html };
  }

  /**
   * Genera la plantilla para timelogs
   */
  generateTimelogTemplate(data: EmailTemplateData): EmailTemplate {
    const subject = `Aurin Task Manager - Nuevo registro de tiempo en: ${data.taskName}`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { margin: 0; padding: 0; font-family: 'Urbanist', Arial, sans-serif; }
          .email-container { 
            width: 100%; 
            max-width: 442px; 
            margin: 0 auto; 
            background: #D3DE48; 
            padding: 20px 34px; 
            box-sizing: border-box;
          }
          .header { 
            text-align: center; 
            padding: 20px 0; 
            margin-bottom: 30px;
          }
          .logo { width: 96px; height: 36px; }
          .content-box { 
            background: #DDE761; 
            border-radius: 10px; 
            padding: 20px; 
            margin-bottom: 30px;
            text-align: center;
          }
          .greeting { 
            font-size: 24px; 
            font-weight: 700; 
            color: black; 
            margin-bottom: 16px;
            line-height: 25px;
          }
          .main-text { 
            font-size: 16px; 
            font-weight: 400; 
            color: black; 
            line-height: 25px;
            margin-bottom: 8px;
          }
          .label { 
            font-size: 16px; 
            font-weight: 700; 
            color: black;
          }
          .call-to-action { 
            font-size: 20px; 
            font-weight: 700; 
            color: black; 
            text-align: center;
            margin-bottom: 30px;
            line-height: 25px;
          }
          .cta-button { 
            background: #0C0C0C; 
            color: white; 
            padding: 7px 108px; 
            text-decoration: none; 
            border-radius: 4px;
            display: inline-block;
            margin-bottom: 30px;
          }
          .cta-text { 
            font-size: 16px; 
            font-weight: 700; 
            text-transform: uppercase;
            line-height: 25px;
          }
          .illustration { 
            width: 100%; 
            height: 372px; 
            object-fit: cover;
            margin-bottom: 20px;
          }
          .footer { 
            text-align: center; 
            font-size: 12px; 
            color: black;
            line-height: 15px;
          }
          .unsubscribe-link { 
            text-decoration: underline; 
            color: black;
          }
          .timelog-details { margin: 16px 0; }
          .detail-row { margin: 8px 0; }
          .comment-section { 
            margin-top: 16px; 
            padding-top: 16px; 
            border-top: 1px solid rgba(0,0,0,0.1);
          }
          .task-context {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img src="https://storage.googleapis.com/aurin-plattform/assets/AurinWhiteLogoTopMail.png" alt="Aurin Logo" class="logo">
          </div>
          
          <div class="content-box">
            <div class="greeting">Hola ${data.recipientName},</div>
            <div class="main-text">${data.loggerName} ha registrado tiempo en la tarea "${data.taskName}":</div>
            
            <div class="timelog-details">
              <div class="detail-row">
                <span class="label">Horas registradas:</span> 
                <span class="main-text">${data.hoursLogged} horas</span>
              </div>
              <div class="detail-row">
                <span class="label">Fecha de registro:</span> 
                <span class="main-text">${data.logDate}</span>
              </div>
              ${data.comment ? `
                <div class="comment-section">
                  <div class="label">Comentario:</div>
                  <div class="main-text">${data.comment}</div>
                </div>
              ` : ''}
              ${data.taskDescription ? `
                <div class="task-context">
                  <div class="label">Tarea:</div>
                  <div class="main-text">${data.taskDescription}</div>
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="call-to-action">
            Revisa los detalles para mantenerte al día con el progreso.
          </div>
          
          <a href="https://pm.aurincloud.com/dashboard/tasks" class="cta-button">
            <div class="cta-text">Ir a la tarea</div>
          </a>
          
          <img src="https://storage.googleapis.com/aurin-plattform/assets/TimeLogMail.png" alt="Timelog Illustration" class="illustration">
          
          <div class="footer">
            Este es un correo automático de Aurin Task Manager. No respondas a este mensaje.<br/>
            <a href="https://pm.aurincloud.com/dashboard/config" class="unsubscribe-link">Haz click aquí para desuscribirte</a>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html };
  }

  /**
   * Genera la plantilla apropiada basada en el tipo de notificación
   */
  generateTemplate(type: string, data: EmailTemplateData): EmailTemplate {
    switch (type) {
      case 'task_created':
      case 'task_status_changed':
      case 'task_priority_changed':
      case 'task_dates_changed':
      case 'task_assignment_changed':
        return this.generateTaskTemplate(data);
      
      case 'group_message':
      case 'private_message':
        return this.generateMessageTemplate(data);
      
      case 'time_log':
        return this.generateTimelogTemplate(data);
      
      default:
        return this.generateTaskTemplate(data);
    }
  }
}

export const emailTemplateService = EmailTemplateService.getInstance();
