const postmark = require('postmark');
const config = require('../config');
const path = require('path');
const fs = require('fs').promises;

class EmailService {
  constructor() {
    this.client = null;
    this.templates = new Map();
    this.initialized = false;

    if (config.email.enabled && config.email.postmark.apiToken) {
      this.client = new postmark.ServerClient(config.email.postmark.apiToken);
      this.initialized = true;
    }
  }

  isEnabled() {
    return this.initialized && config.email.enabled;
  }

  async sendEmail(to, subject, htmlBody, textBody = null, attachments = []) {
    if (!this.isEnabled()) {
      console.log('Email service is disabled. Would have sent:', { to, subject });
      return { success: false, reason: 'Email service disabled' };
    }

    try {
      const emailData = {
        From: `${config.email.postmark.fromName} <${config.email.postmark.fromEmail}>`,
        To: to,
        Subject: subject,
        HtmlBody: htmlBody,
        TextBody: textBody || this.stripHtml(htmlBody),
        MessageStream: 'outbound'
      };

      if (attachments.length > 0) {
        emailData.Attachments = attachments;
      }

      const result = await this.client.sendEmail(emailData);
      
      console.log(`Email sent successfully to ${to}: ${result.MessageID}`);
      return { success: true, messageId: result.MessageID };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendBulkEmails(recipients, subject, htmlTemplate, data = {}) {
    if (!this.isEnabled()) {
      console.log('Email service is disabled. Would have sent bulk emails to:', recipients.length, 'recipients');
      return { success: false, reason: 'Email service disabled' };
    }

    const messages = recipients.map(recipient => ({
      From: `${config.email.postmark.fromName} <${config.email.postmark.fromEmail}>`,
      To: recipient.email,
      Subject: subject,
      HtmlBody: this.renderTemplate(htmlTemplate, { ...data, recipient }),
      TextBody: this.stripHtml(this.renderTemplate(htmlTemplate, { ...data, recipient })),
      MessageStream: 'outbound'
    }));

    try {
      const results = await this.client.sendEmailBatch(messages);
      const successful = results.filter(r => r.ErrorCode === 0).length;
      const failed = results.filter(r => r.ErrorCode !== 0);

      if (failed.length > 0) {
        console.error('Some emails failed to send:', failed);
      }

      return {
        success: true,
        sent: successful,
        failed: failed.length,
        details: results
      };
    } catch (error) {
      console.error('Failed to send bulk emails:', error);
      return { success: false, error: error.message };
    }
  }

  async sendReminderEmail(engineer, pendingItems) {
    const subject = `DC Migration: You have ${pendingItems.total} pending items`;
    
    const htmlBody = this.renderTemplate('reminder', {
      engineer,
      pendingItems,
      deadline: config.system.migrationDeadline,
      dashboardUrl: `${config.app.baseUrl}/tracking.html`
    });

    return this.sendEmail(engineer.email, subject, htmlBody);
  }

  async sendDailyReport(recipients, reportData) {
    const subject = `DC Migration Daily Report - ${new Date().toLocaleDateString()}`;
    
    const htmlBody = this.renderTemplate('daily-report', {
      reportData,
      deadline: config.system.migrationDeadline,
      dashboardUrl: `${config.app.baseUrl}`
    });

    const promises = recipients.map(recipient => 
      this.sendEmail(recipient.email, subject, htmlBody)
    );

    const results = await Promise.allSettled(promises);
    
    return {
      sent: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
      failed: results.filter(r => r.status === 'rejected' || !r.value.success).length,
      results
    };
  }

  async sendCompletionNotification(item, type, engineer) {
    const subject = `DC Migration: ${type} completed - ${item.name || item.vm_name || item.id}`;
    
    const htmlBody = this.renderTemplate('completion', {
      item,
      type,
      engineer,
      completedAt: new Date(),
      dashboardUrl: `${config.app.baseUrl}/tracking.html`
    });

    // Send to relevant stakeholders
    const recipients = await this.getStakeholders(item, type);
    
    const promises = recipients.map(recipient => 
      this.sendEmail(recipient, subject, htmlBody)
    );

    return Promise.allSettled(promises);
  }

  async sendUserInvitation(email, data) {
    const subject = 'Welcome to DC Migration System';
    
    const htmlBody = this.renderTemplate('user-invitation', {
      ...data,
      systemName: 'DC Migration System',
      deadline: config.system.migrationDeadline
    });

    return this.sendEmail(email, subject, htmlBody);
  }

  async sendPasswordReset(email, data) {
    const subject = 'DC Migration System - Password Reset';
    
    const htmlBody = this.renderTemplate('password-reset', {
      ...data,
      systemName: 'DC Migration System'
    });

    return this.sendEmail(email, subject, htmlBody);
  }

  async sendCriticalItemAlert(item, assignee) {
    const subject = `URGENT: Critical DC Migration Item - ${item.title}`;
    
    const htmlBody = this.renderTemplate('critical-alert', {
      item,
      assignee,
      deadline: item.deadline,
      dashboardUrl: `${config.app.baseUrl}/tracking.html#critical`
    });

    return this.sendEmail(assignee.email, subject, htmlBody);
  }

  async sendWeeklyDigest(recipients, digestData) {
    const subject = `DC Migration Weekly Digest - Week of ${new Date().toLocaleDateString()}`;
    
    const htmlBody = this.renderTemplate('weekly-digest', {
      digestData,
      deadline: config.system.migrationDeadline,
      dashboardUrl: `${config.app.baseUrl}`
    });

    return this.sendBulkEmails(recipients, subject, 'weekly-digest', digestData);
  }

  // Template Management

  renderTemplate(templateName, data) {
    // For now, using inline templates. In production, these would be loaded from files
    const templates = {
      reminder: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat-box { text-align: center; padding: 10px; background: white; border-radius: 5px; }
            .stat-number { font-size: 24px; font-weight: bold; color: #3498db; }
            .stat-label { font-size: 12px; color: #666; }
            .items-list { margin: 20px 0; }
            .item { background: white; padding: 10px; margin: 5px 0; border-left: 3px solid #3498db; }
            .button { display: inline-block; padding: 10px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; }
            .urgent { border-left-color: #e74c3c !important; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>DC Migration Reminder</h1>
              <p>Hello ${data.engineer.first_name},</p>
            </div>
            <div class="content">
              <p>You have <strong>${data.pendingItems.total} pending items</strong> for the DC migration project.</p>
              
              <div class="stats">
                <div class="stat-box">
                  <div class="stat-number">${data.pendingItems.servers || 0}</div>
                  <div class="stat-label">Servers</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${data.pendingItems.networks || 0}</div>
                  <div class="stat-label">Networks</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${data.pendingItems.critical || 0}</div>
                  <div class="stat-label">Critical Items</div>
                </div>
              </div>

              <p>The migration deadline is <strong>${new Date(data.deadline).toLocaleDateString()}</strong>.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.dashboardUrl}" class="button">View Dashboard</a>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated reminder from the DC Migration System.</p>
            </div>
          </div>
        </body>
        </html>
      `,

      'daily-report': `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .progress-bar { background: #f0f0f0; height: 30px; border-radius: 15px; overflow: hidden; margin: 20px 0; }
            .progress-fill { background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
            .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
            .stat-value { font-size: 28px; font-weight: bold; color: #667eea; }
            .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f8f9fa; padding: 10px; text-align: left; border-bottom: 2px solid #e0e0e0; }
            td { padding: 10px; border-bottom: 1px solid #e0e0e0; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f8f9fa; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>DC Migration Daily Report</h1>
              <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div class="content">
              <h2>Overall Progress</h2>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${data.reportData.overallProgress}%">
                  ${data.reportData.overallProgress}% Complete
                </div>
              </div>
              
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-value">${data.reportData.totalCompleted}</div>
                  <div class="stat-label">Completed Today</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${data.reportData.totalPending}</div>
                  <div class="stat-label">Remaining</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${data.reportData.daysRemaining}</div>
                  <div class="stat-label">Days to Deadline</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${data.reportData.requiredDaily}</div>
                  <div class="stat-label">Required Daily</div>
                </div>
              </div>

              <h2>Progress by Category</h2>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Completed</th>
                    <th>Pending</th>
                    <th>Total</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.reportData.categories.map(cat => `
                    <tr>
                      <td>${cat.name}</td>
                      <td>${cat.completed}</td>
                      <td>${cat.pending}</td>
                      <td>${cat.total}</td>
                      <td>${cat.percentage}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.dashboardUrl}" class="button">View Dashboard</a>
                <a href="${data.dashboardUrl}/tracking.html" class="button">Manage Items</a>
              </div>
            </div>
            <div class="footer">
              <p>This report was automatically generated by the DC Migration System.</p>
            </div>
          </div>
        </body>
        </html>
      `,

      completion: `
        <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Migration Item Completed</h2>
          <p>A ${data.type} has been marked as completed:</p>
          <ul>
            <li><strong>Item:</strong> ${data.item.name || data.item.vm_name || data.item.id}</li>
            <li><strong>Completed by:</strong> ${data.engineer.first_name} ${data.engineer.last_name}</li>
            <li><strong>Completed at:</strong> ${data.completedAt}</li>
          </ul>
          <p><a href="${data.dashboardUrl}">View Dashboard</a></p>
        </body>
        </html>
      `,

      'critical-alert': `
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="border-left: 4px solid #e74c3c; padding-left: 10px;">
            <h2 style="color: #e74c3c;">⚠️ Critical Item Alert</h2>
            <p>You have been assigned a critical migration item:</p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
              <h3>${data.item.title}</h3>
              <p>${data.item.description}</p>
              <p><strong>Priority:</strong> ${data.item.priority}</p>
              <p><strong>Deadline:</strong> ${new Date(data.deadline).toLocaleDateString()}</p>
            </div>
            <p><a href="${data.dashboardUrl}" style="background: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Item</a></p>
          </div>
        </body>
        </html>
      `
    };

    const template = templates[templateName] || '<p>Template not found</p>';
    return this.interpolate(template, data);
  }

  interpolate(template, data) {
    return template.replace(/\${([^}]+)}/g, (match, path) => {
      const keys = path.split('.');
      let value = data;
      
      for (const key of keys) {
        value = value?.[key];
      }
      
      return value !== undefined ? value : '';
    });
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  async getStakeholders(item, type) {
    // This would be implemented to fetch relevant stakeholders based on item and type
    // For now, returning empty array
    return [];
  }

  // Test email functionality
  async sendTestEmail(to) {
    const subject = 'DC Migration System - Test Email';
    const htmlBody = `
      <html>
      <body>
        <h2>Test Email Successful</h2>
        <p>This is a test email from the DC Migration System.</p>
        <p>If you received this email, your email configuration is working correctly.</p>
        <hr>
        <p><small>Sent at: ${new Date().toISOString()}</small></p>
      </body>
      </html>
    `;

    return this.sendEmail(to, subject, htmlBody);
  }
}

module.exports = new EmailService();