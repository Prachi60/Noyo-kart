import fs from 'fs';
import path from 'path';

const modelsDir = path.join(process.cwd(), 'app/modules/serviceProvider/models');

const files = fs.readdirSync(modelsDir);

for (const file of files) {
  if (file === 'index.js' || !file.endsWith('.js')) continue;

  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Skip if already updated
  if (content.includes("import serviceDb from '../config/db.js';")) {
    continue;
  }

  // Add the import statement
  content = content.replace(
    /import mongoose from ['"]mongoose['"];/,
    "import mongoose from 'mongoose';\nimport serviceDb from '../config/db.js';"
  );

  // Replace mongoose.model with serviceDb.model
  content = content.replace(/mongoose\.model\(/g, "serviceDb.model(");

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
}

console.log('All Service Provider models updated to use serviceDb connection.');
