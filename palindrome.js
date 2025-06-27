/**
 * Checks if a string is a palindrome
 * @param {string} str - The string to check
 * @returns {boolean} - True if the string is a palindrome, false otherwise
 */
function isPalindrome(str) {
  // Remove non-alphanumeric characters and convert to lowercase
  const cleaned = str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
  // Check if the cleaned string reads the same forwards and backwards
  const reversed = cleaned.split('').reverse().join('');
  return cleaned === reversed;
}

// Test cases
const testCases = [
  { input: "racecar", expected: true },
  { input: "A man, a plan, a canal: Panama", expected: true },
  { input: "race a car", expected: true },
  { input: "hello", expected: false },
  { input: "Madam", expected: true },
  { input: "Was it a car or a cat I saw?", expected: true },
  { input: "No 'x' in Nixon", expected: false },
  { input: "Able was I ere I saw Elba", expected: true },
  { input: "12321", expected: true },
  { input: "12345", expected: false },
  { input: "", expected: true },
  { input: "a", expected: true }
];

// Run tests
console.log("Running palindrome tests...\n");
testCases.forEach(({ input, expected }, index) => {
  const result = isPalindrome(input);
  const passed = result === expected;
  console.log(`Test ${index + 1}: "${input}"`);
  console.log(`  Expected: ${expected}, Got: ${result} - ${passed ? "PASS" : "FAIL"}\n`);
});

// Export for use in other modules
module.exports = { isPalindrome };