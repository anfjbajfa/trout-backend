const { Pool } = require('pg');

// 创建一个连接池，这比为每个请求创建新连接更高效
const pool = new Pool({
    user: 'postgres', // 您的PostgreSQL用户名
    host: 'localhost',
    database: 'Geo778_db',
    password: 'Qwer13579', // 您设置的密码
    port: 5432,
});

// 导出一个可以执行查询的函数
module.exports = {
    query: (text, params) => pool.query(text, params),
};