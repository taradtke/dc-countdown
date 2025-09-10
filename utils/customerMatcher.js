const Fuse = require('fuse.js');

class CustomerMatcher {
    constructor() {
        // Configure Fuse.js for fuzzy matching
        this.fuseOptions = {
            includeScore: true,
            threshold: 0.3, // 0.0 = exact match, 1.0 = match anything
            keys: ['name']
        };
    }

    /**
     * Find or create a customer based on the provided name
     * @param {string} customerName - The customer name from the import
     * @param {Database} db - Database instance
     * @returns {Promise<number>} - The customer ID
     */
    async findOrCreateCustomer(customerName, db) {
        // Handle empty or invalid customer names
        if (!customerName || customerName.trim() === '') {
            return await this.ensureUnknownCustomer(db);
        }

        const cleanName = customerName.trim();

        // First, try exact match (case-insensitive)
        const exactMatch = await db.get(
            'SELECT id FROM customers WHERE LOWER(name) = LOWER(?)',
            [cleanName]
        );

        if (exactMatch) {
            console.log(`Exact match found for customer: ${cleanName}`);
            return exactMatch.id;
        }

        // Get all customers for fuzzy matching
        const allCustomers = await db.all('SELECT id, name FROM customers');
        
        if (allCustomers.length === 0) {
            // No customers exist, create new one
            return await this.createCustomer(cleanName, db);
        }

        // Perform fuzzy search
        const fuse = new Fuse(allCustomers, this.fuseOptions);
        const results = fuse.search(cleanName);

        // If we found a good match (score < 0.2 means very similar)
        if (results.length > 0 && results[0].score < 0.2) {
            const match = results[0].item;
            console.log(`Fuzzy match found: "${cleanName}" matched to "${match.name}" (score: ${results[0].score})`);
            return match.id;
        }

        // No good match found, create new customer
        console.log(`No match found for "${cleanName}", creating new customer`);
        return await this.createCustomer(cleanName, db);
    }

    /**
     * Create a new customer
     * @param {string} name - Customer name
     * @param {Database} db - Database instance
     * @returns {Promise<number>} - The new customer ID
     */
    async createCustomer(name, db) {
        await db.run(
            `INSERT INTO customers (name, created_at, updated_at) 
             VALUES (?, datetime('now'), datetime('now'))`,
            [name]
        );
        
        // Get the last inserted ID
        const result = await db.get('SELECT last_insert_rowid() as id');
        const customerId = result.id;
        
        console.log(`Created new customer: ${name} (ID: ${customerId})`);
        return customerId;
    }

    /**
     * Ensure the "Unknown" customer exists and return its ID
     * @param {Database} db - Database instance
     * @returns {Promise<number>} - The Unknown customer ID
     */
    async ensureUnknownCustomer(db) {
        let unknownCustomer = await db.get(
            'SELECT id FROM customers WHERE name = ?',
            ['Unknown']
        );

        if (!unknownCustomer) {
            await db.run(
                `INSERT INTO customers (name, notes, created_at, updated_at) 
                 VALUES ('Unknown', 'Default customer for unassigned items', datetime('now'), datetime('now'))`
            );
            
            // Get the last inserted ID
            const result = await db.get('SELECT last_insert_rowid() as id');
            console.log('Created "Unknown" customer for unassigned items');
            return result.id;
        }

        return unknownCustomer.id;
    }

    /**
     * Process a batch of customer names and return a mapping
     * @param {Array<string>} customerNames - Array of customer names
     * @param {Database} db - Database instance
     * @returns {Promise<Object>} - Map of customer names to IDs
     */
    async processBatch(customerNames, db) {
        const customerMap = {};
        const uniqueNames = [...new Set(customerNames)];

        for (const name of uniqueNames) {
            customerMap[name || ''] = await this.findOrCreateCustomer(name, db);
        }

        return customerMap;
    }

    /**
     * Get common name variations for better matching
     * @param {string} name - Customer name
     * @returns {Array<string>} - Array of name variations
     */
    getNameVariations(name) {
        const variations = [name];
        
        // Remove common suffixes
        const suffixes = [' Inc', ' LLC', ' Ltd', ' Corp', ' Corporation', ' Company', ' Co', ' Group'];
        let baseName = name;
        for (const suffix of suffixes) {
            if (name.endsWith(suffix)) {
                baseName = name.slice(0, -suffix.length).trim();
                variations.push(baseName);
                break;
            }
        }

        // Add variations with common suffixes if not present
        if (!suffixes.some(s => name.includes(s))) {
            variations.push(`${name} Inc`);
            variations.push(`${name} LLC`);
        }

        return variations;
    }
}

module.exports = new CustomerMatcher();