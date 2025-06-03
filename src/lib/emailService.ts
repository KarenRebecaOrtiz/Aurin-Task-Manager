export class EmailService {
    // Placeholder para la lógica de envío de correos
    async sendInvite(email: string, inviteLink: string) {
      console.log(`Placeholder: Sending invite to ${email} with link ${inviteLink}`);
      // TODO: Implementar con Nodemailer o un servicio de correo
    }
  
    async sendDeleteRequest(userId: string, fullName: string, adminEmail: string) {
      console.log(`Placeholder: Sending deletion request for ${fullName} (${userId}) to ${adminEmail}`);
      // TODO: Implementar con Nodemailer o un servicio de correo
    }
  }
  
  export const emailService = new EmailService();