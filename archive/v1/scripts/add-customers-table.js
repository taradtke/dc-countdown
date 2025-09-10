const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'tracking.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Create customers table
    db.run(`
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL UNIQUE,
            primary_contact TEXT,
            contact_email TEXT,
            contact_phone TEXT,
            account_manager TEXT,
            contact_status TEXT DEFAULT 'not_contacted',
            initial_contact_date TEXT,
            migration_scheduled_date TEXT,
            migration_completed_date TEXT,
            notes TEXT,
            priority TEXT DEFAULT 'normal',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating customers table:', err);
        } else {
            console.log('Customers table created successfully');
        }
    });
    
    // Create customer_assets table for tracking which assets belong to which customer
    db.run(`
        CREATE TABLE IF NOT EXISTS customer_assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            asset_type TEXT NOT NULL,
            asset_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
            UNIQUE(customer_id, asset_type, asset_id)
        )
    `, (err) => {
        if (err) {
            console.error('Error creating customer_assets table:', err);
        } else {
            console.log('Customer assets table created successfully');
        }
    });
    
    // Create indexes for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_customer_assets_customer ON customer_assets(customer_id)`, (err) => {
        if (!err) console.log('Created index on customer_assets.customer_id');
    });
    
    db.run(`CREATE INDEX IF NOT EXISTS idx_customer_assets_type ON customer_assets(asset_type, asset_id)`, (err) => {
        if (!err) console.log('Created index on customer_assets asset_type and asset_id');
    });
    
    // Populate customers from existing data
    // First check which tables exist and populate accordingly
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error('Error checking tables:', err);
            return;
        }
        
        const tableNames = tables.map(t => t.name);
        let unionQueries = [];
        
        if (tableNames.includes('servers')) {
            unionQueries.push("SELECT DISTINCT customer_name FROM servers WHERE customer_name IS NOT NULL AND customer_name != ''");
        }
        if (tableNames.includes('colo_customers')) {
            unionQueries.push("SELECT DISTINCT customer_name FROM colo_customers WHERE customer_name IS NOT NULL AND customer_name != ''");
        }
        if (tableNames.includes('public_networks')) {
            unionQueries.push("SELECT DISTINCT customer FROM public_networks WHERE customer IS NOT NULL AND customer != ''");
        }
        if (tableNames.includes('carrier_circuits')) {
            unionQueries.push("SELECT DISTINCT customer FROM carrier_circuits WHERE customer IS NOT NULL AND customer != ''");
        }
        
        if (unionQueries.length > 0) {
            const query = `INSERT OR IGNORE INTO customers (customer_name) ${unionQueries.join(' UNION ')}`;
            db.run(query, (err) => {
                if (err) {
                    console.error('Error populating customers:', err);
                } else {
                    console.log('Populated customers from existing data');
                }
            });
        }
    });
    
    // Populate customer_assets relationships after checking which tables exist
    setTimeout(() => {
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
            if (err) {
                console.error('Error checking tables for assets:', err);
                return;
            }
            
            const tableNames = tables.map(t => t.name);
            console.log('Populating customer_assets relationships...');
            
            // Link servers to customers if table exists
            if (tableNames.includes('servers')) {
                db.run(`
                    INSERT OR IGNORE INTO customer_assets (customer_id, asset_type, asset_id)
                    SELECT c.id, 'servers', s.id
                    FROM servers s
                    JOIN customers c ON s.customer_name = c.customer_name
                    WHERE s.customer_name IS NOT NULL AND s.customer_name != ''
                `, (err) => {
                    if (err) console.error('Error linking servers:', err);
                    else console.log('Linked servers to customers');
                });
            }
            
            // Link colo_customers to customers if table exists
            if (tableNames.includes('colo_customers')) {
                db.run(`
                    INSERT OR IGNORE INTO customer_assets (customer_id, asset_type, asset_id)
                    SELECT c.id, 'colo_customers', cc.id
                    FROM colo_customers cc
                    JOIN customers c ON cc.customer_name = c.customer_name
                    WHERE cc.customer_name IS NOT NULL AND cc.customer_name != ''
                `, (err) => {
                    if (err) console.error('Error linking colo_customers:', err);
                    else console.log('Linked colo customers to customers');
                });
            }
            
            // Link public networks to customers if table exists
            if (tableNames.includes('public_networks')) {
                db.run(`
                    INSERT OR IGNORE INTO customer_assets (customer_id, asset_type, asset_id)
                    SELECT c.id, 'public_networks', pn.id
                    FROM public_networks pn
                    JOIN customers c ON pn.customer = c.customer_name
                    WHERE pn.customer IS NOT NULL AND pn.customer != ''
                `, (err) => {
                    if (err) console.error('Error linking public networks:', err);
                    else console.log('Linked public networks to customers');
                });
            }
            
            // Link carrier circuits to customers if table exists
            if (tableNames.includes('carrier_circuits')) {
                db.run(`
                    INSERT OR IGNORE INTO customer_assets (customer_id, asset_type, asset_id)
                    SELECT c.id, 'carrier_circuits', cc.id
                    FROM carrier_circuits cc
                    JOIN customers c ON cc.customer = c.customer_name
                    WHERE cc.customer IS NOT NULL AND cc.customer != ''
                `, (err) => {
                    if (err) console.error('Error linking carrier circuits:', err);
                    else console.log('Linked carrier circuits to customers');
                });
            }
        });
    }, 1000); // Give time for customers table to be populated
});

// Delay closing to allow async operations to complete
setTimeout(() => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database migration completed successfully');
        }
    });
}, 2000);