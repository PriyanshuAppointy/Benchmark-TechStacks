const { execSync } = require('child_process');
const path = require('path');

console.log('Compiling NestJS TypeScript application...');

try {
  // Compile TypeScript files
  execSync('npx tsc --target es2020 --module commonjs --experimentalDecorators --emitDecoratorMetadata --esModuleInterop --allowSyntheticDefaultImports --skipLibCheck --outDir http_server/dist http_server/*.ts', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  
  console.log('Compilation successful, starting server...');
  
  // Run the compiled JavaScript
  require('./dist/main.js');
  
} catch (error) {
  console.error('Compilation failed:', error.message);
  process.exit(1);
} 