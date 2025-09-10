const cron = require('node-cron');
const config = require('../config');
const emailService = require('./EmailService');
const ReportService = require('./ReportService');
const User = require('../models/User');
const Server = require('../models/Server');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.userModel = new User();
    this.serverModel = new Server();
    this.reportService = new ReportService();
  }

  start() {
    console.log('Starting scheduler service...');

    // Schedule daily reports
    if (config.email.dailyReportEnabled) {
      this.scheduleDailyReports();
    }

    // Schedule reminder emails
    if (config.email.reminderEnabled) {
      this.scheduleReminders();
    }

    // Schedule weekly digest
    this.scheduleWeeklyDigest();

    // Schedule database backup
    this.scheduleDatabaseBackup();

    console.log(`Scheduler service started with ${this.jobs.size} jobs`);
  }

  stop() {
    console.log('Stopping scheduler service...');
    
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`Stopped job: ${name}`);
    }
    
    this.jobs.clear();
  }

  scheduleDailyReports() {
    const [hour, minute] = config.email.dailyReportTime.split(':');
    const schedule = `${minute || 0} ${hour || 8} * * *`; // Daily at specified time

    const job = cron.schedule(schedule, async () => {
      console.log('Running daily report job...');
      
      try {
        // Generate report data
        const reportData = await this.reportService.generateDailyReport();
        
        // Get recipients (admins and managers)
        const recipients = await this.userModel.findAll({ 
          role: ['admin', 'manager'],
          is_active: true 
        });

        if (recipients.length > 0) {
          const result = await emailService.sendDailyReport(recipients, reportData);
          console.log(`Daily report sent to ${result.sent} recipients`);
        }
      } catch (error) {
        console.error('Failed to send daily report:', error);
      }
    });

    this.jobs.set('daily-report', job);
    console.log(`Scheduled daily reports at ${config.email.dailyReportTime}`);
  }

  scheduleReminders() {
    // Run reminders every day at 9 AM
    const job = cron.schedule('0 9 * * *', async () => {
      console.log('Running reminder job...');
      
      try {
        const deadline = config.system.migrationDeadline;
        const now = new Date();
        const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

        // Check if we should send reminders based on configured days
        if (!config.email.reminderDaysBeforeDeadline.includes(daysUntilDeadline)) {
          return;
        }

        // Get all engineers with pending items
        const engineers = await this.userModel.getEngineers();
        
        for (const engineer of engineers) {
          const pendingItems = await this.getPendingItemsForEngineer(engineer.id);
          
          if (pendingItems.total > 0) {
            await emailService.sendReminderEmail(engineer, pendingItems);
            console.log(`Reminder sent to ${engineer.email}: ${pendingItems.total} pending items`);
          }
        }
      } catch (error) {
        console.error('Failed to send reminders:', error);
      }
    });

    this.jobs.set('reminders', job);
    console.log('Scheduled reminder emails');
  }

  scheduleWeeklyDigest() {
    // Run every Monday at 8 AM
    const job = cron.schedule('0 8 * * 1', async () => {
      console.log('Running weekly digest job...');
      
      try {
        const digestData = await this.reportService.generateWeeklyDigest();
        
        // Get all active users
        const recipients = await this.userModel.getActiveUsers();
        
        if (recipients.length > 0) {
          const result = await emailService.sendWeeklyDigest(recipients, digestData);
          console.log(`Weekly digest sent to ${result.sent} recipients`);
        }
      } catch (error) {
        console.error('Failed to send weekly digest:', error);
      }
    });

    this.jobs.set('weekly-digest', job);
    console.log('Scheduled weekly digest emails');
  }

  scheduleDatabaseBackup() {
    // Run database backup every day at 2 AM
    const job = cron.schedule('0 2 * * *', async () => {
      console.log('Running database backup job...');
      
      try {
        const Database = require('../database/Database');
        const db = Database.getInstance();
        
        const backupFile = await db.backup();
        console.log(`Database backed up to: ${backupFile}`);
        
        // Clean up old backups
        await this.cleanupOldBackups();
      } catch (error) {
        console.error('Failed to backup database:', error);
      }
    });

    this.jobs.set('database-backup', job);
    console.log('Scheduled database backups');
  }

  async getPendingItemsForEngineer(engineerId) {
    const entities = [
      { model: require('../models/Server'), name: 'servers' },
      { model: require('../models/VLAN'), name: 'vlans' },
      { model: require('../models/Network'), name: 'networks' },
      { model: require('../models/VoiceSystem'), name: 'voice_systems' },
      { model: require('../models/ColoCustomer'), name: 'colo_customers' },
      { model: require('../models/CarrierCircuit'), name: 'carrier_circuits' },
      { model: require('../models/PublicNetwork'), name: 'public_networks' },
      { model: require('../models/CarrierNNI'), name: 'carrier_nnis' }
    ];

    const pendingItems = {
      total: 0,
      servers: 0,
      networks: 0,
      vlans: 0,
      voice_systems: 0,
      critical: 0,
      details: []
    };

    for (const { model, name } of entities) {
      try {
        const instance = new model();
        const items = await instance.findAll({ 
          assigned_engineer: engineerId,
          // This would need to be adjusted based on each entity's completion criteria
        });
        
        const pending = items.filter(item => !this.isItemCompleted(item, name));
        pendingItems[name] = pending.length;
        pendingItems.total += pending.length;
        
        // Add details for the email
        pending.forEach(item => {
          pendingItems.details.push({
            type: name,
            name: item.name || item.vm_name || item.id,
            deadline: item.migration_date || item.cutover_date
          });
        });
      } catch (error) {
        console.error(`Error getting pending ${name}:`, error);
      }
    }

    // Get critical items
    try {
      const CriticalItem = require('../models/CriticalItem');
      const criticalModel = new CriticalItem();
      const criticalItems = await criticalModel.findAll({
        assigned_to: engineerId,
        status: ['pending', 'in_progress']
      });
      
      pendingItems.critical = criticalItems.length;
      pendingItems.total += criticalItems.length;
    } catch (error) {
      console.error('Error getting critical items:', error);
    }

    return pendingItems;
  }

  isItemCompleted(item, entityType) {
    const completionCriteria = {
      servers: (item) => item.customer_notified_successful_cutover === 1,
      vlans: (item) => item.migrated === 1 && item.verified === 1,
      networks: (item) => item.cutover_completed === 1,
      voice_systems: (item) => item.cutover_completed === 1,
      colo_customers: (item) => item.migration_completed === 1,
      carrier_circuits: (item) => item.cutover_completed === 1,
      public_networks: (item) => item.cutover_completed === 1,
      carrier_nnis: (item) => item.cutover_completed === 1
    };

    const checkCompletion = completionCriteria[entityType];
    return checkCompletion ? checkCompletion(item) : false;
  }

  async cleanupOldBackups() {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const backupDir = config.database.backupPath;
      const files = await fs.readdir(backupDir);
      
      // Sort files by modification time
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);
          return { file, path: filePath, mtime: stats.mtime };
        })
      );
      
      fileStats.sort((a, b) => b.mtime - a.mtime);
      
      // Keep only the configured number of backups
      const toDelete = fileStats.slice(config.database.backupRetention);
      
      for (const fileInfo of toDelete) {
        await fs.unlink(fileInfo.path);
        console.log(`Deleted old backup: ${fileInfo.file}`);
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  // Manual trigger methods for testing
  async triggerDailyReport() {
    console.log('Manually triggering daily report...');
    const reportData = await this.reportService.generateDailyReport();
    const recipients = await this.userModel.findAll({ 
      role: ['admin', 'manager'],
      is_active: true 
    });
    
    if (recipients.length > 0) {
      return emailService.sendDailyReport(recipients, reportData);
    }
    
    return { sent: 0, failed: 0 };
  }

  async triggerReminders() {
    console.log('Manually triggering reminders...');
    const engineers = await this.userModel.getEngineers();
    const results = [];
    
    for (const engineer of engineers) {
      const pendingItems = await this.getPendingItemsForEngineer(engineer.id);
      
      if (pendingItems.total > 0) {
        const result = await emailService.sendReminderEmail(engineer, pendingItems);
        results.push({ engineer: engineer.email, ...result });
      }
    }
    
    return results;
  }
}

module.exports = new SchedulerService();