/**
 * Tests for Mailer Transporter Module
 */

import { sendEmailInternal, verifyTransporter, closeTransporter } from '../transporter';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('Mailer Transporter', () => {
  let mockTransporter: any;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Create mock transporter
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
      close: jest.fn(),
    };

    // Mock nodemailer.createTransport
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Close transporter to reset singleton
    closeTransporter();
  });

  describe('sendEmailInternal', () => {
    it('should send email successfully', async () => {
      const mockMessageId = 'test-message-id-123';
      mockTransporter.sendMail.mockResolvedValue({ messageId: mockMessageId });

      const result = await sendEmailInternal({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test email</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(mockMessageId);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: '"Aurin Task Manager" <no-reply@aurin.com>',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test email</p>',
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Email sent successfully')
      );
    });

    it('should send email to multiple recipients', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      const result = await sendEmailInternal({
        to: recipients,
        subject: 'Test Subject',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: recipients,
        })
      );
    });

    it('should use custom from address if provided', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await sendEmailInternal({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        from: 'custom@example.com',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'custom@example.com',
        })
      );
    });

    it('should use default from address from config if not provided', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await sendEmailInternal({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"Aurin Task Manager" <no-reply@aurin.com>',
        })
      );
    });

    it('should handle email sending errors gracefully', async () => {
      const mockError = new Error('SMTP connection failed');
      mockTransporter.sendMail.mockRejectedValue(mockError);

      const result = await sendEmailInternal({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error sending email'),
        mockError
      );
    });

    it('should create transporter only once (singleton pattern)', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await sendEmailInternal({
        to: 'user1@example.com',
        subject: 'Test 1',
        html: '<p>Test 1</p>',
      });

      await sendEmailInternal({
        to: 'user2@example.com',
        subject: 'Test 2',
        html: '<p>Test 2</p>',
      });

      // createTransport should only be called once
      expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    });

    it('should log transporter initialization', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await sendEmailInternal({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Transporter initialized')
      );
    });
  });

  describe('verifyTransporter', () => {
    it('should verify transporter successfully', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await verifyTransporter();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Transporter verified successfully')
      );
    });

    it('should handle verification failures gracefully', async () => {
      const mockError = new Error('Invalid credentials');
      mockTransporter.verify.mockRejectedValue(mockError);

      const result = await verifyTransporter();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Transporter verification failed'),
        mockError
      );
    });

    it('should create transporter if not already created', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      await verifyTransporter();

      expect(nodemailer.createTransport).toHaveBeenCalled();
    });
  });

  describe('closeTransporter', () => {
    it('should close transporter if it exists', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      // Create transporter by sending an email
      await sendEmailInternal({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      // Now close it
      closeTransporter();

      expect(mockTransporter.close).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Transporter closed')
      );
    });

    it('should not throw if transporter does not exist', () => {
      expect(() => closeTransporter()).not.toThrow();
    });

    it('should not log if transporter does not exist', () => {
      consoleLogSpy.mockClear();

      closeTransporter();

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Transporter closed')
      );
    });

    it('should allow creating new transporter after close', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      // Create and close
      await sendEmailInternal({
        to: 'user1@example.com',
        subject: 'Test 1',
        html: '<p>Test 1</p>',
      });
      closeTransporter();

      // Create again
      await sendEmailInternal({
        to: 'user2@example.com',
        subject: 'Test 2',
        html: '<p>Test 2</p>',
      });

      // Should have created transporter twice
      expect(nodemailer.createTransport).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration - Config validation', () => {
    const originalUser = process.env.EMAIL_USER;

    beforeAll(() => {
      delete process.env.EMAIL_USER;
      jest.resetModules();
    });

    afterAll(() => {
      process.env.EMAIL_USER = originalUser;
      jest.resetModules();
    });

    it('should not send email if config is invalid', async () => {
      const { sendEmailInternal: freshSendEmail } = require('../transporter');
      const result = await freshSendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toContain('Missing required email configuration');
    });
  });
});
