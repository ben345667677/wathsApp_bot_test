-- WhatsApp Bot Database Schema
-- This file initializes the database with required tables

CREATE DATABASE IF NOT EXISTS whatsapp_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE whatsapp_bot;

-- Groups table
CREATE TABLE IF NOT EXISTS `groups` (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    creator VARCHAR(50) NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive') DEFAULT 'active',
    left_at TIMESTAMP NULL,
    reactivated TIMESTAMP NULL,
    INDEX idx_creator (creator),
    INDEX idx_status (status)
);

-- Phone mapping table (for LID to phone number mapping)
CREATE TABLE IF NOT EXISTS phone_mapping (
    lid_jid VARCHAR(100) PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone_number)
);

-- User states table (for managing multi-step processes)
CREATE TABLE IF NOT EXISTS user_states (
    phone_number VARCHAR(50) PRIMARY KEY,
    state VARCHAR(50) NOT NULL,
    data JSON,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Files table (for tracking saved files)
CREATE TABLE IF NOT EXISTS files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_type ENUM('image', 'text', 'document') NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone_type (phone_number, file_type),
    INDEX idx_created (created)
);

-- Texts table (for saved text content)
CREATE TABLE IF NOT EXISTS texts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL,
    text_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone_name (phone_number, text_name),
    INDEX idx_created (created)
);

-- Bot settings table (for configuration)
CREATE TABLE IF NOT EXISTS bot_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT,
    description VARCHAR(255),
    updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO bot_settings (setting_key, setting_value, description) VALUES
('bot_version', '2.0', 'Bot version number'),
('max_file_size', '10485760', 'Maximum file size in bytes (10MB)'),
('max_files_per_user', '100', 'Maximum files per user')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Create indexes for better performance
CREATE INDEX idx_groups_creator_status ON groups (creator, status);
CREATE INDEX idx_files_phone_created ON files (phone_number, created DESC);
CREATE INDEX idx_texts_phone_created ON texts (phone_number, created DESC);

-- Create a user for the bot application
CREATE USER IF NOT EXISTS 'botuser'@'%' IDENTIFIED BY 'botpassword123!';
GRANT ALL PRIVILEGES ON whatsapp_bot.* TO 'botuser'@'%';
FLUSH PRIVILEGES;
