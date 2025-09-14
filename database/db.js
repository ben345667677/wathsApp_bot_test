const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'mysql-db',
    user: process.env.DB_USER || 'botuser',
    password: process.env.DB_PASSWORD || 'botpassword123!',
    database: process.env.DB_NAME || 'whatsapp_bot',
    charset: 'utf8mb4',
    timezone: '+00:00',
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
};

// Connection pool
let pool;

// Initialize database connection
async function initDatabase() {
    try {
        pool = mysql.createPool({
            ...dbConfig,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Test connection
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();

        return pool;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        throw error;
    }
}

// Get database connection
function getDB() {
    if (!pool) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return pool;
}

// Groups operations
const Groups = {
    // Get all groups
    async getAll() {
        const db = getDB();
        const [rows] = await db.execute('SELECT * FROM groups ORDER BY created DESC');
        return rows;
    },

    // Get group by ID
    async getById(groupId) {
        const db = getDB();
        const [rows] = await db.execute('SELECT * FROM groups WHERE id = ?', [groupId]);
        return rows[0] || null;
    },

    // Get groups by creator
    async getByCreator(creator) {
        const db = getDB();
        const [rows] = await db.execute('SELECT * FROM groups WHERE creator = ? ORDER BY created DESC', [creator]);
        return rows;
    },

    // Get active groups by creator
    async getActiveByCreator(creator) {
        const db = getDB();
        const [rows] = await db.execute('SELECT * FROM groups WHERE creator = ? AND status = "active" ORDER BY created DESC', [creator]);
        return rows;
    },

    // Create new group
    async create(groupId, name, creator) {
        const db = getDB();
        await db.execute(
            'INSERT INTO groups (id, name, creator, status) VALUES (?, ?, ?, "active")',
            [groupId, name, creator]
        );
        return await this.getById(groupId);
    },

    // Update group status
    async updateStatus(groupId, status) {
        const db = getDB();
        const leftAt = status === 'inactive' ? new Date() : null;
        await db.execute(
            'UPDATE groups SET status = ?, left_at = ? WHERE id = ?',
            [status, leftAt, groupId]
        );
        return await this.getById(groupId);
    },

    // Reactivate group
    async reactivate(groupId, newName) {
        const db = getDB();
        await db.execute(
            'UPDATE groups SET status = "active", name = ?, reactivated = NOW(), left_at = NULL WHERE id = ?',
            [newName, groupId]
        );
        return await this.getById(groupId);
    }
};

// Phone mapping operations
const PhoneMapping = {
    // Get all mappings
    async getAll() {
        const db = getDB();
        const [rows] = await db.execute('SELECT * FROM phone_mapping');
        return rows;
    },

    // Get phone by LID
    async getPhoneByLid(lidJid) {
        const db = getDB();
        const [rows] = await db.execute('SELECT phone_number FROM phone_mapping WHERE lid_jid = ?', [lidJid]);
        return rows[0] ? rows[0].phone_number : null;
    },

    // Set mapping
    async setMapping(lidJid, phoneNumber) {
        const db = getDB();
        await db.execute(
            'INSERT INTO phone_mapping (lid_jid, phone_number) VALUES (?, ?) ON DUPLICATE KEY UPDATE phone_number = ?, updated = NOW()',
            [lidJid, phoneNumber, phoneNumber]
        );
    }
};

// User states operations
const UserStates = {
    // Get user state
    async get(phoneNumber) {
        const db = getDB();
        const [rows] = await db.execute('SELECT * FROM user_states WHERE phone_number = ?', [phoneNumber]);
        const state = rows[0];
        return state ? {
            state: state.state,
            data: state.data
        } : null;
    },

    // Set user state
    async set(phoneNumber, state, data = null) {
        const db = getDB();
        await db.execute(
            'INSERT INTO user_states (phone_number, state, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE state = ?, data = ?, updated = NOW()',
            [phoneNumber, state, JSON.stringify(data), state, JSON.stringify(data)]
        );
    },

    // Delete user state
    async delete(phoneNumber) {
        const db = getDB();
        await db.execute('DELETE FROM user_states WHERE phone_number = ?', [phoneNumber]);
    }
};

// Files operations
const Files = {
    // Save file record
    async save(phoneNumber, fileName, originalName, fileType, filePath, fileSize = null) {
        const db = getDB();
        const [result] = await db.execute(
            'INSERT INTO files (phone_number, file_name, original_name, file_type, file_path, file_size) VALUES (?, ?, ?, ?, ?, ?)',
            [phoneNumber, fileName, originalName, fileType, filePath, fileSize]
        );
        return result.insertId;
    },

    // Get files by user and type
    async getByUserAndType(phoneNumber, fileType) {
        const db = getDB();
        const [rows] = await db.execute(
            'SELECT * FROM files WHERE phone_number = ? AND file_type = ? ORDER BY created DESC',
            [phoneNumber, fileType]
        );
        return rows;
    },

    // Get file by ID
    async getById(fileId) {
        const db = getDB();
        const [rows] = await db.execute('SELECT * FROM files WHERE id = ?', [fileId]);
        return rows[0] || null;
    }
};

// Texts operations
const Texts = {
    // Save text
    async save(phoneNumber, textName, content) {
        const db = getDB();
        const [result] = await db.execute(
            'INSERT INTO texts (phone_number, text_name, content) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE content = ?, updated = NOW()',
            [phoneNumber, textName, content, content]
        );
        return result.insertId || result.affectedRows;
    },

    // Get texts by user
    async getByUser(phoneNumber) {
        const db = getDB();
        const [rows] = await db.execute(
            'SELECT * FROM texts WHERE phone_number = ? ORDER BY created DESC',
            [phoneNumber]
        );
        return rows;
    },

    // Get text by user and name
    async getByUserAndName(phoneNumber, textName) {
        const db = getDB();
        const [rows] = await db.execute(
            'SELECT * FROM texts WHERE phone_number = ? AND text_name = ?',
            [phoneNumber, textName]
        );
        return rows[0] || null;
    }
};

// Bot settings operations
const Settings = {
    // Get setting
    async get(key) {
        const db = getDB();
        const [rows] = await db.execute('SELECT setting_value FROM bot_settings WHERE setting_key = ?', [key]);
        return rows[0] ? rows[0].setting_value : null;
    },

    // Set setting
    async set(key, value, description = null) {
        const db = getDB();
        await db.execute(
            'INSERT INTO bot_settings (setting_key, setting_value, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = ?, updated = NOW()',
            [key, value, description, value]
        );
    }
};

// Close database connection
async function closeDatabase() {
    if (pool) {
        await pool.end();
        console.log('🔒 Database connection closed');
    }
}

module.exports = {
    initDatabase,
    getDB,
    closeDatabase,
    Groups,
    PhoneMapping,
    UserStates,
    Files,
    Texts,
    Settings
};