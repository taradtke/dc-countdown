const config = require('../config');

class ReportService {
  constructor() {
    this.entities = [
      { name: 'servers', model: require('../models/Server'), completionField: 'customer_notified_successful_cutover' },
      { name: 'vlans', model: require('../models/VLAN'), completionField: 'migrated = 1 AND verified = 1' },
      { name: 'networks', model: require('../models/Network'), completionField: 'cutover_completed' },
      { name: 'voice_systems', model: require('../models/VoiceSystem'), completionField: 'cutover_completed' },
      { name: 'colo_customers', model: require('../models/ColoCustomer'), completionField: 'migration_completed' },
      { name: 'carrier_circuits', model: require('../models/CarrierCircuit'), completionField: 'cutover_completed' },
      { name: 'public_networks', model: require('../models/PublicNetwork'), completionField: 'cutover_completed' },
      { name: 'carrier_nnis', model: require('../models/CarrierNNI'), completionField: 'cutover_completed' }
    ];
  }

  async generateDailyReport() {
    const report = {
      generatedAt: new Date(),
      overallProgress: 0,
      totalCompleted: 0,
      totalPending: 0,
      completedToday: 0,
      daysRemaining: 0,
      requiredDaily: 0,
      categories: [],
      topEngineers: [],
      criticalItems: [],
      upcomingMilestones: []
    };

    // Calculate days remaining
    const now = new Date();
    const deadline = new Date(config.system.migrationDeadline);
    report.daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    // Get stats for each entity
    let totalItems = 0;
    let totalCompleted = 0;

    for (const entity of this.entities) {
      try {
        const Model = entity.model;
        const instance = new Model();
        
        const stats = await this.getEntityStats(instance, entity.completionField);
        
        report.categories.push({
          name: entity.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          completed: stats.completed,
          pending: stats.pending,
          total: stats.total,
          percentage: stats.percentage,
          completedToday: stats.completedToday
        });

        totalItems += stats.total;
        totalCompleted += stats.completed;
        report.completedToday += stats.completedToday;
      } catch (error) {
        console.error(`Error getting stats for ${entity.name}:`, error);
      }
    }

    report.totalCompleted = totalCompleted;
    report.totalPending = totalItems - totalCompleted;
    report.overallProgress = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;
    report.requiredDaily = report.daysRemaining > 0 
      ? Math.ceil(report.totalPending / report.daysRemaining) 
      : report.totalPending;

    // Get top performing engineers
    report.topEngineers = await this.getTopEngineers(5);

    // Get critical items
    report.criticalItems = await this.getCriticalItems();

    // Get upcoming milestones
    report.upcomingMilestones = await this.getUpcomingMilestones(7);

    return report;
  }

  async generateWeeklyDigest() {
    const digest = {
      weekStart: this.getWeekStart(),
      weekEnd: this.getWeekEnd(),
      summary: {},
      achievements: [],
      challenges: [],
      nextWeekFocus: [],
      engineerPerformance: []
    };

    // Get weekly summary
    digest.summary = await this.getWeeklySummary();

    // Get achievements (items completed this week)
    digest.achievements = await this.getWeeklyAchievements();

    // Get challenges (blocked or delayed items)
    digest.challenges = await this.getWeeklyChallenges();

    // Get next week focus
    digest.nextWeekFocus = await this.getNextWeekFocus();

    // Get engineer performance for the week
    digest.engineerPerformance = await this.getWeeklyEngineerPerformance();

    return digest;
  }

  async getEntityStats(model, completionField) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get total and completed counts
    const allItems = await model.findAll();
    const completed = allItems.filter(item => this.checkCompletion(item, completionField));
    
    // Get items completed today
    const completedToday = completed.filter(item => {
      const updatedAt = new Date(item.updated_at);
      return updatedAt >= today;
    });

    return {
      total: allItems.length,
      completed: completed.length,
      pending: allItems.length - completed.length,
      percentage: allItems.length > 0 
        ? Math.round((completed.length / allItems.length) * 100) 
        : 0,
      completedToday: completedToday.length
    };
  }

  checkCompletion(item, completionField) {
    if (completionField.includes('AND')) {
      // Handle complex conditions like "migrated = 1 AND verified = 1"
      const conditions = completionField.split('AND').map(c => c.trim());
      return conditions.every(condition => {
        const [field, value] = condition.split('=').map(s => s.trim());
        return item[field] == value;
      });
    } else {
      // Simple field check
      return item[completionField] == 1;
    }
  }

  async getTopEngineers(limit = 5) {
    const User = require('../models/User');
    const userModel = new User();
    
    const engineers = await userModel.getEngineers();
    const engineerStats = [];

    for (const engineer of engineers) {
      const stats = await userModel.getUserStats(engineer.id);
      
      const totalCompleted = Object.values(stats)
        .filter(stat => typeof stat === 'object' && stat.completed !== undefined)
        .reduce((sum, stat) => sum + stat.completed, 0);

      engineerStats.push({
        name: `${engineer.first_name} ${engineer.last_name}`,
        email: engineer.email,
        completedThisWeek: await this.getEngineerWeeklyCompletions(engineer.id),
        totalCompleted,
        ...stats
      });
    }

    // Sort by weekly completions, then total completions
    engineerStats.sort((a, b) => {
      if (b.completedThisWeek !== a.completedThisWeek) {
        return b.completedThisWeek - a.completedThisWeek;
      }
      return b.totalCompleted - a.totalCompleted;
    });

    return engineerStats.slice(0, limit);
  }

  async getEngineerWeeklyCompletions(engineerId) {
    const weekStart = this.getWeekStart();
    let total = 0;

    for (const entity of this.entities) {
      try {
        const Model = entity.model;
        const instance = new Model();
        
        const items = await instance.query(`
          SELECT COUNT(*) as count
          FROM ${entity.name}
          WHERE assigned_engineer = ?
            AND updated_at >= ?
            AND ${entity.completionField}
        `, [engineerId, weekStart.toISOString()]);

        total += items[0]?.count || 0;
      } catch (error) {
        console.error(`Error getting weekly completions for ${entity.name}:`, error);
      }
    }

    return total;
  }

  async getCriticalItems() {
    try {
      const CriticalItem = require('../models/CriticalItem');
      const criticalModel = new CriticalItem();
      
      return criticalModel.findAll(
        { status: ['pending', 'in_progress'], priority: 'high' },
        { orderBy: 'deadline ASC', limit: 10 }
      );
    } catch (error) {
      console.error('Error getting critical items:', error);
      return [];
    }
  }

  async getUpcomingMilestones(days = 7) {
    const milestones = [];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    // Get servers with upcoming migrations
    try {
      const Server = require('../models/Server');
      const serverModel = new Server();
      
      const upcomingServers = await serverModel.getUpcoming(days);
      
      upcomingServers.forEach(server => {
        milestones.push({
          type: 'Server Migration',
          name: server.vm_name,
          customer: server.customer,
          date: server.migration_date,
          wave: server.migration_wave
        });
      });
    } catch (error) {
      console.error('Error getting upcoming server migrations:', error);
    }

    // Sort by date
    milestones.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return milestones;
  }

  async getWeeklySummary() {
    const weekStart = this.getWeekStart();
    const summary = {
      itemsCompletedThisWeek: 0,
      itemsAddedThisWeek: 0,
      averageDailyCompletion: 0,
      projectedWeeklyTotal: 0
    };

    for (const entity of this.entities) {
      try {
        const Model = entity.model;
        const instance = new Model();
        
        // Items completed this week
        const completedThisWeek = await instance.query(`
          SELECT COUNT(*) as count
          FROM ${entity.name}
          WHERE updated_at >= ?
            AND ${entity.completionField}
        `, [weekStart.toISOString()]);

        summary.itemsCompletedThisWeek += completedThisWeek[0]?.count || 0;

        // Items added this week
        const addedThisWeek = await instance.query(`
          SELECT COUNT(*) as count
          FROM ${entity.name}
          WHERE created_at >= ?
        `, [weekStart.toISOString()]);

        summary.itemsAddedThisWeek += addedThisWeek[0]?.count || 0;
      } catch (error) {
        console.error(`Error getting weekly summary for ${entity.name}:`, error);
      }
    }

    // Calculate average daily completion
    const daysSinceWeekStart = Math.ceil((new Date() - weekStart) / (1000 * 60 * 60 * 24));
    summary.averageDailyCompletion = Math.round(summary.itemsCompletedThisWeek / daysSinceWeekStart);
    summary.projectedWeeklyTotal = summary.averageDailyCompletion * 7;

    return summary;
  }

  async getWeeklyAchievements() {
    const achievements = [];
    const weekStart = this.getWeekStart();

    // Check for completion milestones
    for (const entity of this.entities) {
      try {
        const Model = entity.model;
        const instance = new Model();
        const stats = await this.getEntityStats(instance, entity.completionField);
        
        if (stats.percentage >= 75 && stats.percentage < 100) {
          achievements.push({
            type: 'milestone',
            message: `${entity.name.replace(/_/g, ' ')} reached ${stats.percentage}% completion`
          });
        } else if (stats.percentage === 100) {
          achievements.push({
            type: 'completion',
            message: `All ${entity.name.replace(/_/g, ' ')} have been migrated!`
          });
        }
      } catch (error) {
        console.error(`Error checking achievements for ${entity.name}:`, error);
      }
    }

    return achievements;
  }

  async getWeeklyChallenges() {
    const challenges = [];

    // Identify blocked or delayed items
    // This would need more sophisticated tracking in production
    
    return challenges;
  }

  async getNextWeekFocus() {
    const focus = [];
    const nextWeekStart = new Date();
    nextWeekStart.setDate(nextWeekStart.getDate() + (7 - nextWeekStart.getDay()));
    
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

    // Get items scheduled for next week
    try {
      const Server = require('../models/Server');
      const serverModel = new Server();
      
      const nextWeekServers = await serverModel.query(`
        SELECT COUNT(*) as count, migration_wave
        FROM servers
        WHERE migration_date >= ? AND migration_date < ?
          AND customer_notified_successful_cutover != 1
        GROUP BY migration_wave
        ORDER BY migration_date
      `, [nextWeekStart.toISOString(), nextWeekEnd.toISOString()]);

      nextWeekServers.forEach(wave => {
        focus.push({
          type: 'migration_wave',
          description: `Wave ${wave.migration_wave}: ${wave.count} servers scheduled`
        });
      });
    } catch (error) {
      console.error('Error getting next week focus:', error);
    }

    return focus;
  }

  async getWeeklyEngineerPerformance() {
    const engineers = await this.getTopEngineers(10);
    
    return engineers.map(eng => ({
      name: eng.name,
      completedThisWeek: eng.completedThisWeek,
      totalPending: Object.values(eng)
        .filter(stat => typeof stat === 'object' && stat.pending !== undefined)
        .reduce((sum, stat) => sum + stat.pending, 0),
      efficiency: eng.completedThisWeek > 0 
        ? Math.round((eng.completedThisWeek / (eng.completedThisWeek + 1)) * 100) 
        : 0
    }));
  }

  getWeekStart() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek;
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  getWeekEnd() {
    const weekStart = this.getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  }

  // Leaderboard data for frontend
  async getLeaderboardData() {
    const engineers = await this.getTopEngineers(20);
    
    return {
      engineers,
      lastUpdated: new Date(),
      weeklyTopPerformer: engineers[0] || null,
      mostImproved: await this.getMostImprovedEngineer()
    };
  }

  async getMostImprovedEngineer() {
    // This would compare this week's performance to last week's
    // For now, returning null
    return null;
  }
}

module.exports = ReportService;