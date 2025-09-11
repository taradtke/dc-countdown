const BaseModel = require('./BaseModel');
const customerMatcher = require('../../utils/customerMatcher');

class Server extends BaseModel {
  constructor() {
    super('servers', {
      customer: 'string',
      vm_name: 'string',
      host: 'string',
      ip_addresses: 'string',
      cores: 'integer',
      memory_capacity: 'number',
      storage_used_gib: 'number',
      storage_provisioned_gib: 'number',
      customer_contacted: 'boolean',
      test_move_date: 'date',
      move_date: 'date',
      backups_verified_working_hycu: 'boolean',
      backups_setup_verified_working_veeam: 'boolean',
      firewall_network_cutover: 'boolean',
      cutover_scheduled: 'boolean',
      cutover_scheduled_date: 'date',
      cutover_completed: 'boolean',
      cutover_completed_date: 'date',
      customer_notified_scheduled: 'boolean',
      customer_notified_scheduled_date: 'date',
      customer_notified_successful_cutover: 'boolean',
      customer_notified_successful_cutover_date: 'date',
      customer_signoff: 'boolean',
      assigned_engineer: 'string',
      engineer_completed_work: 'string',
      notes: 'text',
      created_at: 'datetime',
      updated_at: 'datetime'
    });
  }

  async getCompleted() {
    return this.findAll({ customer_notified_successful_cutover: 1 });
  }

  async getPending() {
    return this.query(`
      SELECT * FROM servers 
      WHERE customer_notified_successful_cutover IS NULL 
         OR customer_notified_successful_cutover = 0
      ORDER BY migration_wave, migration_date
    `);
  }

  async getByWave(wave) {
    return this.findAll({ migration_wave: wave });
  }

  async getByEngineer(engineer) {
    return this.findAll({ assigned_engineer: engineer });
  }

  async getByCustomer(customer) {
    return this.findAll({ customer });
  }

  async markAsCompleted(id) {
    return this.update(id, {
      cutover_completed: true,
      customer_notified_scheduled: true,
      customer_notified_successful_cutover: true,
      cutover_completed_date: new Date().toISOString().split('T')[0] // Date only
    });
  }

  async assignEngineer(id, engineer) {
    return this.update(id, { assigned_engineer: engineer });
  }

  async updateTestingStatus(id, status, details = null) {
    const updates = { notes: `Testing Status: ${status}` };
    if (details) {
      updates.notes += ` - ${details}`;
    }
    return this.update(id, updates);
  }

  async getStats() {
    const stats = await this.queryOne(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN customer_notified_successful_cutover = true THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN cutover_completed = true AND customer_notified_successful_cutover != true THEN 1 ELSE 0 END) as awaiting_notification,
        SUM(CASE WHEN cutover_scheduled = true THEN 1 ELSE 0 END) as scheduled,
        COUNT(DISTINCT assigned_engineer) as engineers_assigned
      FROM servers
    `);

    stats.pending = stats.total - stats.completed;
    stats.completion_percentage = stats.total > 0 
      ? Math.round((stats.completed / stats.total) * 100) 
      : 0;

    return stats;
  }

  async getUpcoming(days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.query(`
      SELECT * FROM servers
      WHERE cutover_scheduled_date >= CURRENT_DATE
        AND cutover_scheduled_date <= ?
        AND customer_notified_successful_cutover != true
      ORDER BY cutover_scheduled_date, assigned_engineer
    `, [futureDate.toISOString().split('T')[0]]);
  }

  async searchServers(searchTerm) {
    return this.search(searchTerm, [
      'customer', 'vm_name', 'host', 'ip_addresses', 'notes'
    ]);
  }

  async importFromCSV(data) {
    // First, ensure Unknown customer exists
    await customerMatcher.ensureUnknownCustomer(this.db);
    
    // Extract all customer names for batch processing
    const customerNames = data.map(row => row['Customer'] || row.customer || '');
    
    // Process all customer names and get mapping
    console.log('Processing customer names for import...');
    const customerMap = await customerMatcher.processBatch(customerNames, this.db);
    
    // Map the data with matched/created customer IDs
    const mappedData = data.map(row => {
      const customerName = row['Customer'] || row.customer || '';
      const customerId = customerMap[customerName];
      
      return {
        customer: customerName, // Keep the original name
        customer_id: customerId, // Add the matched/created ID
        vm_name: row['VM Name'] || row.vm_name,
        host: row['Host'] || row.host,
        ip_addresses: row['IP Addresses'] || row.ip_addresses,
        cores: parseInt(row['Cores'] || row.cores) || 0,
        memory_capacity: row['Memory Capacity'] || row.memory_capacity,
        storage_used_gib: parseFloat(row['Storage Used (GiB)'] || row.storage_used_gib) || 0,
        storage_provisioned_gib: parseFloat(row['Storage Provisioned (GiB)'] || row.storage_provisioned_gib) || 0,
        assigned_engineer: row['Assigned Engineer'] || row.assigned_engineer || null
      };
    });

    console.log(`Importing ${mappedData.length} servers with matched customers`);
    return this.bulkCreate(mappedData);
  }

  async exportToCSV() {
    const servers = await this.findAll();
    return servers.map(server => ({
      'Customer': server.customer,
      'VM Name': server.vm_name,
      'Host': server.host,
      'IP Addresses': server.ip_addresses,
      'Cores': server.cores,
      'Memory Capacity': server.memory_capacity,
      'Storage Used (GiB)': server.storage_used_gib,
      'Storage Provisioned (GiB)': server.storage_provisioned_gib,
      'Cutover Scheduled': server.cutover_scheduled ? 'Yes' : 'No',
      'Cutover Date': server.cutover_completed_date,
      'Assigned Engineer': server.assigned_engineer,
      'Cutover Completed': server.cutover_completed ? 'Yes' : 'No',
      'Customer Notified Scheduled': server.customer_notified_scheduled ? 'Yes' : 'No',
      'Cutover Notified': server.customer_notified_successful_cutover ? 'Yes' : 'No',
      'Notes': server.notes
    }));
  }
}

module.exports = Server;