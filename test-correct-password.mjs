import bcrypt from 'bcryptjs';

const password = 'Admin123!';  // Correct password without @#
console.log('Testing password:', password);

// Generate new hash
const salt = await bcrypt.genSalt(10);
const newHash = await bcrypt.hash(password, salt);

console.log('\n=== HASH FOR Admin123! ===');
console.log(newHash);

// Verify it works
const works = await bcrypt.compare(password, newHash);
console.log('\nPassword verification:', works);
