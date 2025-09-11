const BaseModel = require('./BaseModel');

class VLAN extends BaseModel {
  constructor() {
    super('vlans', {
      vlan_id: 'integer',
      name: 'string',
      description: 'text',
      network: 'string',
      gateway: 'string',
      assigned_engineer: 'string',
      engineer_completed_work: 'string',
      migrated: 'boolean',
      verified: 'boolean',
      migration_date: 'date',
      verification_date: 'date',
      notes: 'text',
      created_at: 'datetime',
      updated_at: 'datetime'
    });
  }

  async getCompleted() {
    return this.query(`
      SELECT * FROM vlans 
      WHERE migrated = 1 AND verified = 1
    `);
  }

  async getPending() {
    return this.query(`
      SELECT * FROM vlans 
      WHERE migrated != 1 OR verified != 1 OR migrated IS NULL OR verified IS NULL
      ORDER BY vlan_id
    `);
  }

  async markAsMigrated(id) {
    return this.update(id, {
      migrated: true,
      migration_date: new Date().toISOString()
    });
  }

  async markAsVerified(id) {
    return this.update(id, {
      verified: true,
      verification_date: new Date().toISOString()
    });
  }

  async markAsCompleted(id) {
    return this.update(id, {
      migrated: true,
      verified: true,
      migration_date: new Date().toISOString(),
      verification_date: new Date().toISOString()
    });
  }

  async getStats() {
    const stats = await this.queryOne(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN migrated = 1 AND verified = 1 THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN migrated = 1 AND (verified != 1 OR verified IS NULL) THEN 1 ELSE 0 END) as awaiting_verification,
        SUM(CASE WHEN migrated != 1 OR migrated IS NULL THEN 1 ELSE 0 END) as not_migrated
      FROM vlans
    `);

    stats.pending = stats.total - stats.completed;
    stats.completion_percentage = stats.total > 0 
      ? Math.round((stats.completed / stats.total) * 100) 
      : 0;

    return stats;
  }

  async importFromCSV(data) {
    const mappedData = data.map(row => ({
      vlan_id: parseInt(row['VLAN ID'] || row.vlan_id) || null,
      name: row['Name'] || row.name,
      description: row['Description'] || row.description,
      network: row['Network'] || row.network,
      gateway: row['Gateway'] || row.gateway,
      assigned_engineer: row['Assigned Engineer'] || row.assigned_engineer || null
    }));

    return this.bulkCreate(mappedData);
  }
}

module.exports = VLAN;