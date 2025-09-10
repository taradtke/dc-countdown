const BaseModel = require('./BaseModel');

class Network extends BaseModel {
  constructor() {
    super('networks', {
      network_name: 'string',
      provider: 'string',
      circuit_id: 'string',
      bandwidth: 'string',
      location: 'string',
      assigned_engineer: 'string',
      cutover_scheduled: 'boolean',
      cutover_date: 'date',
      cutover_completed: 'boolean',
      testing_status: 'string',
      notes: 'text',
      created_at: 'datetime',
      updated_at: 'datetime'
    });
  }

  async getCompleted() {
    return this.findAll({ cutover_completed: 1 });
  }

  async getPending() {
    return this.query(`
      SELECT * FROM networks 
      WHERE cutover_completed != 1 OR cutover_completed IS NULL
      ORDER BY cutover_date, network_name
    `);
  }

  async markAsCompleted(id) {
    return this.update(id, {
      cutover_completed: true,
      cutover_date: new Date().toISOString()
    });
  }

  async scheduleCutover(id, date) {
    return this.update(id, {
      cutover_scheduled: true,
      cutover_date: date
    });
  }

  async getStats() {
    const stats = await this.queryOne(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN cutover_completed = 1 THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN cutover_scheduled = 1 AND cutover_completed != 1 THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN testing_status = 'passed' THEN 1 ELSE 0 END) as tested
      FROM networks
    `);

    stats.pending = stats.total - stats.completed;
    stats.completion_percentage = stats.total > 0 
      ? Math.round((stats.completed / stats.total) * 100) 
      : 0;

    return stats;
  }

  async importFromCSV(data) {
    const mappedData = data.map(row => ({
      network_name: row['Network Name'] || row.network_name,
      provider: row['Provider'] || row.provider,
      circuit_id: row['Circuit ID'] || row.circuit_id,
      bandwidth: row['Bandwidth'] || row.bandwidth,
      location: row['Location'] || row.location,
      assigned_engineer: row['Assigned Engineer'] || row.assigned_engineer || null
    }));

    return this.bulkCreate(mappedData);
  }
}

module.exports = Network;