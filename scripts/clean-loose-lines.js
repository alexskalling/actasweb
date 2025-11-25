const fs = require('fs');
const path = require('path');

function cleanLooseLines(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let cleanedLines = [];
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip lines that are just template strings with comma, or just closing parentheses
    if (trimmed.match(/^`[^`]*`,\s*$/) || 
        (trimmed === ');' && i > 0 && cleanedLines[cleanedLines.length - 1]?.trim().match(/^`[^`]*`/))) {
      modified = true;
      continue;
    }
    
    // Skip lines that are just closing parentheses after a template string
    if (trimmed === ')' && i > 0 && cleanedLines[cleanedLines.length - 1]?.trim().match(/^`[^`]*`/)) {
      modified = true;
      continue;
    }

    cleanedLines.push(line);
  }

  if (modified) {
    fs.writeFileSync(filePath, cleanedLines.join('\n'), 'utf8');
    return true;
  }
  return false;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let cleanedCount = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      cleanedCount += processDirectory(filePath);
    } else if ((file.endsWith('.ts') || file.endsWith('.tsx')) && !file.includes('node_modules')) {
      if (cleanLooseLines(filePath)) {
        cleanedCount++;
        console.log(`Cleaned: ${filePath}`);
      }
    }
  }

  return cleanedCount;
}

const targetDir = path.join(__dirname, '..', 'app', '(generador)');
console.log(`Cleaning loose lines in: ${targetDir}`);
const count = processDirectory(targetDir);
console.log(`Cleaned ${count} files`);



