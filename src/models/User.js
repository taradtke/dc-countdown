const bcrypt = require('bcrypt');
const BaseModel = require('./BaseModel');
const config = require('../config');

class User extends BaseModel {
  constructor() {
    super('users', {
      email: 'string',
      password: 'string',
      first_name: 'string',
      last_name: 'string',
      role: 'string',
      is_active: 'boolean',
      is_engineer: 'boolean',
      last_login: 'datetime',
      created_at: 'datetime',
      updated_at: 'datetime'
    });
  }

  async create(userData) {
    // Hash password before saving
    if (userData.password) {
      userData.password = await this.hashPassword(userData.password);
    }

    // Set defaults
    userData.is_active = userData.is_active !== false;
    userData.role = userData.role || 'user';
    userData.is_engineer = userData.is_engineer || false;

    return super.create(userData);
  }

  async update(id, userData) {
    // Hash password if being updated
    if (userData.password) {
      userData.password = await this.hashPassword(userData.password);
    }

    return super.update(id, userData);
  }

  async findByEmail(email) {
    return this.findOne({ email: email.toLowerCase() });
  }

  async authenticate(email, password) {
    const user = await this.findByEmail(email);
    
    if (!user || !user.is_active) {
      return null;
    }

    const isValid = await this.verifyPassword(password, user.password);
    
    if (!isValid) {
      return null;
    }

    // Update last login
    await this.updateLastLogin(user.id);

    // Remove password from response
    delete user.password;
    return user;
  }

  async updateLastLogin(userId) {
    const query = this.dbType === 'postgres' ? `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = $1
    ` : `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    return this.execute(query, [userId]);
  }

  async hashPassword(password) {
    return bcrypt.hash(password, config.auth.bcryptRounds);
  }

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  async changePassword(userId, newPassword) {
    const user = await this.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const hashedPassword = await this.hashPassword(newPassword);
    
    return this.update(userId, { password: hashedPassword });
  }

  async resetPassword(userId, newPassword) {
    const user = await this.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const hashedPassword = await this.hashPassword(newPassword);
    
    return this.update(userId, { password: hashedPassword });
  }

  async getEngineers() {
    return this.findAll({ is_engineer: true, is_active: true });
  }

  async getActiveUsers() {
    return this.findAll({ is_active: true });
  }

  async deactivate(userId) {
    return this.update(userId, { is_active: false });
  }

  async activate(userId) {
    return this.update(userId, { is_active: true });
  }

  async assignRole(userId, role) {
    const validRoles = ['admin', 'manager', 'engineer', 'user'];
    
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    const updates = { role };
    
    // Auto-set is_engineer flag based on role
    if (role === 'engineer') {
      updates.is_engineer = true;
    }

    return this.update(userId, updates);
  }

  async getUserStats(userId) {
    const stats = {};

    // Get assigned items counts
    const entities = [
      'servers', 'vlans', 'networks', 'voice_systems',
      'colo_customers', 'carrier_circuits', 'public_networks', 'carrier_nnis'
    ];

    for (const entity of entities) {
      const countQuery = `
        SELECT COUNT(*) as total,
               SUM(CASE WHEN ${this.getCompletionField(entity)} THEN 1 ELSE 0 END) as completed
        FROM ${entity}
        WHERE assigned_engineer = ?
      `;
      
      const result = await this.queryOne(countQuery, [userId]);
      stats[entity] = {
        total: result.total || 0,
        completed: result.completed || 0,
        pending: (result.total || 0) - (result.completed || 0)
      };
    }

    // Get critical items
    const criticalQuery = `
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM critical_items
      WHERE assigned_to = ?
    `;
    
    const criticalResult = await this.queryOne(criticalQuery, [userId]);
    stats.critical_items = {
      total: criticalResult.total || 0,
      completed: criticalResult.completed || 0,
      pending: (criticalResult.total || 0) - (criticalResult.completed || 0)
    };

    return stats;
  }

  getCompletionField(entity) {
    const completionFields = {
      servers: 'customer_notified_successful_cutover = 1',
      vlans: 'migrated = 1 AND verified = 1',
      networks: 'cutover_completed = 1',
      voice_systems: 'cutover_completed = 1',
      colo_customers: 'migration_completed = 1',
      carrier_circuits: 'cutover_completed = 1',
      public_networks: 'cutover_completed = 1',
      carrier_nnis: 'cutover_completed = 1'
    };

    return completionFields[entity] || 'completed = 1';
  }

  sanitizeUser(user) {
    if (!user) return null;
    
    const sanitized = { ...user };
    delete sanitized.password;
    return sanitized;
  }

  async createDefaultAdmin() {
    const adminExists = await this.exists({ role: 'admin' });
    
    if (!adminExists) {
      return this.create({
        email: 'admin@example.com',
        password: 'changeme123',
        first_name: 'System',
        last_name: 'Administrator',
        role: 'admin',
        is_active: true
      });
    }
  }
}

module.exports = User;