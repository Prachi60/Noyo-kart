import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testSSO() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('No MONGO_URI');
    return;
  }
  
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  
  // Find a test user in Quick_commerce users collection
  const user = await db.collection('users').findOne({ role: 'user' });
  if (!user) {
    console.log('No user found in Quick_commerce to test');
    mongoose.disconnect();
    return;
  }
  
  console.log('Found user:', user.phone, user._id);
  
  // Create a JWT token like QC does
  const qcToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
  console.log('Generated qcToken');
  
  // Try calling the SSO endpoint
  try {
    const res = await axios.post('http://localhost:7000/api/sp/users/auth/sso-login', { qcToken });
    console.log('SSO SUCCESS:', res.data);
  } catch (err) {
    console.error('SSO ERROR:', err.response?.data || err.message);
  }
  
  // Test Admin SSO
  const admin = await db.collection('admins').findOne({});
  if (admin) {
    console.log('\nFound admin:', admin.email, admin._id);
    const qcAdminToken = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    try {
      const resAdmin = await axios.post('http://localhost:7000/api/sp/admin/auth/sso-login', { qcToken: qcAdminToken });
      console.log('ADMIN SSO SUCCESS:', resAdmin.data);
    } catch (err) {
      console.error('ADMIN SSO ERROR:', err.response?.data || err.message);
    }
  } else {
    console.log('No admin found to test');
  }
  
  mongoose.disconnect();
}

testSSO();
