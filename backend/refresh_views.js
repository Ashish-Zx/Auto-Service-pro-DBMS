const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function refreshViews() {
    console.log('🚀 Refreshing SQL Views on Local MySQL...');
    
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'auto_service_database',
        multipleStatements: true
    });

    try {
        const viewPath = path.join(__dirname, '..', 'database', '03_views.sql');
        const sql = fs.readFileSync(viewPath, 'utf8');
        const statements = sql.split(';').filter(s => s.trim().length > 0);
        
        for (let statement of statements) {
            if (statement.toLowerCase().includes('create or replace view')) {
                console.log(`- Updating: ${statement.split('VIEW')[1].split('AS')[0].trim()}`);
                await conn.query(statement);
            }
        }
        console.log('✅ REVENUE-FIRST VIEWS ARE NOW LIVE!');

    } catch (err) {
        console.error('❌ REFRESH ERROR:', err.message);
    } finally {
        await conn.end();
    }
}

refreshViews();
