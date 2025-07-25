#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration for test data files
const testFiles = [
  {
    name: 'small.txt',
    size: 1024, // 1KB
    type: 'text'
  },
  {
    name: 'medium.txt',
    size: 1024 * 1024, // 1MB
    type: 'text'
  },
  {
    name: 'large.txt',
    size: 10 * 1024 * 1024, // 10MB
    type: 'text'
  },
  {
    name: 'small.json',
    size: 1024, // 1KB
    type: 'json'
  },
  {
    name: 'medium.json',
    size: 1024 * 1024, // 1MB
    type: 'json'
  },
  {
    name: 'large.json',
    size: 10 * 1024 * 1024, // 10MB
    type: 'json'
  }
];

function generateTextContent(size) {
  const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium. Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit. Sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur. Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur. `;
  
  let content = '';
  while (content.length < size) {
    content += loremIpsum;
  }
  
  return content.substring(0, size);
}

function generateJsonContent(size) {
  const baseItem = {
    id: 0,
    name: "Sample Item",
    description: "This is a sample item for benchmarking JSON operations",
    tags: ["benchmark", "test", "data"],
    metadata: {
      created: new Date().toISOString(),
      version: "1.0.0",
      category: "test",
      priority: "medium"
    },
    data: "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
  };
  
  const items = [];
  let currentSize = 0;
  let id = 0;
  
  while (currentSize < size) {
    const item = {
      ...baseItem,
      id: id++,
      name: `Item_${id}`,
      data: generateTextContent(Math.min(100, size - currentSize - 200))
    };
    
    const itemJson = JSON.stringify(item);
    items.push(item);
    currentSize += itemJson.length + 2; // +2 for comma and newline
    
    if (currentSize > size) {
      break;
    }
  }
  
  return JSON.stringify(items, null, 2);
}

function generateFile(fileConfig, outputDir) {
  const filePath = path.join(outputDir, fileConfig.name);
  
  console.log(`Generating ${fileConfig.name} (${(fileConfig.size / 1024).toFixed(1)}KB)...`);
  
  let content;
  if (fileConfig.type === 'json') {
    content = generateJsonContent(fileConfig.size);
  } else {
    content = generateTextContent(fileConfig.size);
  }
  
  fs.writeFileSync(filePath, content);
  
  const actualSize = fs.statSync(filePath).size;
  console.log(`  ✓ Generated ${fileConfig.name} (${(actualSize / 1024).toFixed(1)}KB)`);
}

function main() {
  const testDataDir = path.join(__dirname, '..', 'test_data');
  
  // Create test_data directory if it doesn't exist
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
    console.log('Created test_data directory');
  }
  
  console.log('Generating test data files...\n');
  
  // Generate each test file
  testFiles.forEach(fileConfig => {
    generateFile(fileConfig, testDataDir);
  });
  
  console.log('\n✓ All test data files generated successfully!');
  console.log(`\nFiles created in: ${testDataDir}`);
  
  // List generated files with sizes
  console.log('\nGenerated files:');
  testFiles.forEach(fileConfig => {
    const filePath = path.join(testDataDir, fileConfig.name);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`  ${fileConfig.name}: ${(stats.size / 1024).toFixed(1)}KB`);
    }
  });
}

if (require.main === module) {
  main();
}

module.exports = { generateTextContent, generateJsonContent, testFiles }; 