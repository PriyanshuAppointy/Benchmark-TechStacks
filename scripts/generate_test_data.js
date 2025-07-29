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
    name: 'xlarge_lines.txt',
    lines: 1000000, // 1 million lines
    type: 'text_lines'
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
  },
  {
    name: 'xlarge_lines.json',
    lines: 1000000, // 1 million lines
    type: 'json_lines'
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

function generateTextLines(lines) {
  const sampleTexts = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.",
    "Excepteur sint occaecat cupidatat non proident, sunt in culpa.",
    "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit.",
    "Sed quia non numquam eius modi tempora incidunt ut labore.",
    "Quis autem vel eum iure reprehenderit qui in ea voluptate velit.",
    "At vero eos et accusamus et iusto odio dignissimos ducimus.",
    "Et harum quidem rerum facilis est et expedita distinctio."
  ];

  let content = '';
  for (let i = 0; i < lines; i++) {
    const textIndex = i % sampleTexts.length;
    const lineNumber = String(i + 1).padStart(7, '0');
    content += `Line ${lineNumber}: ${sampleTexts[textIndex]}\n`;
  }
  
  return content;
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

function generateJsonLines(lines) {
  const sampleCategories = ["test", "benchmark", "data", "sample", "mock"];
  const samplePriorities = ["low", "medium", "high", "critical"];
  const sampleTags = [
    ["benchmark", "test"],
    ["data", "sample"],
    ["mock", "test", "data"],
    ["performance", "benchmark"],
    ["json", "test"]
  ];

  let content = '';
  for (let i = 0; i < lines; i++) {
    const item = {
      id: i + 1,
      name: `Item_${String(i + 1).padStart(7, '0')}`,
      description: `Sample item ${i + 1} for benchmarking JSON line operations`,
      category: sampleCategories[i % sampleCategories.length],
      priority: samplePriorities[i % samplePriorities.length],
      tags: sampleTags[i % sampleTags.length],
      timestamp: new Date(Date.now() + i * 1000).toISOString(),
      value: Math.floor(Math.random() * 10000),
      active: i % 3 === 0
    };
    
    content += JSON.stringify(item) + '\n';
  }
  
  return content;
}

function generateFile(fileConfig, outputDir) {
  const filePath = path.join(outputDir, fileConfig.name);
  
  if (fileConfig.lines) {
    console.log(`Generating ${fileConfig.name} (${fileConfig.lines.toLocaleString()} lines)...`);
  } else {
    console.log(`Generating ${fileConfig.name} (${(fileConfig.size / 1024).toFixed(1)}KB)...`);
  }
  
  let content;
  if (fileConfig.type === 'json') {
    content = generateJsonContent(fileConfig.size);
  } else if (fileConfig.type === 'text_lines') {
    content = generateTextLines(fileConfig.lines);
  } else if (fileConfig.type === 'json_lines') {
    content = generateJsonLines(fileConfig.lines);
  } else {
    content = generateTextContent(fileConfig.size);
  }
  
  fs.writeFileSync(filePath, content);
  
  const actualSize = fs.statSync(filePath).size;
  if (fileConfig.lines) {
    console.log(`  ✓ Generated ${fileConfig.name} (${fileConfig.lines.toLocaleString()} lines, ${(actualSize / 1024 / 1024).toFixed(1)}MB)`);
  } else {
    console.log(`  ✓ Generated ${fileConfig.name} (${(actualSize / 1024).toFixed(1)}KB)`);
  }
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
      if (fileConfig.lines) {
        console.log(`  ${fileConfig.name}: ${fileConfig.lines.toLocaleString()} lines (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
      } else {
        console.log(`  ${fileConfig.name}: ${(stats.size / 1024).toFixed(1)}KB`);
      }
    }
  });
}

if (require.main === module) {
  main();
}

module.exports = { generateTextContent, generateJsonContent, generateTextLines, generateJsonLines, testFiles }; 