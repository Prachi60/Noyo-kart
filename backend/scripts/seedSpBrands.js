import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import SpCategory from '../app/modules/serviceProvider/models/SpCategory.js';
import SpBrand from '../app/modules/serviceProvider/models/SpBrand.js';
import serviceDb from '../app/modules/serviceProvider/config/db.js';

const seedSpBrands = async () => {
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

    const categories = await SpCategory.find();
    console.log(`Found ${categories.length} categories.`);

    let createdCount = 0;

    for (const category of categories) {
      for (let i = 1; i <= 5; i++) {
        const brandTitle = `${category.title} Brand ${i}`;
        const brandSlug = brandTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');
        
        // Check if exists
        const existing = await SpBrand.findOne({ title: brandTitle, categoryIds: category._id });
        if (!existing) {
          await SpBrand.create({
            title: brandTitle,
            slug: brandSlug,
            categoryIds: [category._id],
            categoryId: category._id,
            isPopular: i <= 2, // Make the first 2 popular
            rating: parseFloat((Math.random() * 2 + 3).toFixed(1)), // random rating between 3 and 5
            totalBookings: Math.floor(Math.random() * 100)
          });
          createdCount++;
        }
      }
    }

    console.log(`✓ Seeding complete. Created ${createdCount} new brands.`);
    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding SP brands:', error);
    process.exit(1);
  }
};

seedSpBrands();
