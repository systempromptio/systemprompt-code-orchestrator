/**
 * Checks if a number is prime
 * @param {number} num - The number to check
 * @returns {boolean} - True if prime, false otherwise
 */
function isPrime(num) {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;
  
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) {
      return false;
    }
  }
  
  return true;
}

// Test numbers 1-20
console.log('Prime check for numbers 1-20:');
for (let i = 1; i <= 20; i++) {
  console.log(`${i}: ${isPrime(i) ? 'Prime' : 'Not Prime'}`);
}

// Export for use in other modules
module.exports = { isPrime };