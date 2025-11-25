/**
 * Tests for Mailer Config Module
 */

import { mailConfig, appConfig, validateMailConfig, isMailConfigured } from '../config';

describe('Mailer Config', () => {
  describe('mailConfig', () => {
    it('should load email configuration from environment variables', () => {
      expect(mailConfig.service).toBe('gmail');
      expect(mailConfig.auth.user).toBe('test@example.com');
      expect(mailConfig.auth.pass).toBe('test-password');
      expect(mailConfig.from).toBe('"Test Mailer" <no-reply@test.com>');
    });

    it('should have default values when env vars are missing', () => {
      const originalUser = process.env.EMAIL_USER;
      const originalPass = process.env.EMAIL_PASS;
      const originalFrom = process.env.EMAIL_FROM;

      // Temporarily clear env vars
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;
      delete process.env.EMAIL_FROM;

      // Re-import to get fresh config
      jest.resetModules();
      const { mailConfig: freshConfig } = require('../config');

      expect(freshConfig.auth.user).toBe('');
      expect(freshConfig.auth.pass).toBe('');
      expect(freshConfig.from).toBe('"Aurin Task Manager" <no-reply@aurin.com>');

      // Restore env vars
      process.env.EMAIL_USER = originalUser;
      process.env.EMAIL_PASS = originalPass;
      process.env.EMAIL_FROM = originalFrom;
    });
  });

  describe('appConfig', () => {
    it('should load app URLs from environment variables', () => {
      expect(appConfig.url).toBe('http://localhost:3000');
      expect(appConfig.dashboardUrl).toBe('http://localhost:3000/dashboard');
    });

    it('should have default localhost URLs when NEXT_PUBLIC_APP_URL is not set', () => {
      const originalUrl = process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;

      jest.resetModules();
      const { appConfig: freshConfig } = require('../config');

      expect(freshConfig.url).toBe('http://localhost:3000');
      expect(freshConfig.dashboardUrl).toBe('http://localhost:3000/dashboard');

      process.env.NEXT_PUBLIC_APP_URL = originalUrl;
    });

    it('should construct dashboard URL from NEXT_PUBLIC_APP_URL', () => {
      const originalUrl = process.env.NEXT_PUBLIC_APP_URL;
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';

      jest.resetModules();
      const { appConfig: freshConfig } = require('../config');

      expect(freshConfig.url).toBe('https://example.com');
      expect(freshConfig.dashboardUrl).toBe('https://example.com/dashboard');

      process.env.NEXT_PUBLIC_APP_URL = originalUrl;
    });
  });

  describe('validateMailConfig', () => {
    it('should not throw when EMAIL_USER and EMAIL_PASS are set', () => {
      expect(() => validateMailConfig()).not.toThrow();
    });

    it('should throw error when EMAIL_USER is missing', () => {
      const originalUser = process.env.EMAIL_USER;
      delete process.env.EMAIL_USER;

      expect(() => validateMailConfig()).toThrow(
        'Missing required email configuration: EMAIL_USER'
      );

      process.env.EMAIL_USER = originalUser;
    });

    it('should throw error when EMAIL_PASS is missing', () => {
      const originalPass = process.env.EMAIL_PASS;
      delete process.env.EMAIL_PASS;

      expect(() => validateMailConfig()).toThrow(
        'Missing required email configuration: EMAIL_PASS'
      );

      process.env.EMAIL_PASS = originalPass;
    });

    it('should throw error when both EMAIL_USER and EMAIL_PASS are missing', () => {
      const originalUser = process.env.EMAIL_USER;
      const originalPass = process.env.EMAIL_PASS;
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;

      expect(() => validateMailConfig()).toThrow(
        'Missing required email configuration: EMAIL_USER, EMAIL_PASS'
      );

      process.env.EMAIL_USER = originalUser;
      process.env.EMAIL_PASS = originalPass;
    });

    it('should include helpful message in error', () => {
      const originalUser = process.env.EMAIL_USER;
      delete process.env.EMAIL_USER;

      expect(() => validateMailConfig()).toThrow(
        'Please check your .env file'
      );

      process.env.EMAIL_USER = originalUser;
    });
  });

  describe('isMailConfigured', () => {
    it('should return true when both EMAIL_USER and EMAIL_PASS are set', () => {
      expect(isMailConfigured()).toBe(true);
    });

    it('should return false when EMAIL_USER is missing', () => {
      const originalUser = process.env.EMAIL_USER;
      delete process.env.EMAIL_USER;

      expect(isMailConfigured()).toBe(false);

      process.env.EMAIL_USER = originalUser;
    });

    it('should return false when EMAIL_PASS is missing', () => {
      const originalPass = process.env.EMAIL_PASS;
      delete process.env.EMAIL_PASS;

      expect(isMailConfigured()).toBe(false);

      process.env.EMAIL_PASS = originalPass;
    });

    it('should return false when both are missing', () => {
      const originalUser = process.env.EMAIL_USER;
      const originalPass = process.env.EMAIL_PASS;
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;

      expect(isMailConfigured()).toBe(false);

      process.env.EMAIL_USER = originalUser;
      process.env.EMAIL_PASS = originalPass;
    });

    it('should return false when EMAIL_USER is empty string', () => {
      const originalUser = process.env.EMAIL_USER;
      process.env.EMAIL_USER = '';

      expect(isMailConfigured()).toBe(false);

      process.env.EMAIL_USER = originalUser;
    });

    it('should return false when EMAIL_PASS is empty string', () => {
      const originalPass = process.env.EMAIL_PASS;
      process.env.EMAIL_PASS = '';

      expect(isMailConfigured()).toBe(false);

      process.env.EMAIL_PASS = originalPass;
    });
  });
});
