// test-admin-password.mjs
import bcrypt from 'bcrypt';

const hash = '$2b$10$DvTXWapEtvHwq1KTdNGupO0oexDDm7UJK/SVX4qpqsmra35P93Ohe';
const passwords = ['admin123', 'admin', '123456', 'password', 'Admin123'];

for (const pwd of passwords) {
  const match = await bcrypt.compare(pwd, hash);
  console.log(`"${pwd}": ${match ? '✅ MATCH' : '❌'}`);
}
