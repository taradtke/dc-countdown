const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    const dbPath = process.env.DB_PATH || path.join(__dirname, 'migration.db');
    const dbDir = path.dirname(dbPath);
    
    // Ensure database directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    this.db = new sqlite3.Database(dbPath);
    this.initTables();
  }

  initTables() {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS servers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer TEXT,
          vm_name TEXT,
          host TEXT,
          ip_addresses TEXT,
          cores INTEGER,
          memory_capacity TEXT,
          storage_used_gib TEXT,
          storage_provisioned_gib TEXT,
          customer_contacted BOOLEAN DEFAULT 0,
          test_move_date TEXT,
          move_date TEXT,
          backups_verified_working_hycu BOOLEAN DEFAULT 0,
          backups_setup_verified_working_veeam BOOLEAN DEFAULT 0,
          firewall_network_cutover BOOLEAN DEFAULT 0,
          customer_notified_successful_cutover BOOLEAN DEFAULT 0,
          engineer_completed_work TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS vlans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vlan_id TEXT,
          name TEXT,
          description TEXT,
          network TEXT,
          gateway TEXT,
          migrated BOOLEAN DEFAULT 0,
          verified BOOLEAN DEFAULT 0,
          engineer_completed_work TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS networks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          network_name TEXT,
          provider TEXT,
          circuit_id TEXT,
          bandwidth TEXT,
          migrated BOOLEAN DEFAULT 0,
          tested BOOLEAN DEFAULT 0,
          cutover_completed BOOLEAN DEFAULT 0,
          engineer_completed_work TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS voice_systems (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer TEXT,
          vm_name TEXT,
          system_type TEXT,
          extension_count INTEGER,
          migrated BOOLEAN DEFAULT 0,
          tested BOOLEAN DEFAULT 0,
          cutover_completed BOOLEAN DEFAULT 0,
          engineer_completed_work TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS colo_customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_name TEXT,
          rack_location TEXT,
          new_cabinet_number TEXT,
          equipment_count INTEGER,
          power_usage TEXT,
          contacted BOOLEAN DEFAULT 0,
          migration_scheduled BOOLEAN DEFAULT 0,
          migration_completed BOOLEAN DEFAULT 0,
          engineer_completed_work TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });
  }

  getStats() {
    return new Promise((resolve, reject) => {
      const stats = {};
      
      this.db.serialize(() => {
        this.db.get("SELECT COUNT(*) as total, SUM(CASE WHEN customer_notified_successful_cutover = 1 THEN 1 ELSE 0 END) as completed FROM servers", (err, row) => {
          if (err) return reject(err);
          stats.servers = { total: row.total, completed: row.completed, remaining: row.total - row.completed };
        });

        this.db.get("SELECT COUNT(*) as total, SUM(CASE WHEN migrated = 1 AND verified = 1 THEN 1 ELSE 0 END) as completed FROM vlans", (err, row) => {
          if (err) return reject(err);
          stats.vlans = { total: row.total, completed: row.completed, remaining: row.total - row.completed };
        });

        this.db.get("SELECT COUNT(*) as total, SUM(CASE WHEN cutover_completed = 1 THEN 1 ELSE 0 END) as completed FROM networks", (err, row) => {
          if (err) return reject(err);
          stats.networks = { total: row.total, completed: row.completed, remaining: row.total - row.completed };
        });

        this.db.get("SELECT COUNT(*) as total, SUM(CASE WHEN cutover_completed = 1 THEN 1 ELSE 0 END) as completed FROM voice_systems", (err, row) => {
          if (err) return reject(err);
          stats.voiceSystems = { total: row.total, completed: row.completed, remaining: row.total - row.completed };
        });

        this.db.get("SELECT COUNT(*) as total, SUM(CASE WHEN migration_completed = 1 THEN 1 ELSE 0 END) as completed FROM colo_customers", (err, row) => {
          if (err) return reject(err);
          stats.coloCustomers = { total: row.total, completed: row.completed, remaining: row.total - row.completed };
        });

        this.db.get("SELECT COUNT(*) as total, SUM(CASE WHEN cutover_completed = 1 THEN 1 ELSE 0 END) as completed FROM carrier_circuits", (err, row) => {
          if (err) return reject(err);
          stats.carrierCircuits = { total: row.total || 0, completed: row.completed || 0, remaining: (row.total || 0) - (row.completed || 0) };
        });

        this.db.get("SELECT COUNT(*) as total, SUM(CASE WHEN cutover_completed = 1 THEN 1 ELSE 0 END) as completed FROM public_networks", (err, row) => {
          if (err) return reject(err);
          stats.publicNetworks = { total: row.total || 0, completed: row.completed || 0, remaining: (row.total || 0) - (row.completed || 0) };
        });
        
        this.db.get("SELECT COUNT(*) as total, SUM(CASE WHEN cutover_completed = 1 THEN 1 ELSE 0 END) as completed FROM carrier_nnis", (err, row) => {
          if (err) return reject(err);
          stats.carrierNnis = { total: row.total || 0, completed: row.completed || 0, remaining: (row.total || 0) - (row.completed || 0) };
          resolve(stats);
        });
      });
    });
  }

  getServers() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM servers ORDER BY customer, vm_name", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  importServers(servers) {
    return new Promise((resolve, reject) => {
      console.log(`Preparing to import ${servers.length} servers`);
      
      const stmt = this.db.prepare(`
        INSERT INTO servers (customer, vm_name, host, ip_addresses, cores, memory_capacity, storage_used_gib, storage_provisioned_gib)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      if (!stmt) {
        console.error('Failed to prepare statement - stmt is undefined');
        reject(new Error('Failed to prepare statement'));
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      servers.forEach((server, index) => {
        const customer = server['Customer'] || server.customer || '';
        const vmName = server['VM Name'] || server.vm_name || '';
        const host = server['Host'] || server.host || '';
        const ipAddresses = server['IP Addresses'] || server.ip_addresses || '';
        const cores = parseInt(server['Cores'] || server.cores) || 0;
        const memory = parseInt(server['Memory Capacity'] || server.memory_capacity) || 0;
        const storageUsed = parseFloat(server['Storage Used (GiB)'] || server.storage_used_gib) || 0;
        const storageProvisioned = parseFloat(server['Storage Provisioned (GiB)'] || server.storage_provisioned_gib) || 0;
        
        if (index === 0) {
          console.log('First server insert:', {
            customer,
            vmName,
            host,
            ipAddresses,
            cores,
            memory,
            storageUsed,
            storageProvisioned
          });
        }
        
        stmt.run(
          customer,
          vmName,
          host,
          ipAddresses,
          cores,
          memory,
          storageUsed,
          storageProvisioned,
          function(err) {
            if (err) {
              errorCount++;
              console.error('Error inserting server:', err);
              console.error('Data:', {
                customer,
                vmName,
                host,
                ipAddresses,
                cores,
                memory,
                storageUsed,
                storageProvisioned
              });
            } else {
              successCount++;
              if (successCount === 1) {
                console.log('First server inserted successfully');
              }
            }
          }
        );
      });

      stmt.finalize(err => {
        console.log(`Import complete. Success: ${successCount}, Errors: ${errorCount}`);
        if (err) reject(err);
        else resolve();
      });
    });
  }

  updateServer(id, data) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(data[key]);
        }
      });
      
      values.push(id);
      
      const query = `UPDATE servers SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      this.db.run(query, values, err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getVlans() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM vlans ORDER BY vlan_id", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  importVlans(vlans) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO vlans (vlan_id, name, description, network, gateway)
        VALUES (?, ?, ?, ?, ?)
      `);

      vlans.forEach(vlan => {
        stmt.run(
          vlan['VLAN ID'] || vlan.vlan_id,
          vlan['Name'] || vlan.name,
          vlan['Description'] || vlan.description,
          vlan['Network'] || vlan.network,
          vlan['Gateway'] || vlan.gateway
        );
      });

      stmt.finalize(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  updateVlan(id, data) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(data[key]);
        }
      });
      
      values.push(id);
      
      const query = `UPDATE vlans SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      this.db.run(query, values, err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getNetworks() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM networks ORDER BY network_name", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  importNetworks(networks) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO networks (network_name, provider, circuit_id, bandwidth)
        VALUES (?, ?, ?, ?)
      `);

      networks.forEach(network => {
        stmt.run(
          network['Network Name'] || network.network_name,
          network['Provider'] || network.provider,
          network['Circuit ID'] || network.circuit_id,
          network['Bandwidth'] || network.bandwidth
        );
      });

      stmt.finalize(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  updateNetwork(id, data) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(data[key]);
        }
      });
      
      values.push(id);
      
      const query = `UPDATE networks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      this.db.run(query, values, err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getVoiceSystems() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM voice_systems ORDER BY customer, vm_name", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  importVoiceSystems(voiceSystems) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO voice_systems (customer, vm_name, system_type, extension_count, sip_provider, sip_delivery_method)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      voiceSystems.forEach(system => {
        stmt.run(
          system['Customer'] || system.customer,
          system['VM Name'] || system.vm_name,
          system['System Type'] || system.system_type,
          system['Extension Count'] || system.extension_count,
          system['SIP Provider'] || system.sip_provider || null,
          system['SIP Delivery Method'] || system.sip_delivery_method || null
        );
      });

      stmt.finalize(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  updateVoiceSystem(id, data) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(data[key]);
        }
      });
      
      values.push(id);
      
      const query = `UPDATE voice_systems SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      this.db.run(query, values, err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getColoCustomers() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM colo_customers ORDER BY customer_name", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  importColoCustomers(customers) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO colo_customers (customer_name, rack_location, new_cabinet_number, equipment_count, power_usage)
        VALUES (?, ?, ?, ?, ?)
      `);

      customers.forEach(customer => {
        stmt.run(
          customer['Customer Name'] || customer.customer_name,
          customer['Rack Location'] || customer.rack_location,
          customer['New Cabinet Number'] || customer.new_cabinet_number,
          customer['Equipment Count'] || customer.equipment_count,
          customer['Power Usage'] || customer.power_usage
        );
      });

      stmt.finalize(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  updateColoCustomer(id, data) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(data[key]);
        }
      });
      
      values.push(id);
      
      const query = `UPDATE colo_customers SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      this.db.run(query, values, err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  deleteServer(id) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM servers WHERE id = ?", [id], err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  deleteVlan(id) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM vlans WHERE id = ?", [id], err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  deleteNetwork(id) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM networks WHERE id = ?", [id], err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  deleteVoiceSystem(id) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM voice_systems WHERE id = ?", [id], err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  deleteColoCustomer(id) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM colo_customers WHERE id = ?", [id], err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getCarrierCircuits() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM carrier_circuits ORDER BY customer, service", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  importCarrierCircuits(circuits) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO carrier_circuits (
          customer, service, backhaul_vendor, circuit_location, 
          carrier_circuit_id, vlan, starmax_mgmt_ip, router_public_network,
          tsr_router_ip, customer_router_ip, customer_public_network, cpe_ip
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      circuits.forEach(circuit => {
        stmt.run(
          circuit['Customer'] || circuit.customer,
          circuit['Service'] || circuit.service,
          circuit['Backhaul Vendor'] || circuit.backhaul_vendor,
          circuit['Circuit Location'] || circuit.circuit_location,
          circuit['Carrier Circuit ID'] || circuit.carrier_circuit_id,
          circuit['VLAN'] || circuit.vlan,
          circuit['Starmax MGMT IP'] || circuit.starmax_mgmt_ip,
          circuit['Router Public Network'] || circuit.router_public_network,
          circuit['TSR Router IP (Router Network)'] || circuit.tsr_router_ip,
          circuit['Customer Router IP (Router Network)'] || circuit.customer_router_ip,
          circuit['Customer Public Network'] || circuit.customer_public_network,
          circuit['CPE IP (Gateway of Customer Public Network)'] || circuit.cpe_ip
        );
      });

      stmt.finalize(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  updateCarrierCircuit(id, data) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(data[key]);
        }
      });
      
      values.push(id);
      
      const query = `UPDATE carrier_circuits SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      this.db.run(query, values, err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  deleteCarrierCircuit(id) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM carrier_circuits WHERE id = ?", [id], err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getPublicNetworks() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM public_networks ORDER BY network", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  importPublicNetworks(networks) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO public_networks (
          network, customer, action, vlan, current_devices, 
          current_interfaces, new_devices, new_interfaces
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      networks.forEach(network => {
        stmt.run(
          network['Network'] || network.network,
          network['Customer'] || network.customer,
          network['Action'] || network.action,
          network['VLAN'] || network.vlan,
          network['Current Devices'] || network.current_devices,
          network['Current Interfaces'] || network.current_interfaces,
          network['New Devices'] || network.new_devices,
          network['New Interfaces'] || network.new_interfaces
        );
      });

      stmt.finalize(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  updatePublicNetwork(id, data) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(data[key]);
        }
      });
      
      values.push(id);
      
      const query = `UPDATE public_networks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      this.db.run(query, values, err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  deletePublicNetwork(id) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM public_networks WHERE id = ?", [id], err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  addDependency(sourceType, sourceId, targetType, targetId, dependencyType, description) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO dependencies 
         (source_type, source_id, target_type, target_id, dependency_type, description) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sourceType, sourceId, targetType, targetId, dependencyType, description],
        err => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  removeDependency(id) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM dependencies WHERE id = ?", [id], err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getDependencies(type, id) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM dependencies 
         WHERE (source_type = ? AND source_id = ?) 
         OR (target_type = ? AND target_id = ?)`,
        [type, id, type, id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getDependencyCounts() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          source_type as type,
          source_id as id,
          COUNT(*) as outgoing_count
        FROM dependencies
        GROUP BY source_type, source_id
        
        UNION ALL
        
        SELECT 
          target_type as type,
          target_id as id,
          COUNT(*) as incoming_count
        FROM dependencies
        GROUP BY target_type, target_id
      `;
      
      this.db.all(query, (err, rows) => {
        if (err) reject(err);
        else {
          const counts = {};
          rows.forEach(row => {
            const key = `${row.type}_${row.id}`;
            if (!counts[key]) {
              counts[key] = { incoming: 0, outgoing: 0 };
            }
            if (row.outgoing_count) {
              counts[key].outgoing = row.outgoing_count;
            }
            if (row.incoming_count) {
              counts[key].incoming = row.incoming_count;
            }
          });
          resolve(counts);
        }
      });
    });
  }

  getAllDependencies() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM dependencies", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Carrier NNIs methods
  getCarrierNnis() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM carrier_nnis ORDER BY carrier_name, circuit_id", (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  importCarrierNnis(items) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO carrier_nnis (
          carrier_name, circuit_id, interface_type, bandwidth, location,
          vlan_range, ip_block, current_device, current_interface,
          new_device, new_interface, migration_status, tested,
          cutover_scheduled, cutover_completed, engineer_assigned, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      items.forEach(item => {
        stmt.run(
          item.carrier_name,
          item.circuit_id,
          item.interface_type,
          item.bandwidth,
          item.location,
          item.vlan_range,
          item.ip_block,
          item.current_device,
          item.current_interface,
          item.new_device,
          item.new_interface,
          item.migration_status || 'pending',
          item.tested ? 1 : 0,
          item.cutover_scheduled,
          item.cutover_completed ? 1 : 0,
          item.engineer_assigned,
          item.notes
        );
      });
      
      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  updateCarrierNni(id, data) {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const values = Object.values(data);
      values.push(id);
      
      this.db.run(
        `UPDATE carrier_nnis SET ${fields}, updated_at = datetime('now') WHERE id = ?`,
        values,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  deleteCarrierNni(id) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM carrier_nnis WHERE id = ?", [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Critical Items methods
  getCriticalItems() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM critical_items ORDER BY priority DESC, created_at DESC", (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  importCriticalItems(items) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO critical_items (title, description, success_criteria, priority, status, assigned_engineer, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      items.forEach(item => {
        stmt.run(
          item.title,
          item.description,
          item.success_criteria,
          item.priority || 'medium',
          item.status || 'pending',
          item.assigned_engineer,
          item.notes
        );
      });
      
      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  updateCriticalItem(id, data) {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const values = Object.values(data);
      values.push(id);
      
      // Update date_assigned if engineer is being assigned
      if (data.assigned_engineer && data.assigned_engineer !== '') {
        this.db.run(`UPDATE critical_items SET date_assigned = datetime('now') WHERE id = ? AND date_assigned IS NULL`, [id]);
      }
      
      // Update date_completed if status is being set to completed
      if (data.status === 'completed') {
        this.db.run(`UPDATE critical_items SET date_completed = datetime('now') WHERE id = ? AND date_completed IS NULL`, [id]);
      }
      
      this.db.run(
        `UPDATE critical_items SET ${fields}, updated_at = datetime('now') WHERE id = ?`,
        values,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  deleteCriticalItem(id) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM critical_items WHERE id = ?", [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getAllItemsForDependencies() {
    const items = [];
    
    // Get servers
    const servers = await new Promise((resolve, reject) => {
      this.db.all("SELECT id, customer, vm_name FROM servers WHERE customer IS NOT NULL OR vm_name IS NOT NULL", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    servers.forEach(s => {
      items.push({
        type: 'servers',
        id: s.id,
        label: `${s.customer || 'Unknown'} - ${s.vm_name || 'Unknown VM'}`,
        searchText: `${s.customer} ${s.vm_name}`.toLowerCase()
      });
    });

    // Get VLANs
    const vlans = await new Promise((resolve, reject) => {
      this.db.all("SELECT id, vlan_id, name, description FROM vlans", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    vlans.forEach(v => {
      items.push({
        type: 'vlans',
        id: v.id,
        label: `VLAN ${v.vlan_id || v.name || v.id} - ${v.description || 'No description'}`,
        searchText: `vlan ${v.vlan_id} ${v.name} ${v.description}`.toLowerCase()
      });
    });

    // Get Carrier Circuits
    const circuits = await new Promise((resolve, reject) => {
      this.db.all("SELECT id, customer, service, carrier_circuit_id FROM carrier_circuits", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    circuits.forEach(c => {
      items.push({
        type: 'carrier-circuits',
        id: c.id,
        label: `${c.customer || 'Unknown'} - ${c.service || c.carrier_circuit_id || 'Circuit'}`,
        searchText: `${c.customer} ${c.service} ${c.carrier_circuit_id}`.toLowerCase()
      });
    });

    // Get Public Networks
    const networks = await new Promise((resolve, reject) => {
      this.db.all("SELECT id, network, customer, action FROM public_networks", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    networks.forEach(n => {
      items.push({
        type: 'public-networks',
        id: n.id,
        label: `${n.network || 'Unknown Network'} - ${n.customer || 'No customer'} (${n.action || 'No action'})`,
        searchText: `${n.network} ${n.customer} ${n.action}`.toLowerCase()
      });
    });

    // Get Voice Systems
    const voiceSystems = await new Promise((resolve, reject) => {
      this.db.all("SELECT id, customer, vm_name, system_type FROM voice_systems", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    voiceSystems.forEach(v => {
      items.push({
        type: 'voice-systems',
        id: v.id,
        label: `${v.customer || 'Unknown'} - ${v.vm_name || 'Voice System'} (${v.system_type || 'Unknown type'})`,
        searchText: `${v.customer} ${v.vm_name} ${v.system_type}`.toLowerCase()
      });
    });

    // Get Colo Customers
    const coloCustomers = await new Promise((resolve, reject) => {
      this.db.all("SELECT id, customer_name, rack_location FROM colo_customers", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    coloCustomers.forEach(c => {
      items.push({
        type: 'colo-customers',
        id: c.id,
        label: `${c.customer_name || 'Unknown Customer'} - Rack: ${c.rack_location || 'Unknown'}`,
        searchText: `${c.customer_name} ${c.rack_location}`.toLowerCase()
      });
    });

    return items;
  }

  async getLeaderboard() {
    const queries = [
      // Servers
      {
        type: 'servers',
        query: `
          SELECT 
            engineer_completed_work as engineer,
            COUNT(*) as assigned,
            SUM(CASE WHEN test_move_date IS NOT NULL THEN 1 ELSE 0 END) as planned,
            SUM(CASE WHEN customer_notified_successful_cutover = 1 THEN 1 ELSE 0 END) as completed
          FROM servers 
          WHERE engineer_completed_work IS NOT NULL AND engineer_completed_work != ''
          GROUP BY engineer_completed_work
        `
      },
      // VLANs
      {
        type: 'vlans',
        query: `
          SELECT 
            engineer_completed_work as engineer,
            COUNT(*) as assigned,
            SUM(CASE WHEN migrated = 1 THEN 1 ELSE 0 END) as planned,
            SUM(CASE WHEN migrated = 1 AND verified = 1 THEN 1 ELSE 0 END) as completed
          FROM vlans 
          WHERE engineer_completed_work IS NOT NULL AND engineer_completed_work != ''
          GROUP BY engineer_completed_work
        `
      },
      // Carrier Circuits
      {
        type: 'carrier_circuits',
        query: `
          SELECT 
            engineer_completed_work as engineer,
            COUNT(*) as assigned,
            SUM(CASE WHEN migrated = 1 THEN 1 ELSE 0 END) as planned,
            SUM(CASE WHEN cutover_completed = 1 THEN 1 ELSE 0 END) as completed
          FROM carrier_circuits 
          WHERE engineer_completed_work IS NOT NULL AND engineer_completed_work != ''
          GROUP BY engineer_completed_work
        `
      },
      // Public Networks
      {
        type: 'public_networks',
        query: `
          SELECT 
            engineer_completed_work as engineer,
            COUNT(*) as assigned,
            SUM(CASE WHEN migrated = 1 THEN 1 ELSE 0 END) as planned,
            SUM(CASE WHEN cutover_completed = 1 THEN 1 ELSE 0 END) as completed
          FROM public_networks 
          WHERE engineer_completed_work IS NOT NULL AND engineer_completed_work != ''
          GROUP BY engineer_completed_work
        `
      },
      // Voice Systems
      {
        type: 'voice_systems',
        query: `
          SELECT 
            engineer_completed_work as engineer,
            COUNT(*) as assigned,
            SUM(CASE WHEN migrated = 1 THEN 1 ELSE 0 END) as planned,
            SUM(CASE WHEN cutover_completed = 1 THEN 1 ELSE 0 END) as completed
          FROM voice_systems 
          WHERE engineer_completed_work IS NOT NULL AND engineer_completed_work != ''
          GROUP BY engineer_completed_work
        `
      },
      // Colo Customers
      {
        type: 'colo_customers',
        query: `
          SELECT 
            engineer_completed_work as engineer,
            COUNT(*) as assigned,
            SUM(CASE WHEN migration_scheduled = 1 THEN 1 ELSE 0 END) as planned,
            SUM(CASE WHEN migration_completed = 1 THEN 1 ELSE 0 END) as completed
          FROM colo_customers 
          WHERE engineer_completed_work IS NOT NULL AND engineer_completed_work != ''
          GROUP BY engineer_completed_work
        `
      },
      // Critical Items
      {
        type: 'critical_items',
        query: `
          SELECT 
            assigned_engineer as engineer,
            COUNT(*) as assigned,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as planned,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
          FROM critical_items 
          WHERE assigned_engineer IS NOT NULL AND assigned_engineer != ''
          GROUP BY assigned_engineer
        `
      }
    ];

    const leaderboard = {};

    for (const { type, query } of queries) {
      const results = await new Promise((resolve, reject) => {
        this.db.all(query, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      for (const row of results) {
        if (!leaderboard[row.engineer]) {
          leaderboard[row.engineer] = {
            engineer: row.engineer,
            total_assigned: 0,
            total_planned: 0,
            total_completed: 0,
            by_type: {}
          };
        }

        leaderboard[row.engineer].total_assigned += row.assigned;
        leaderboard[row.engineer].total_planned += row.planned;
        leaderboard[row.engineer].total_completed += row.completed;
        leaderboard[row.engineer].by_type[type] = {
          assigned: row.assigned,
          planned: row.planned,
          completed: row.completed
        };
      }
    }

    // Convert to array and sort by total completed (descending)
    return Object.values(leaderboard).sort((a, b) => b.total_completed - a.total_completed);
  }
  // Customer methods
  getCustomers() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT c.*, 
         COUNT(DISTINCT ca.id) as total_assets,
         SUM(CASE WHEN ca.asset_type = 'servers' THEN 1 ELSE 0 END) as server_count,
         SUM(CASE WHEN ca.asset_type = 'public_networks' THEN 1 ELSE 0 END) as network_count,
         SUM(CASE WHEN ca.asset_type = 'carrier_circuits' THEN 1 ELSE 0 END) as circuit_count,
         SUM(CASE WHEN ca.asset_type = 'colo_customers' THEN 1 ELSE 0 END) as colo_count
         FROM customers c
         LEFT JOIN customer_assets ca ON c.id = ca.customer_id
         GROUP BY c.id
         ORDER BY c.customer_name`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getCustomer(id) {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT * FROM customers WHERE id = ?", [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getCustomerAssets(customerId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          ca.asset_type,
          ca.asset_id,
          CASE 
            WHEN ca.asset_type = 'servers' THEN s.vm_name
            WHEN ca.asset_type = 'public_networks' THEN pn.network
            WHEN ca.asset_type = 'carrier_circuits' THEN cc.circuit_id
            WHEN ca.asset_type = 'colo_customers' THEN col.customer_name
          END as asset_name,
          CASE 
            WHEN ca.asset_type = 'servers' THEN s.migration_completed
            WHEN ca.asset_type = 'public_networks' THEN pn.cutover_completed
            WHEN ca.asset_type = 'carrier_circuits' THEN cc.cutover_completed
            WHEN ca.asset_type = 'colo_customers' THEN col.migration_completed
          END as completed
        FROM customer_assets ca
        LEFT JOIN servers s ON ca.asset_type = 'servers' AND ca.asset_id = s.id
        LEFT JOIN public_networks pn ON ca.asset_type = 'public_networks' AND ca.asset_id = pn.id
        LEFT JOIN carrier_circuits cc ON ca.asset_type = 'carrier_circuits' AND ca.asset_id = cc.id
        LEFT JOIN colo_customers col ON ca.asset_type = 'colo_customers' AND ca.asset_id = col.id
        WHERE ca.customer_id = ?
      `;
      
      this.db.all(query, [customerId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  updateCustomer(id, data) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      for (const [key, value] of Object.entries(data)) {
        if (key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
      
      values.push(id);
      const query = `UPDATE customers SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      this.db.run(query, values, err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  createCustomer(data) {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(data);
      const placeholders = fields.map(() => '?').join(', ');
      const values = Object.values(data);
      
      const query = `INSERT INTO customers (${fields.join(', ')}) VALUES (${placeholders})`;
      
      this.db.run(query, values, function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  importCustomers(customers) {
    return new Promise((resolve, reject) => {
      console.log(`Preparing to import ${customers.length} customers`);
      
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO customers (
          name, contact_name, contact_email, contact_phone, 
          account_number, contract_type, priority_level, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      let imported = 0;
      let mapped = 0;
      
      customers.forEach((customer) => {
        const name = customer['Customer Name'] || customer.name || '';
        const contactName = customer['Contact Name'] || customer.contact_name || '';
        const contactEmail = customer['Contact Email'] || customer.contact_email || '';
        const contactPhone = customer['Contact Phone'] || customer.contact_phone || '';
        const accountNumber = customer['Account Number'] || customer.account_number || '';
        const contractType = customer['Contract Type'] || customer.contract_type || '';
        const priorityLevel = customer['Priority Level'] || customer.priority_level || '';
        const notes = customer['Notes'] || customer.notes || '';
        
        stmt.run(
          name, contactName, contactEmail, contactPhone,
          accountNumber, contractType, priorityLevel, notes,
          function(err) {
            if (err) {
              console.error('Error importing customer:', err);
            } else if (this.changes > 0) {
              imported++;
              console.log(`Imported customer: ${name}`);
            }
          }
        );
      });
      
      stmt.finalize(async (err) => {
        if (err) {
          console.error('Finalize error:', err);
          reject(err);
        } else {
          console.log(`Import complete. Imported ${imported} new customers`);
          
          // Now attempt to map assets to customers
          try {
            mapped = await this.autoMapAssetsToCustomers();
            resolve({ imported, mapped });
          } catch (mapErr) {
            console.error('Error mapping assets:', mapErr);
            resolve({ imported, mapped: 0 });
          }
        }
      });
    });
  }

  autoMapAssetsToCustomers() {
    return new Promise((resolve, reject) => {
      let totalMapped = 0;
      
      // Get all customers for mapping
      this.db.all("SELECT id, name FROM customers WHERE name != ''", (err, customers) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Create a map for quick lookup (case-insensitive)
        const customerMap = {};
        customers.forEach(c => {
          customerMap[c.name.toLowerCase().trim()] = c.id;
          // Also map common variations
          const simplified = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (simplified) customerMap[simplified] = c.id;
        });
        
        // Map servers
        this.db.all("SELECT id, customer FROM servers WHERE customer != '' AND customer IS NOT NULL", (err, servers) => {
          if (err) {
            console.error('Error fetching servers:', err);
          } else {
            servers.forEach(server => {
              const customerName = server.customer.toLowerCase().trim();
              const customerId = customerMap[customerName] || customerMap[customerName.replace(/[^a-z0-9]/g, '')];
              
              if (customerId) {
                this.db.run(
                  "INSERT OR IGNORE INTO customer_assets (customer_id, asset_type, asset_id) VALUES (?, 'servers', ?)",
                  [customerId, server.id],
                  (err) => {
                    if (!err) totalMapped++;
                  }
                );
              }
            });
          }
        });
        
        // Map voice systems
        this.db.all("SELECT id, customer FROM voice_systems WHERE customer != '' AND customer IS NOT NULL", (err, systems) => {
          if (err) {
            console.error('Error fetching voice systems:', err);
          } else {
            systems.forEach(system => {
              const customerName = system.customer.toLowerCase().trim();
              const customerId = customerMap[customerName] || customerMap[customerName.replace(/[^a-z0-9]/g, '')];
              
              if (customerId) {
                this.db.run(
                  "INSERT OR IGNORE INTO customer_assets (customer_id, asset_type, asset_id) VALUES (?, 'voice_systems', ?)",
                  [customerId, system.id],
                  (err) => {
                    if (!err) totalMapped++;
                  }
                );
              }
            });
          }
        });
        
        // Map colo customers by name
        this.db.all("SELECT id, customer_name FROM colo_customers WHERE customer_name != '' AND customer_name IS NOT NULL", (err, colos) => {
          if (err) {
            console.error('Error fetching colo customers:', err);
          } else {
            colos.forEach(colo => {
              const customerName = colo.customer_name.toLowerCase().trim();
              const customerId = customerMap[customerName] || customerMap[customerName.replace(/[^a-z0-9]/g, '')];
              
              if (customerId) {
                this.db.run(
                  "INSERT OR IGNORE INTO customer_assets (customer_id, asset_type, asset_id) VALUES (?, 'colo_customers', ?)",
                  [customerId, colo.id],
                  (err) => {
                    if (!err) totalMapped++;
                  }
                );
              }
            });
          }
        });
        
        // Give operations time to complete
        setTimeout(() => {
          console.log(`Auto-mapped ${totalMapped} assets to customers`);
          resolve(totalMapped);
        }, 500);
      });
    });
  }

  deleteCustomer(id) {
    return new Promise((resolve, reject) => {
      // First delete customer_assets relationships
      this.db.run("DELETE FROM customer_assets WHERE customer_id = ?", [id], err => {
        if (err) {
          reject(err);
          return;
        }
        
        // Then delete the customer
        this.db.run("DELETE FROM customers WHERE id = ?", [id], err => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  linkAssetToCustomer(customerId, assetType, assetId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT OR IGNORE INTO customer_assets (customer_id, asset_type, asset_id) VALUES (?, ?, ?)",
        [customerId, assetType, assetId],
        err => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  unlinkAssetFromCustomer(customerId, assetType, assetId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "DELETE FROM customer_assets WHERE customer_id = ? AND asset_type = ? AND asset_id = ?",
        [customerId, assetType, assetId],
        err => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  getCustomerMigrationStatus(customerId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          ca.asset_type,
          COUNT(*) as total,
          SUM(CASE 
            WHEN ca.asset_type = 'servers' AND s.migration_completed = 1 THEN 1
            WHEN ca.asset_type = 'public_networks' AND pn.cutover_completed = 1 THEN 1
            WHEN ca.asset_type = 'carrier_circuits' AND cc.cutover_completed = 1 THEN 1
            WHEN ca.asset_type = 'colo_customers' AND col.migration_completed = 1 THEN 1
            ELSE 0
          END) as completed
        FROM customer_assets ca
        LEFT JOIN servers s ON ca.asset_type = 'servers' AND ca.asset_id = s.id
        LEFT JOIN public_networks pn ON ca.asset_type = 'public_networks' AND ca.asset_id = pn.id
        LEFT JOIN carrier_circuits cc ON ca.asset_type = 'carrier_circuits' AND ca.asset_id = cc.id
        LEFT JOIN colo_customers col ON ca.asset_type = 'colo_customers' AND ca.asset_id = col.id
        WHERE ca.customer_id = ?
        GROUP BY ca.asset_type
      `;
      
      this.db.all(query, [customerId], (err, rows) => {
        if (err) reject(err);
        else {
          const status = {
            servers: { total: 0, completed: 0 },
            public_networks: { total: 0, completed: 0 },
            carrier_circuits: { total: 0, completed: 0 },
            colo_customers: { total: 0, completed: 0 }
          };
          
          rows.forEach(row => {
            status[row.asset_type] = {
              total: row.total,
              completed: row.completed
            };
          });
          
          resolve(status);
        }
      });
    });
  }
}

module.exports = Database;