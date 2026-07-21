import fs from 'fs';
import path from 'path';

const modelsDir = path.join(process.cwd(), 'app/modules/serviceProvider/models');

const files = fs.readdirSync(modelsDir);

for (const file of files) {
  if (file === 'index.js' || !file.endsWith('.js')) continue;

  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Remove the import statement
  content = content.replace(
    /import mongoose from 'mongoose';\nimport serviceDb from '\.\.\/config\/db\.js';/,
    "import mongoose from 'mongoose';"
  );

  // Replace serviceDb.model with mongoose.model
  content = content.replace(/serviceDb\.model\(/g, "mongoose.model(");

  fs.writeFileSync(filePath, content);
  console.log(`Reverted ${file}`);
}

console.log('All Service Provider models reverted to use mongoose connection.');
