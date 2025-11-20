import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function removeComments(content) {
  let result = content;
  let inMultiLineComment = false;
  let inString = false;
  let stringChar = '';
  let lines = result.split('\n');
  let cleanedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let cleanedLine = '';
    let j = 0;
    
    while (j < line.length) {
      if (inMultiLineComment) {
        if (line[j] === '*' && j + 1 < line.length && line[j + 1] === '/') {
          inMultiLineComment = false;
          j += 2;
          continue;
        }
        j++;
        continue;
      }
      
      if (!inString && (line[j] === '"' || line[j] === "'" || line[j] === '`')) {
        inString = true;
        stringChar = line[j];
        cleanedLine += line[j];
        j++;
        continue;
      }
      
      if (inString) {
        if (line[j] === stringChar && (j === 0 || line[j - 1] !== '\\')) {
          inString = false;
          stringChar = '';
        }
        cleanedLine += line[j];
        j++;
        continue;
      }
      
      if (line[j] === '/' && j + 1 < line.length) {
        if (line[j + 1] === '/') {
          break;
        } else if (line[j + 1] === '*') {
          inMultiLineComment = true;
          j += 2;
          continue;
        }
      }
      
      cleanedLine += line[j];
      j++;
    }
    
    cleanedLine = cleanedLine.trimEnd();
    if (cleanedLine.trim() || cleanedLine === '') {
      cleanedLines.push(cleanedLine);
    }
  }
  
  return cleanedLines.join('\n');
}

function cleanFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    content = removeComments(content);
    
    content = content.replace(/\n{3,}/g, '\n\n');
    
    content = content.replace(/[ \t]+$/gm, '');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Limpiado: ${filePath}`);
  } catch (error) {
    console.error(`✗ Error en ${filePath}:`, error.message);
  }
}

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      findFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const appDir = path.join(__dirname, '..', 'app');
const files = findFiles(appDir);

console.log(`Encontrados ${files.length} archivos para limpiar...\n`);

files.forEach(file => {
  cleanFile(file);
});

console.log(`\n✓ Completado: ${files.length} archivos procesados`);

