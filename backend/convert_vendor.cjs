const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  'c:\\Users\\admin\\Downloads\\sevice provider app\\Backend\\controllers\\bookingControllers\\vendorBookingController.js',
  'utf8'
);

let c = src;

// Top-level requires -> imports
c = c.replace("const mongoose = require('mongoose');", "import mongoose from 'mongoose';");
c = c.replace("const Booking = require('../../models/Booking');", "import SpBooking from '../../models/SpBooking.js';");
c = c.replace("const Worker = require('../../models/Worker');", "import SpWorker from '../../models/SpWorker.js';");
c = c.replace("const { validationResult } = require('express-validator');", "import { validationResult } from 'express-validator';");
c = c.replace("const { BOOKING_STATUS, PAYMENT_STATUS } = require('../../utils/constants');", "import { SP_BOOKING_STATUS, SP_PAYMENT_STATUS } from '../../constants.js';");
c = c.replace("const { createNotification } = require('../notificationControllers/notificationController');", "import { createNotification } from '../notificationControllers/notificationController.js';");
c = c.replace("const { sendNotificationToUser, sendNotificationToVendor, sendNotificationToWorker } = require('../../services/firebaseAdmin');", "import { sendNotificationToUser, sendNotificationToVendor, sendNotificationToWorker } from '../../services/firebaseAdmin.js';");

// Replace Booking -> SpBooking (careful not to replace BookingRequest, bookingNumber etc)
c = c.replaceAll('Booking.find', 'SpBooking.find');
c = c.replaceAll('Booking.findOne', 'SpBooking.findOne');
c = c.replaceAll('Booking.findById', 'SpBooking.findById');
c = c.replaceAll('Booking.findOneAndUpdate', 'SpBooking.findOneAndUpdate');
c = c.replaceAll('Booking.aggregate', 'SpBooking.aggregate');
c = c.replaceAll('Booking.populate', 'SpBooking.populate');
c = c.replaceAll('Booking.countDocuments', 'SpBooking.countDocuments');
c = c.replaceAll('Booking.updateOne', 'SpBooking.updateOne');

// Replace Worker -> SpWorker
c = c.replaceAll('Worker.findOne', 'SpWorker.findOne');
c = c.replaceAll('Worker.findById', 'SpWorker.findById');

// Replace constants
c = c.replaceAll('BOOKING_STATUS.', 'SP_BOOKING_STATUS.');
c = c.replaceAll('PAYMENT_STATUS.', 'SP_PAYMENT_STATUS.');

// Replace inline requires with dynamic imports
c = c.replaceAll("const Vendor = require('../../models/Vendor');", "const SpVendor = (await import('../../models/SpVendor.js')).default;");
c = c.replaceAll("const BookingRequest = require('../../models/BookingRequest');", "const SpBookingRequest = (await import('../../models/SpBookingRequest.js')).default;");
c = c.replaceAll("const VendorBill = require('../../models/VendorBill');", "const SpVendorBill = (await import('../../models/SpVendorBill.js')).default;");
c = c.replaceAll("const Settings = require('../../models/Settings');", "const SpSettings = (await import('../../models/SpSettings.js')).default;");
c = c.replaceAll("const Transaction = require('../../models/Transaction');", "const SpTransaction = (await import('../../models/SpTransaction.js')).default;");

// Replace remaining require() calls used inline
c = c.replaceAll("require('../../models/Vendor')", "(await import('../../models/SpVendor.js')).default");
c = c.replaceAll("require('../../models/BookingRequest')", "(await import('../../models/SpBookingRequest.js')).default");
c = c.replaceAll("require('../../models/VendorBill')", "(await import('../../models/SpVendorBill.js')).default");
c = c.replaceAll("require('../../models/Settings')", "(await import('../../models/SpSettings.js')).default");
c = c.replaceAll("require('../../models/Transaction')", "(await import('../../models/SpTransaction.js')).default");
c = c.replaceAll("require('../../services/emailService')", "await import('../../services/emailService.js')");
c = c.replaceAll("require('../../services/firebaseAdmin')", "await import('../../services/firebaseAdmin.js')");

// Replace inline createNotification requires (duplicates in function bodies)
c = c.replaceAll("const { createNotification } = require('../notificationControllers/notificationController');", "");

// Replace Vendor. model calls with SpVendor.
c = c.replaceAll('Vendor.findById', 'SpVendor.findById');
c = c.replaceAll('Vendor.findByIdAndUpdate', 'SpVendor.findByIdAndUpdate');

// Replace VendorBill. with SpVendorBill.
c = c.replaceAll('VendorBill.findOne', 'SpVendorBill.findOne');
c = c.replaceAll('VendorBill.create', 'SpVendorBill.create');

// Replace BookingRequest. with SpBookingRequest.
c = c.replaceAll('BookingRequest.findOneAndUpdate', 'SpBookingRequest.findOneAndUpdate');
c = c.replaceAll('BookingRequest.updateMany', 'SpBookingRequest.updateMany');
c = c.replaceAll('BookingRequest.countDocuments', 'SpBookingRequest.countDocuments');
c = c.replaceAll('BookingRequest.find', 'SpBookingRequest.find');
c = c.replaceAll('BookingRequest.insertMany', 'SpBookingRequest.insertMany');

// Replace Transaction. with SpTransaction.
c = c.replaceAll('Transaction.create', 'SpTransaction.create');

// Replace Settings. with SpSettings.
c = c.replaceAll('Settings.findOne', 'SpSettings.findOne');

// Replace module.exports at the end
const exportBlock = `export {
  getVendorBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  assignWorker,
  updateBookingStatus,
  addVendorNotes,
  startSelfJob,
  vendorReachedLocation,
  verifySelfVisit,
  completeSelfJob,
  collectSelfCash,
  payWorker,
  getVendorRatings,
  getPendingBookings
};`;

c = c.replace(/module\.exports\s*=\s*\{[\s\S]*?\};[\s]*$/, exportBlock);

const dest = path.join(
  'd:\\dddddddd\\Noyo cart\\Noyo-kart\\backend\\app\\modules\\serviceProvider\\controllers\\bookingControllers',
  'vendorBookingController.js'
);

fs.writeFileSync(dest, c);
console.log('vendorBookingController.js converted and written successfully');
