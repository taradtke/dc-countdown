const BaseModel = require('./BaseModel');

class Customer extends BaseModel {
  constructor() {
    super('customers', {
      name: 'string',
      contact_email: 'string',
      contact_phone: 'string',
      account_manager: 'string',
      notes: 'text',
      created_at: 'datetime',
      updated_at: 'datetime'
    });
  }

  async findByName(name) {
    const result = await this.query('SELECT * FROM customers WHERE name = ? LIMIT 1', [name]);
    return result[0] || null;
  }

  async getCustomerAssets(customerId) {
    return this.query(`
      SELECT 
        ca.asset_type,
        ca.asset_id,
        ca.created_at as linked_at
      FROM customer_assets ca
      WHERE ca.customer_id = ?
      ORDER BY ca.asset_type, ca.asset_id
    `, [customerId]);
  }

  async linkAsset(customerId, assetType, assetId) {
    try {
      const result = await this.query(`
        INSERT INTO customer_assets (customer_id, asset_type, asset_id)
        VALUES (?, ?, ?)
      `, [customerId, assetType, assetId]);
      return result;
    } catch (error) {
      // If it's a duplicate, just ignore it
      if (error.message.includes('UNIQUE constraint failed')) {
        return null;
      }
      throw error;
    }
  }

  async unlinkAsset(customerId, assetType, assetId) {
    return this.query(`
      DELETE FROM customer_assets 
      WHERE customer_id = ? AND asset_type = ? AND asset_id = ?
    `, [customerId, assetType, assetId]);
  }

  async getCustomerOverview() {
    return this.query(`
      SELECT 
        c.id,
        c.name,
        c.contact_email,
        c.contact_phone,
        c.account_manager,
        c.notes,
        COUNT(ca.id) as total_assets
      FROM customers c
      LEFT JOIN customer_assets ca ON c.id = ca.customer_id
      GROUP BY c.id, c.name, c.contact_email, c.contact_phone, c.account_manager, c.notes
      ORDER BY c.name
    `);
  }

  async importFromCSV(data) {
    const mappedData = data.map(row => ({
      name: row['Customer Name'] || row.name || row.customer_name || '',
      contact_email: row['Contact Email'] || row.contact_email || null,
      contact_phone: row['Contact Phone'] || row.contact_phone || null,
      account_manager: row['Account Manager'] || row.account_manager || null,
      notes: row['Notes'] || row.notes || null
    }));

    console.log(`Importing ${mappedData.length} customers`);
    return this.bulkCreate(mappedData);
  }
}

module.exports = Customer;