function fibonacci(n) {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  
  let prev = 0;
  let curr = 1;
  
  for (let i = 2; i <= n; i++) {
    const temp = curr;
    curr = prev + curr;
    prev = temp;
  }
  
  return curr;
}

// Tests for n=1 to 10
console.log('Fibonacci Tests:');
for (let i = 1; i <= 10; i++) {
  console.log(`fibonacci(${i}) = ${fibonacci(i)}`);
}

// Expected results:
// fibonacci(1) = 1
// fibonacci(2) = 1
// fibonacci(3) = 2
// fibonacci(4) = 3
// fibonacci(5) = 5
// fibonacci(6) = 8
// fibonacci(7) = 13
// fibonacci(8) = 21
// fibonacci(9) = 34
// fibonacci(10) = 55

export default fibonacci;