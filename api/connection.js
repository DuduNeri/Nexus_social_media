import pkg from 'pg'; 
const { Pool } = pkg; 

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'nova_senha', 
  database: 'nexus2.0'
});

export default pool;
