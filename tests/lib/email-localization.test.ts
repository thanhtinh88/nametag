import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emailTemplates } from '@/lib/email';

describe('Email Localization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Account Verification Email', () => {
    it('should generate English verification email', async () => {
      const url = 'https://example.com/verify?token=abc123';
      const { subject, html, text } = await emailTemplates.accountVerification(url, 'en');

      expect(subject.toLowerCase()).toContain('verify');
      expect(subject).toContain('Nametag');
      expect(html.toLowerCase()).toContain('verify');
      expect(html).toContain(url);
      expect(text.toLowerCase()).toContain('verify');
      expect(text).toContain(url);
    });

    it('should generate Vietnamese verification email', async () => {
      const url = 'https://example.com/verify?token=abc123';
      const { subject, html, text } = await emailTemplates.accountVerification(url, 'vi-VN');

      expect(subject.toLowerCase()).toContain('xác thực');
      expect(subject).toContain('Nametag');
      expect(html.toLowerCase()).toContain('xác thực');
      expect(html).toContain(url);
      expect(text.toLowerCase()).toContain('xác thực');
      expect(text).toContain(url);
    });
  });

  describe('Password Reset Email', () => {
    it('should generate English password reset email', async () => {
      const url = 'https://example.com/reset?token=abc123';
      const { subject, html, text } = await emailTemplates.passwordReset(url, 'en');

      expect(subject).toContain('Reset');
      expect(subject).toContain('password');
      expect(html).toContain('Reset');
      expect(html).toContain(url);
      expect(text).toContain(url);
    });

    it('should generate Vietnamese password reset email', async () => {
      const url = 'https://example.com/reset?token=abc123';
      const { subject, html, text } = await emailTemplates.passwordReset(url, 'vi-VN');

      expect(subject).toContain('Đặt lại mật khẩu');
      expect(html).toContain('Đặt lại mật khẩu');
      expect(html).toContain(url);
      expect(text).toContain(url);
    });
  });

  describe('Important Date Reminder Email', () => {
    it('should generate English important date reminder', async () => {
      const { subject, html, text } = await emailTemplates.importantDateReminder(
        'John Doe',
        'Birthday',
        'January 15, 2024',
        'https://nametag.one/unsubscribe?token=test',
        'en'
      );

      expect(subject).toContain('Reminder');
      expect(subject).toContain('John Doe');
      expect(html).toContain('John Doe');
      expect(html).toContain('Birthday');
      expect(html).toContain('January 15, 2024');
      expect(text).toContain('John Doe');
    });

    it('should generate Vietnamese important date reminder', async () => {
      const { subject, html, text } = await emailTemplates.importantDateReminder(
        'John Doe',
        'Sinh nhật',
        '15 tháng 1, 2024',
        'https://nametag.one/unsubscribe?token=test',
        'vi-VN'
      );

      expect(subject).toContain('Nhắc nhở');
      expect(subject).toContain('John Doe');
      expect(html).toContain('John Doe');
      expect(html).toContain('Sinh nhật');
      expect(html).toContain('15 tháng 1, 2024');
      expect(text).toContain('John Doe');
    });
  });

  describe('Contact Reminder Email', () => {
    it('should generate English contact reminder', async () => {
      const { subject, html, text } = await emailTemplates.contactReminder(
        'Jane Smith',
        'December 1, 2023',
        '2 months',
        'https://nametag.one/unsubscribe?token=test',
        'en'
      );

      expect(subject.toLowerCase()).toContain('time to');
      expect(subject).toContain('Jane Smith');
      expect(html).toContain('Jane Smith');
      expect(html).toContain('December 1, 2023');
      expect(html).toContain('2 months');
      expect(text).toContain('Jane Smith');
    });

    it('should generate Vietnamese contact reminder', async () => {
      const { subject, html, text } = await emailTemplates.contactReminder(
        'Jane Smith',
        '1 tháng 12, 2023',
        '2 tháng',
        'https://nametag.one/unsubscribe?token=test',
        'vi-VN'
      );

      expect(subject).toContain('Đã đến lúc');
      expect(subject).toContain('Jane Smith');
      expect(html).toContain('Jane Smith');
      expect(html).toContain('1 tháng 12, 2023');
      expect(html).toContain('2 tháng');
      expect(text).toContain('Jane Smith');
    });
  });

  describe('Subscription Created Email', () => {
    it('should generate English subscription created email', async () => {
      const { subject, html, text } = await emailTemplates.subscriptionCreated(
        'Pro',
        '$9.99',
        'billed monthly',
        'en'
      );

      expect(subject.toLowerCase()).toContain('welcome');
      expect(html).toContain('Pro');
      expect(html).toContain('$9.99');
      expect(html).toContain('billed monthly');
      expect(text).toContain('Pro');
    });

    it('should generate Vietnamese subscription created email', async () => {
      const { subject, html, text } = await emailTemplates.subscriptionCreated(
        'Pro',
        '$9.99',
        'thanh toán hàng tháng',
        'vi-VN'
      );

      expect(subject).toContain('Chào mừng');
      expect(html).toContain('Pro');
      expect(html).toContain('$9.99');
      expect(text).toContain('Pro');
    });
  });

  describe('Subscription Changed Email', () => {
    it('should generate English upgrade email', async () => {
      const { subject, html, text } = await emailTemplates.subscriptionChanged(
        'Personal',
        'Pro',
        '$9.99',
        'billed monthly',
        true,
        'en'
      );

      expect(subject).toContain('upgraded');
      expect(html).toContain('Personal');
      expect(html).toContain('Pro');
      expect(html).toContain('$9.99');
      expect(text).toContain('Pro');
    });

    it('should generate Vietnamese upgrade email', async () => {
      const { subject, html, text } = await emailTemplates.subscriptionChanged(
        'Personal',
        'Pro',
        '$9.99',
        'thanh toán hàng tháng',
        true,
        'vi-VN'
      );

      expect(subject).toContain('nâng cấp');
      expect(html).toContain('Personal');
      expect(html).toContain('Pro');
      expect(html).toContain('$9.99');
      expect(text).toContain('Pro');
    });

    it('should generate English downgrade email', async () => {
      const { subject, html, text } = await emailTemplates.subscriptionChanged(
        'Pro',
        'Personal',
        '$4.99',
        'billed monthly',
        false,
        'en'
      );

      expect(subject).toContain('changed');
      expect(html).toContain('Pro');
      expect(html).toContain('Personal');
      expect(text).toContain('Personal');
    });
  });

  describe('Subscription Canceled Email', () => {
    it('should generate English cancellation email with access date', async () => {
      const { subject, html, text } = await emailTemplates.subscriptionCanceled(
        'Pro',
        'January 31, 2024',
        false,
        'en'
      );

      expect(subject.toLowerCase()).toContain('cancel');
      expect(html).toContain('Pro');
      expect(html).toContain('January 31, 2024');
      expect(text).toContain('Pro');
    });

    it('should generate Vietnamese cancellation email', async () => {
      const { subject, html, text } = await emailTemplates.subscriptionCanceled(
        'Pro',
        '31 tháng 1, 2024',
        false,
        'vi-VN'
      );

      expect(subject).toContain('hủy');
      expect(html).toContain('Pro');
      expect(html).toContain('31 tháng 1, 2024');
      expect(text).toContain('Pro');
    });

    it('should handle immediate cancellation', async () => {
      const { subject, html, text } = await emailTemplates.subscriptionCanceled(
        'Pro',
        null,
        true,
        'en'
      );

      expect(subject.toLowerCase()).toContain('cancel');
      expect(html).toContain('Pro');
      expect(html.toLowerCase()).toContain('downgraded');
      expect(text).toContain('Pro');
    });
  });

});

