import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import SpBrand from '../app/modules/serviceProvider/models/SpBrand.js';
import serviceDb from '../app/modules/serviceProvider/config/db.js';

const deleteExtraBrands = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error('MONGO_URI environment variable is not defined');

    // Mongoose default connection
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to default MongoDB');
    
    // Ensure serviceDb is ready
    if (serviceDb.readyState !== 1) {
       await new Promise(resolve => serviceDb.once('connected', resolve));
    }
    console.log('✓ Connected to Service MongoDB');

    // Find and delete all brands with titles ending in ' Brand 3', ' Brand 4', ' Brand 5'
    const regex = /Brand [3-5]$/i;
    
    const result = await SpBrand.deleteMany({ title: { $regex: regex } });
    
    console.log(`✓ Cleanup complete. Deleted ${result.deletedCount} extra brands.`);
    process.exit(0);
  } catch (error) {
    console.error('✗ Error deleting SP brands:', error);
    process.exit(1);
  }
};

deleteExtraBrands();
