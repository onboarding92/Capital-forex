import bcrypt from 'bcryptjs';

const password = 'Admin123!@#';
const testHash = '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjefOxW82F3OEW.xzuFxC.euyDrGIu';

console.log('Testing password:', password);
console.log('Test hash:', testHash);

// Generate new hash
const salt = await bcrypt.genSalt(10);
const newHash = await bcrypt.hash(password, salt);

console.log('\n=== NEW HASH GENERATED ===');
console.log(newHash);

// Test if new hash works
const newHashWorks = await bcrypt.compare(password, newHash);
console.log('\n=== NEW HASH TEST ===');
console.log('Password matches new hash:', newHashWorks);

// Test if old hash works
const oldHashWorks = await bcrypt.compare(password, testHash);
console.log('\n=== OLD HASH TEST ===');
console.log('Password matches old hash:', oldHashWorks);
