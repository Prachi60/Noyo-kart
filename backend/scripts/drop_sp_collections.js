import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI || '';

async function dropSpCollections() {
  if (!mongoUri) {
    console.error('MONGO_URI is not set.');
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to Quick_commerce database.');

    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (let collection of collections) {
      if (collection.name.startsWith('sp')) {
        console.log(`Dropping collection: ${collection.name}`);
        await mongoose.connection.db.dropCollection(collection.name);
        console.log(`Successfully dropped ${collection.name}`);
      }
    }

    console.log('All sp prefixed collections have been removed from Quick_commerce database.');
  } catch (err) {
    console.error('Error dropping collections:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

dropSpCollections();
