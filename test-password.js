const bcrypt = require('bcryptjs');

const password = 'Admin123!@#';
const testHash = '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjefOxW82F3OEW.xzuFxC.euyDrGIu';

console.log('Testing password:', password);
console.log('Test hash:', testHash);

// Generate new hash
bcrypt.genSalt(10).then(salt => {
  return bcrypt.hash(password, salt);
}).then(newHash => {
  console.log('\n=== NEW HASH GENERATED ===');
  console.log(newHash);
  
  // Test if new hash works
  return bcrypt.compare(password, newHash).then(result => {
    console.log('\n=== NEW HASH TEST ===');
    console.log('Password matches new hash:', result);
    
    // Test if old hash works
    return bcrypt.compare(password, testHash);
  });
}).then(result => {
  console.log('\n=== OLD HASH TEST ===');
  console.log('Password matches old hash:', result);
}).catch(err => {
  console.error('Error:', err);
});
