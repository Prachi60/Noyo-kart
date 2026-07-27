import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const baseUri = process.env.MONGO_URI || '';
// If SERVICE_MONGO_URI is set, use it. Otherwise, replace Quick_commerce with Service in the default URI
const serviceUri = process.env.SERVICE_MONGO_URI || baseUri.replace('Quick_commerce', 'Service');

if (!serviceUri) {
  console.error('[ServiceDB] No MongoDB URI provided for Service database');
}

const serviceDb = mongoose.createConnection(serviceUri, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
});

serviceDb.on('connected', () => {
  console.log('[ServiceDB] Connected to Service database');
});

serviceDb.on('error', (err) => {
  console.error('[ServiceDB] Connection error:', err.message);
});

export default serviceDb;
