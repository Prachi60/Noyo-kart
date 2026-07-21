import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function testSSO() {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(process.env.MONGO_URI);
    
    const Customer = (await import('./app/models/customer.js')).default;
    const customer = await Customer.findOne();
    if (!customer) {
      console.log('No QC Customer found');
      process.exit(1);
    }

    console.log('Found Customer:', customer.phone);

    const token = jwt.sign(
      { id: customer._id, role: "customer" },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: "365d" }
    );

    console.log('Generated token for', customer.phone);

    const res = await axios.post('http://localhost:7000/api/sp/users/auth/sso-login', {
      qcToken: token
    });

    console.log('Response:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('API Error Response:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  } finally {
    mongoose.connection.close();
  }
}

testSSO();
