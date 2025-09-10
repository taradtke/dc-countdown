-- Recreate critical_items table with updated structure
-- SQLite doesn't support ALTER COLUMN so we need to recreate

-- Step 1: Create new table with correct structure
CREATE TABLE IF NOT EXISTS critical_items_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    success_criteria TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    assigned_engineer TEXT,
    deadline DATE,
    completed_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy data from old table if it exists
INSERT INTO critical_items_new (id, title, description, priority, status, assigned_engineer, deadline, completed_date, notes, created_at, updated_at)
SELECT id, title, description, priority, status, assigned_to, deadline, completed_date, notes, created_at, updated_at
FROM critical_items WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='critical_items');

-- Step 3: Drop old table
DROP TABLE IF EXISTS critical_items;

-- Step 4: Rename new table
ALTER TABLE critical_items_new RENAME TO critical_items;

-- Step 5: Recreate index
CREATE INDEX IF NOT EXISTS idx_critical_items_status ON critical_items(status, priority);
CREATE INDEX IF NOT EXISTS idx_critical_items_assigned ON critical_items(assigned_engineer);