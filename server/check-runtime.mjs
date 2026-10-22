import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync(':memory:');
console.log({ node: process.version, sqlite: db.prepare('select sqlite_version() as version').get().version });
db.close();
