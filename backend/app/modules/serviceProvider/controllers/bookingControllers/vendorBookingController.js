import mongoose from 'mongoose';
import SpBooking from '../../models/SpBooking.js';
import SpWorker from '../../models/SpWorker.js';
import { validationResult } from 'express-validator';
import { SP_BOOKING_STATUS, SP_PAYMENT_STATUS } from '../../constants.js';
import { createNotification } from '../notificationController.js';
import { sendNotificationToUser, sendNotificationToVendor, sendNotificationToWorker } from '../../services/firebaseAdmin.js';

/**
 * Get vendor bookings with filters
 */
const getVendorBookings = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { status, q, page = 1, limit = 20 } = req.query;

    let vendorCategories = req.user.categories || req.user.service || [];
    if (!vendorCategories.length) {
      const { default: SpVendor } = await import('../../models/SpVendor.js');
      const v = await SpVendor.findById(vendorId, 'service').lean();
      vendorCategories = v?.service || [];
    }

    const vId = new mongoose.Types.ObjectId(vendorId);

    const query = {
      $or: [
        { vendorId: vId, status: { $ne: SP_BOOKING_STATUS.AWAITING_PAYMENT } },
        {
          vendorId: null,
          status: { $in: [SP_BOOKING_STATUS.REQUESTED, SP_BOOKING_STATUS.SEARCHING] },
          serviceCategory: { $in: vendorCategories },
          'potentialVendors.vendorId': vId
        }
      ]
    };

    if (status && status !== 'all') {
      if (status === 'in_progress') {
        query.status = {
          $in: [
            SP_BOOKING_STATUS.ACCEPTED, SP_BOOKING_STATUS.ASSIGNED,
            SP_BOOKING_STATUS.CONFIRMED, SP_BOOKING_STATUS.JOURNEY_STARTED,
            SP_BOOKING_STATUS.VISITED, SP_BOOKING_STATUS.IN_PROGRESS,
            SP_BOOKING_STATUS.WORK_DONE, 'started', 'reached', 'on_the_way'
          ]
        };
      } else if (status === 'completed') {
        query.status = {
          $in: [SP_BOOKING_STATUS.COMPLETED, 'worker_paid', 'settlement_pending', 'paid', 'closed']
        };
      } else if (status === 'assigned') {
        query.status = { $in: [SP_BOOKING_STATUS.ASSIGNED, 'worker_accepted'] };
      } else {
        query.status = status;
      }
    }

    if (q) {
      query.$and = [{
        $or: [
          { serviceName: { $regex: q, $options: 'i' } },
          { bookingNumber: { $regex: q, $options: 'i' } }
        ]
      }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [result] = await SpBooking.aggregate([
      { $match: query },
      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
              $project: {
                _id: 1, bookingNumber: 1, status: 1, paymentMethod: 1,
                finalAmount: 1, scheduledDate: 1, scheduledTime: 1,
                serviceName: 1, serviceCategory: 1, categoryIcon: 1,
                createdAt: 1, 'address.addressLine1': 1, 'address.city': 1,
                userId: 1, workerId: 1, serviceId: 1, acceptedAt: 1,
                assignedAt: 1, brandName: 1, brandIcon: 1, expiresAt: 1
              }
            }
          ],
          total: [{ $count: 'n' }]
        }
      }
    ]);

    const bookings = result.data || [];
    const total = result.total?.[0]?.n || 0;

    await SpBooking.populate(bookings, [
      { path: 'userId', select: 'name phone', options: { lean: true } },
      { path: 'workerId', select: 'name', options: { lean: true } },
      {
        path: 'serviceId',
        select: 'title iconUrl categoryId',
        populate: { path: 'categoryId', select: 'title' },
        options: { lean: true }
      }
    ]);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Get vendor bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings. Please try again.' });
  }
};

/**
 * Get booking details by ID
 */
const getBookingById = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params;

    const booking = await SpBooking.findOne({
      _id: id,
      $or: [
        { vendorId },
        { vendorId: null, status: { $in: ['requested', 'searching'] } }
      ]
    })
      .populate('userId', 'name phone email profilePhoto')
      .populate('vendorId', 'name businessName phone email')
      .populate('serviceId', 'title description iconUrl images')
      .populate('categoryId', 'title slug')
      .populate('workerId', 'name phone rating totalJobs completedJobs');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch booking. Please try again.' });
  }
};

/**
 * Accept booking
 */
const acceptBooking = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params;
    const assignToSelf = Boolean(req.body?.assignToSelf || req.body?.selfAssign || req.query?.assignToSelf === 'true');

    const setFields = {
      vendorId: vendorId,
      acceptedAt: new Date(),
      status: SP_BOOKING_STATUS.CONFIRMED
    };

    // Accept (Myself): vendor claims job and self-assigns in one step — no worker scene
    if (assignToSelf) {
      setFields.status = SP_BOOKING_STATUS.ASSIGNED;
      setFields.assignedAt = new Date();
      setFields.isSelfJob = true;
      setFields.workerId = null;
      setFields.workerResponse = 'ACCEPTED';
      setFields.workerPaymentStatus = 'PAID';
      setFields.isWorkerPaid = true;
    }

    const updatedBooking = await SpBooking.findOneAndUpdate(
      {
        _id: id,
        status: { $in: [SP_BOOKING_STATUS.REQUESTED, SP_BOOKING_STATUS.SEARCHING] },
        vendorId: null
      },
      { $set: setFields },
      { new: true }
    );

    if (!updatedBooking) {
      const existing = await SpBooking.findById(id);
      if (existing && existing.vendorId) {
        return res.status(409).json({ success: false, message: 'Sorry, this job has already been accepted by another vendor.' });
      }
      return res.status(400).json({ success: false, message: 'Booking is no longer available.' });
    }

    const booking = updatedBooking;

    // Update vendor availability
    const { default: SpVendor } = await import('../../models/SpVendor.js');
    await SpVendor.findByIdAndUpdate(vendorId, { availability: 'ON_JOB' });

    // Update BookingRequest statuses
    const { default: SpBookingRequest } = await import('../../models/SpBookingRequest.js');
    await SpBookingRequest.findOneAndUpdate(
      { bookingId: id, vendorId },
      { status: 'ACCEPTED', respondedAt: new Date() }
    );
    await SpBookingRequest.updateMany(
      { bookingId: id, vendorId: { $ne: vendorId } },
      { status: 'EXPIRED', respondedAt: new Date() }
    );

    // NOTIFY OTHER VENDORS to remove this job
    const io = req.app.get('io');
    if (io && booking.notifiedVendors && booking.notifiedVendors.length > 0) {
      booking.notifiedVendors.forEach(otherVendorId => {
        if (otherVendorId.toString() !== vendorId.toString()) {
          const room = `vendor_${otherVendorId.toString()}`;
          io.to(room).emit('booking_taken', {
            bookingId: booking._id.toString(),
            message: 'This job has been accepted by someone else.'
          });
        }
      });
    }

    // Emit real-time updates to USER
    if (io) {
      const message = assignToSelf
        ? 'Vendor has accepted and will handle your booking personally.'
        : 'Vendor has accepted your request. Your booking is confirmed!';
      io.to(`user_${booking.userId}`).emit('booking_accepted', {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        vendor: { id: vendorId, name: req.user.name, businessName: req.user.businessName },
        isSelfJob: assignToSelf,
        message
      });
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id,
        status: booking.status,
        isSelfJob: assignToSelf,
        message: assignToSelf ? 'Professional assigned to your booking' : 'Vendor has accepted your request'
      });
    }

    // Send notification to user
    const notificationMessage = assignToSelf
      ? `Your booking ${booking.bookingNumber} is confirmed! ${req.user.businessName || req.user.name} will handle it personally.`
      : `Your booking ${booking.bookingNumber} is confirmed! ${req.user.businessName || req.user.name} will arrive at scheduled time.`;
    await createNotification({
      userId: booking.userId,
      type: assignToSelf ? 'worker_assigned' : 'booking_accepted',
      title: 'Booking Confirmed!',
      message: notificationMessage,
      relatedId: booking._id,
      relatedType: 'booking',
      pushData: {
        type: assignToSelf ? 'worker_assigned' : 'booking_accepted',
        bookingId: booking._id.toString(),
        link: `/user/booking/${booking._id}`
      }
    });

    res.status(200).json({
      success: true,
      message: assignToSelf
        ? 'Booking accepted and assigned to you'
        : 'Booking accepted successfully',
      data: booking,
      isSelfJob: assignToSelf
    });
  } catch (error) {
    console.error('Accept booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to accept booking. Please try again.' });
  }
};

/**
 * Reject booking
 */
const rejectBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const vendorId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await SpBooking.findOne({
      _id: id,
      $or: [
        { notifiedVendors: vendorId },
        { vendorId: null, status: { $in: [SP_BOOKING_STATUS.REQUESTED, SP_BOOKING_STATUS.SEARCHING] } }
      ]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found or not available for rejection' });
    }

    const validStatuses = [SP_BOOKING_STATUS.PENDING, SP_BOOKING_STATUS.REQUESTED, SP_BOOKING_STATUS.SEARCHING];
    if (!validStatuses.includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Cannot reject booking with status: ${booking.status}` });
    }

    // Update BookingRequest for this vendor
    const { default: SpBookingRequest } = await import('../../models/SpBookingRequest.js');
    await SpBookingRequest.findOneAndUpdate(
      { bookingId: id, vendorId },
      { status: 'REJECTED', respondedAt: new Date(), rejectReason: reason || 'Rejected by vendor' }
    );

    // Remove vendor from notifiedVendors
    booking.notifiedVendors = booking.notifiedVendors.filter(v => v.toString() !== vendorId.toString());
    booking.potentialVendors = booking.potentialVendors.filter(v => v.vendorId?.toString() !== vendorId.toString());

    // Check if ALL vendors have rejected
    const pendingRequests = await SpBookingRequest.countDocuments({
      bookingId: id,
      status: { $in: ['PENDING', 'VIEWED'] }
    });

    const remainingPotential = booking.potentialVendors.length;

    if (pendingRequests === 0 && remainingPotential === 0) {
      booking.status = SP_BOOKING_STATUS.REJECTED;
      booking.cancelledAt = new Date();
      booking.cancelledBy = 'system';
      booking.cancellationReason = 'No vendors available';

      await createNotification({
        userId: booking.userId,
        type: 'booking_rejected',
        title: 'No Vendors Available',
        message: `Sorry, no vendors are available for booking ${booking.bookingNumber}. Please try again later.`,
        relatedId: booking._id,
        relatedType: 'booking',
        pushData: { type: 'booking_rejected', bookingId: booking._id.toString(), link: `/user/booking/${booking._id}` }
      });
    }

    await booking.save();

    res.status(200).json({ success: true, message: 'Booking rejected successfully', data: { bookingId: id } });
  } catch (error) {
    console.error('Reject booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject booking. Please try again.' });
  }
};

/**
 * Assign worker to booking
 */
const assignWorker = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const vendorId = req.user.id;
    const { id } = req.params;
    const { workerId } = req.body;

    const booking = await SpBooking.findOne({ _id: id, vendorId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Handle "Assign to Self" — vendor does the job; skip worker flow entirely
    if (workerId === 'SELF' || workerId === 'self') {
      booking.workerId = null;
      booking.isSelfJob = true;
      booking.assignedAt = new Date();
      booking.workerResponse = 'ACCEPTED';
      booking.workerPaymentStatus = 'PAID';
      booking.isWorkerPaid = true;
      if ([
        SP_BOOKING_STATUS.CONFIRMED,
        SP_BOOKING_STATUS.ACCEPTED,
        SP_BOOKING_STATUS.PENDING,
        SP_BOOKING_STATUS.ASSIGNED
      ].includes(booking.status)) {
        booking.status = SP_BOOKING_STATUS.ASSIGNED;
      }
      await booking.save();

      await createNotification({
        userId: booking.userId,
        type: 'worker_assigned',
        title: 'Service Provider Assigned',
        message: `Vendor ${req.user.businessName || req.user.name} will handle your booking ${booking.bookingNumber} personally.`,
        relatedId: booking._id,
        relatedType: 'booking',
        pushData: { type: 'worker_assigned', bookingId: booking._id.toString(), link: `/user/booking/${booking._id}` }
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${booking.userId}`).emit('booking_updated', {
          bookingId: booking._id,
          status: booking.status,
          isSelfJob: true,
          message: 'Professional assigned to your booking'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Assigned to yourself successfully',
        data: booking,
        isSelfJob: true
      });
    }

    // Verify worker belongs to vendor
    const worker = await SpWorker.findOne({ _id: workerId, vendorId });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found or does not belong to your vendor account' });
    }

    const validStatuses = ['active', 'ONLINE', 'ACTIVE'];
    if (!validStatuses.includes(worker.status)) {
      return res.status(400).json({ success: false, message: `Worker is not active (Status: ${worker.status})` });
    }

    booking.workerId = workerId;
    booking.isSelfJob = false;
    booking.assignedAt = new Date();
    booking.status = SP_BOOKING_STATUS.ASSIGNED;
    booking.workerResponse = 'PENDING';
    booking.workerAcceptedAt = undefined;
    booking.workerPaymentStatus = 'PENDING';
    booking.isWorkerPaid = false;
    await booking.save();

    // Send notification to user
    await createNotification({
      userId: booking.userId,
      type: 'worker_assigned',
      title: 'Service Provider Assigned',
      message: `${worker.name} has been assigned to your booking. Check app for details.`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: { type: 'worker_assigned', bookingId: booking._id.toString(), link: `/user/booking/${booking._id}` }
    });

    // Send notification to worker
    await createNotification({
      workerId,
      type: 'booking_created',
      title: 'New Job Assigned',
      message: `You have been assigned to booking ${booking.bookingNumber}.`,
      relatedId: booking._id,
      relatedType: 'booking',
      pushData: { type: 'job_assigned', bookingId: booking._id.toString(), link: `/worker/job/${booking._id}` }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`worker_${workerId}`).emit('new_job_assigned', {
        bookingId: booking._id,
        serviceName: booking.serviceId?.title || booking.serviceName || 'Service',
        customerName: booking.userId?.name || 'Customer',
        customerPhone: booking.userId?.phone,
        address: booking.address,
        price: booking.finalAmount,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
      });
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id, status: booking.status, message: 'Professional assigned to your booking'
      });
    }

    res.status(200).json({ success: true, message: 'Worker assigned successfully', data: booking });
  } catch (error) {
    console.error('Assign worker error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign worker. Please try again.' });
  }
};

/**
 * Update booking status
 */
const updateBookingStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const vendorId = req.user.id;
    const { id } = req.params;
    const { status, workerPaymentStatus, finalSettlementStatus } = req.body;

    const booking = await SpBooking.findOne({ _id: id, vendorId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (status && status !== booking.status) {
      const validTransitions = {
        [SP_BOOKING_STATUS.PENDING]: [SP_BOOKING_STATUS.CONFIRMED, SP_BOOKING_STATUS.REJECTED, SP_BOOKING_STATUS.CANCELLED],
        [SP_BOOKING_STATUS.AWAITING_PAYMENT]: [SP_BOOKING_STATUS.CONFIRMED, SP_BOOKING_STATUS.CANCELLED, SP_BOOKING_STATUS.REJECTED],
        [SP_BOOKING_STATUS.CONFIRMED]: [SP_BOOKING_STATUS.ASSIGNED, SP_BOOKING_STATUS.IN_PROGRESS, SP_BOOKING_STATUS.CANCELLED],
        [SP_BOOKING_STATUS.ASSIGNED]: [SP_BOOKING_STATUS.VISITED, SP_BOOKING_STATUS.IN_PROGRESS, SP_BOOKING_STATUS.CANCELLED],
        [SP_BOOKING_STATUS.VISITED]: [SP_BOOKING_STATUS.WORK_DONE, SP_BOOKING_STATUS.IN_PROGRESS, SP_BOOKING_STATUS.CANCELLED],
        [SP_BOOKING_STATUS.IN_PROGRESS]: [SP_BOOKING_STATUS.WORK_DONE, SP_BOOKING_STATUS.COMPLETED, SP_BOOKING_STATUS.CANCELLED],
        [SP_BOOKING_STATUS.WORK_DONE]: [SP_BOOKING_STATUS.COMPLETED, SP_BOOKING_STATUS.CANCELLED]
      };

      if (!validTransitions[booking.status]?.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status transition from ${booking.status} to ${status}` });
      }

      booking.status = status;
      if (status === SP_BOOKING_STATUS.IN_PROGRESS && !booking.startedAt) booking.startedAt = new Date();
      if (status === SP_BOOKING_STATUS.COMPLETED) booking.completedAt = new Date();
    }

    if (workerPaymentStatus) {
      booking.workerPaymentStatus = workerPaymentStatus;
      if (workerPaymentStatus === 'PAID' || workerPaymentStatus === 'SUCCESS') {
        booking.isWorkerPaid = true;
        booking.workerPaidAt = booking.workerPaidAt || new Date();
      }
    }
    if (finalSettlementStatus) booking.finalSettlementStatus = finalSettlementStatus;

    await booking.save();

    // Send notification on completion
    if (status === SP_BOOKING_STATUS.COMPLETED) {
      await createNotification({
        userId: booking.userId,
        type: 'booking_completed',
        title: 'Booking Completed',
        message: `Your booking ${booking.bookingNumber} has been completed. Please rate your experience.`,
        relatedId: booking._id,
        relatedType: 'booking',
        pushData: { type: 'booking_completed', bookingId: booking._id.toString(), link: `/user/booking/${booking._id}` }
      });

      // Send completion emails
      try {
        const { sendBookingCompletionEmails } = await import('../../services/emailService.js');
        const fullBooking = await SpBooking.findById(booking._id)
          .populate('userId').populate('vendorId').populate('serviceId');
        sendBookingCompletionEmails(fullBooking).catch(err => console.error(err));
      } catch (emailErr) {
        console.error('Failed to send completion emails:', emailErr);
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id, status: booking.status, message: `Booking status updated to ${booking.status}`
      });
    }

    res.status(200).json({ success: true, message: 'Booking status updated successfully', data: booking });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update booking status. Please try again.' });
  }
};

/**
 * Add vendor notes to booking
 */
const addVendorNotes = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const vendorId = req.user.id;
    const { id } = req.params;
    const { notes } = req.body;

    const booking = await SpBooking.findOne({ _id: id, vendorId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.vendorNotes = notes;
    await booking.save();

    res.status(200).json({ success: true, message: 'Notes added successfully', data: booking });
  } catch (error) {
    console.error('Add vendor notes error:', error);
    res.status(500).json({ success: false, message: 'Failed to add notes. Please try again.' });
  }
};

/**
 * Start Self Job (Vendor performing job)
 */
const startSelfJob = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params;

    const booking = await SpBooking.findOne({ _id: id, vendorId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.workerId && !booking.isSelfJob) {
      return res.status(400).json({ success: false, message: 'Worker is assigned to this booking. You cannot start it yourself unless you unassign worker.' });
    }

    // Generate Visit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    booking.isSelfJob = true;
    booking.workerId = null;
    booking.status = SP_BOOKING_STATUS.JOURNEY_STARTED;
    booking.journeyStartedAt = new Date();
    booking.visitOtp = otp;
    if (!booking.assignedAt) booking.assignedAt = new Date();
    await booking.save();

    // Notify user
    await createNotification({
      userId: booking.userId,
      type: 'worker_started',
      title: 'Vendor Started Journey',
      message: `Vendor is on the way! OTP for verification: ${otp}.`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: { type: 'journey_started', bookingId: booking._id.toString(), visitOtp: otp, link: `/user/booking/${booking._id}` }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id, status: SP_BOOKING_STATUS.JOURNEY_STARTED, visitOtp: otp
      });
    }

    res.status(200).json({ success: true, message: 'Journey started, OTP sent', data: booking });
  } catch (error) {
    console.error('Start self job error:', error);
    res.status(500).json({ success: false, message: 'Failed to start job' });
  }
};

/**
 * Vendor Reached Location
 */
const vendorReachedLocation = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params;

    const booking = await SpBooking.findOne({ _id: id, vendorId }).select('+visitOtp');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== SP_BOOKING_STATUS.JOURNEY_STARTED) {
      return res.status(400).json({ success: false, message: 'Journey not started yet' });
    }

    const otp = booking.visitOtp;

    await createNotification({
      userId: booking.userId,
      type: 'vendor_reached',
      title: 'Vendor has Reached!',
      message: `Vendor has reached your location. Please share this OTP: ${otp}`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: { type: 'vendor_reached', bookingId: booking._id.toString(), visitOtp: otp, link: `/user/booking/${booking._id}` }
    });

    res.status(200).json({ success: true, message: 'User notified that vendor reached' });
  } catch (error) {
    console.error('Vendor reached location error:', error);
    res.status(500).json({ success: false, message: 'Failed to notify user' });
  }
};

/**
 * Verify Self Visit
 */
const verifySelfVisit = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params;
    const { otp, location } = req.body;

    const booking = await SpBooking.findOne({ _id: id, vendorId }).select('+visitOtp');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== SP_BOOKING_STATUS.JOURNEY_STARTED) return res.status(400).json({ success: false, message: 'Journey not started' });
    if (booking.visitOtp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });

    booking.status = SP_BOOKING_STATUS.VISITED;
    booking.visitedAt = new Date();
    booking.startedAt = new Date();
    booking.visitOtp = undefined;
    if (location) {
      booking.visitLocation = { ...location, verifiedAt: new Date() };
    }
    await booking.save();

    await createNotification({
      userId: booking.userId,
      type: 'visit_verified',
      title: 'Visit Verified',
      message: `The professional has arrived and verified the visit. Service is now in progress.`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: { type: 'visit_verified', bookingId: booking._id.toString(), link: `/user/booking/${booking._id}` }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id, status: SP_BOOKING_STATUS.VISITED, message: 'Visit verified successful'
      });
    }

    res.status(200).json({ success: true, message: 'Visit verified', data: booking });
  } catch (error) {
    console.error('Verify self visit error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify visit' });
  }
};

/**
 * Complete Self Job & Generate Bill
 */
const completeSelfJob = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params;
    const { workPhotos, workDoneDetails, billDetails } = req.body;

    const booking = await SpBooking.findOne({ _id: id, vendorId });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (booking.status !== SP_BOOKING_STATUS.VISITED && booking.status !== SP_BOOKING_STATUS.IN_PROGRESS) {
      return res.status(400).json({ success: false, message: 'Cannot complete from current status' });
    }

    // Prevent duplicate bills
    const { default: SpVendorBill } = await import('../../models/SpVendorBill.js');
    const existingBill = await SpVendorBill.findOne({ bookingId: booking._id });
    if (existingBill) {
      return res.status(400).json({ success: false, message: 'Bill already generated for this booking' });
    }

    // Fetch Settings
    const { default: SpSettings } = await import('../../models/SpSettings.js');
    const settings = await SpSettings.findOne({ type: 'global' });
    const serviceSplitPct = settings?.servicePayoutPercentage ?? 70;
    const partsSplitPct = settings?.partsPayoutPercentage ?? 10;
    const serviceGstPct = settings?.serviceGstPercentage ?? 18;
    const partsGstPct = settings?.partsGstPercentage ?? 18;

    // STEP 1: BUILD LINE ITEMS
    const originalBase = Number(booking.basePrice) || 0;
    const originalGST = parseFloat(((originalBase * serviceGstPct) / 100).toFixed(2));

    const billServices = (billDetails?.services || []).map(svc => {
      const price = Number(svc.price) || 0;
      const qty = Number(svc.quantity) || 1;
      const base = price * qty;
      const gst = parseFloat(((base * serviceGstPct) / 100).toFixed(2));
      return { catalogId: svc.catalogId || undefined, name: svc.name || 'Service', price, gstPercentage: serviceGstPct, quantity: qty, gstAmount: gst, total: parseFloat((base + gst).toFixed(2)), isOriginal: false };
    });

    const billParts = (billDetails?.parts || []).map(part => {
      const price = Number(part.price) || 0;
      const qty = Number(part.quantity) || 1;
      const pGstPct = (part.gstPercentage != null) ? Number(part.gstPercentage) : partsGstPct;
      const base = price * qty;
      const gst = parseFloat(((base * pGstPct) / 100).toFixed(2));
      return { catalogId: part.catalogId || undefined, name: part.name || 'Part', price, gstPercentage: pGstPct, quantity: qty, gstAmount: gst, total: parseFloat((base + gst).toFixed(2)) };
    });

    // STEP 2: CALCULATE BASE TOTALS
    const vendorServiceBase = billServices.reduce((s, sv) => s + (sv.price * sv.quantity), 0);
    const totalServiceBase = parseFloat((originalBase + vendorServiceBase).toFixed(2));
    const totalPartsBase = parseFloat(billParts.reduce((s, p) => s + (p.price * p.quantity), 0).toFixed(2));

    // STEP 3: CALCULATE GST TOTALS
    const vendorServiceGST = parseFloat(billServices.reduce((s, sv) => s + sv.gstAmount, 0).toFixed(2));
    const partsGST = parseFloat(billParts.reduce((s, p) => s + p.gstAmount, 0).toFixed(2));
    const totalGST = parseFloat((originalGST + vendorServiceGST + partsGST).toFixed(2));

    // STEP 4: FINAL BILL
    const visitingCharges = Number(booking.visitingCharges) || 0;
    const grandTotal = parseFloat((totalServiceBase + totalPartsBase + totalGST + visitingCharges).toFixed(2));

    // STEP 5: REVENUE SPLIT
    const vendorServiceEarning = parseFloat(((totalServiceBase * serviceSplitPct) / 100).toFixed(2));
    const vendorPartsEarning = parseFloat(((totalPartsBase * partsSplitPct) / 100).toFixed(2));
    const vendorTotalEarning = parseFloat((vendorServiceEarning + vendorPartsEarning).toFixed(2));
    const companyRevenue = parseFloat((grandTotal - vendorTotalEarning).toFixed(2));

    // STEP 6: PERSIST BILL
    const allServices = [
      { name: booking.serviceName || 'Original Service', price: originalBase, gstPercentage: serviceGstPct, quantity: 1, gstAmount: originalGST, total: parseFloat((originalBase + originalGST).toFixed(2)), isOriginal: true },
      ...billServices
    ];

    const bill = await SpVendorBill.create({
      bookingId: booking._id, vendorId,
      services: allServices, parts: billParts,
      originalServiceBase: originalBase, vendorServiceBase, totalServiceBase, totalPartsBase, visitingCharges,
      originalGST, vendorServiceGST, partsGST, totalGST, grandTotal,
      payoutConfig: { serviceSplitPercentage: serviceSplitPct, partsSplitPercentage: partsSplitPct, serviceGstPercentage: serviceGstPct, partsGstPercentage: partsGstPct },
      vendorServiceEarning, vendorPartsEarning, vendorTotalEarning, companyRevenue,
      status: 'generated', generatedAt: new Date()
    });

    // STEP 7: UPDATE BOOKING
    booking.status = SP_BOOKING_STATUS.WORK_DONE;
    booking.finalAmount = grandTotal;
    booking.userPayableAmount = grandTotal;
    booking.vendorBillId = bill._id;

    const payOtp = booking.paymentOtp || Math.floor(1000 + Math.random() * 9000).toString();
    booking.paymentOtp = payOtp;
    if (workPhotos) booking.workPhotos = workPhotos;

    booking.workDoneDetails = {
      ...(typeof workDoneDetails === 'object' ? workDoneDetails : {}),
      billId: bill._id.toString(),
      items: [
        ...allServices.map(s => ({ title: s.name, qty: s.quantity, price: s.total })),
        ...billParts.map(p => ({ title: p.name, qty: p.quantity, price: p.total }))
      ]
    };
    booking.markModified('workDoneDetails');
    await booking.save();

    // Notify user
    await createNotification({
      userId: booking.userId,
      type: 'work_completed',
      title: 'Work Completed',
      message: `Work finished! Your bill is being prepared.`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: { type: 'work_completed', bookingId: booking._id.toString(), link: `/user/booking/${booking._id}` }
    });

    await createNotification({
      userId: booking.userId,
      type: 'work_done',
      title: 'Billing Ready',
      message: `Bill Generated: ₹${grandTotal}. Your verification OTP is ${payOtp}. Please share this with the professional to complete.`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: { type: 'work_done', bookingId: booking._id.toString(), paymentOtp: payOtp, link: `/user/booking/${booking._id}` }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id, status: SP_BOOKING_STATUS.WORK_DONE, finalAmount: grandTotal
      });
    }

    res.status(200).json({
      success: true,
      message: 'Work done, bill generated',
      data: { booking, bill: { id: bill._id, grandTotal, totalGST, totalServiceBase, totalPartsBase } }
    });
  } catch (error) {
    console.error('Complete self job error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete job' });
  }
};

/**
 * Collect Self Cash
 */
const collectSelfCash = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params;
    const { otp } = req.body;

    const booking = await SpBooking.findOne({ _id: id, vendorId }).select('+paymentOtp');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== SP_BOOKING_STATUS.WORK_DONE) return res.status(400).json({ success: false, message: 'Work not done yet' });
    if (booking.paymentOtp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });

    const { default: SpVendorBill } = await import('../../models/SpVendorBill.js');
    const bill = await SpVendorBill.findOne({ bookingId: booking._id });
    if (!bill) return res.status(500).json({ success: false, message: 'Bill not found — cannot process payment' });

    const grandTotal = Number(bill.grandTotal) || 0;
    const vendorEarning = Number(bill.vendorTotalEarning) || 0;

    booking.status = SP_BOOKING_STATUS.COMPLETED;
    booking.paymentMethod = 'cash collected';
    booking.paymentStatus = SP_PAYMENT_STATUS.COLLECTED_BY_VENDOR;
    booking.cashCollected = true;
    booking.cashCollectedBy = 'vendor';
    booking.cashCollectorId = vendorId;
    booking.cashCollectedAt = new Date();
    booking.completedAt = new Date();
    booking.paymentOtp = undefined;
    await booking.save();

    bill.status = 'paid';
    bill.paidAt = new Date();
    await bill.save();

    // Update Vendor Wallet
    const { default: SpVendor } = await import('../../models/SpVendor.js');
    const vendorDoc = await SpVendor.findById(vendorId).select('wallet');

    if (vendorDoc) {
      const currentDues = (vendorDoc.wallet.dues || 0) + grandTotal;
      const cashLimit = vendorDoc.wallet.cashLimit || 10000;
      const netOwed = currentDues - ((vendorDoc.wallet.earnings || 0) + vendorEarning);
      const isBlocked = netOwed > cashLimit;

      const updateQuery = {
        $inc: { 'wallet.dues': grandTotal, 'wallet.earnings': vendorEarning, 'wallet.totalCashCollected': grandTotal }
      };

      if (isBlocked) {
        updateQuery.$set = {
          'wallet.isBlocked': true, 'wallet.blockedAt': new Date(),
          'wallet.blockReason': `Cash limit exceeded. Net owed: ₹${netOwed.toFixed(2)}, Limit: ₹${cashLimit}`
        };
      }

      await SpVendor.findByIdAndUpdate(vendorId, updateQuery);

      const { default: SpTransaction } = await import('../../models/SpTransaction.js');
      await SpTransaction.create({
        vendorId, bookingId: booking._id, type: 'cash_collected', amount: grandTotal, status: 'completed',
        paymentMethod: 'cash collected',
        description: `Cash ₹${grandTotal} collected for booking #${booking.bookingNumber}. Dues increased.`,
        metadata: { type: 'dues_increase', collectedBy: 'vendor', billId: bill._id.toString(), grandTotal, vendorEarning, companyRevenue: bill.companyRevenue }
      });

      if (vendorEarning > 0) {
        await SpTransaction.create({
          vendorId, bookingId: booking._id, type: 'earnings_credit', amount: vendorEarning, status: 'completed',
          paymentMethod: 'wallet',
          description: `Earnings ₹${vendorEarning} credited for booking #${booking.bookingNumber} (70% service + 10% parts)`,
          metadata: { type: 'earnings_increase', billId: bill._id.toString(), serviceEarning: bill.vendorServiceEarning, partsEarning: bill.vendorPartsEarning }
        });
      }
    }

    await createNotification({
      userId: booking.userId,
      type: 'payment_received',
      title: 'Payment Received (Cash)',
      message: `Payment of ₹${grandTotal} received in cash for booking ${booking.bookingNumber}. Job Completed. Thanks!`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high'
    });

    res.status(200).json({ success: true, message: 'Cash collected, job completed', data: booking });
  } catch (error) {
    console.error('Collect self cash error:', error);
    res.status(500).json({ success: false, message: 'Failed to process cash payment' });
  }
};

/**
 * Pay Worker (Manual Settlement)
 */
const payWorker = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params;

    const booking = await SpBooking.findOne({ _id: id, vendorId });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (!booking.workerId) return res.status(400).json({ success: false, message: 'No worker assigned to this booking' });
    if (booking.isWorkerPaid) return res.status(400).json({ success: false, message: 'Worker already paid' });

    booking.isWorkerPaid = true;
    booking.workerPaymentStatus = 'SUCCESS';
    booking.workerPaidAt = new Date();
    await booking.save();

    await createNotification({
      workerId: booking.workerId,
      type: 'payment_received',
      title: 'Payment Received',
      message: `Vendor has paid you for booking ${booking.bookingNumber}.`,
      relatedId: booking._id,
      relatedType: 'booking'
    });

    // Send High Priority Push Notification to Worker
    const worker = await SpWorker.findById(booking.workerId);
    if (worker) {
      const fcmTokens = [...(worker.fcmTokens || []), ...(worker.fcmTokenMobile || [])];
      if (fcmTokens.length > 0) {
        const { sendPushNotification } = await import('../../services/firebaseAdmin.js');
        await sendPushNotification(fcmTokens, {
          title: 'Payment Received! 💰',
          body: `Vendor has released your payment for booking #${booking.bookingNumber}. check wallet for details.`,
          data: { type: 'payment_received', bookingId: booking._id.toString(), url: '/worker/wallet' },
          highPriority: true
        });
      }
    }

    await createNotification({
      vendorId,
      type: 'payment_success',
      title: 'Worker Paid',
      message: `You have successfully marked worker payment for booking ${booking.bookingNumber}.`,
      relatedId: booking._id,
      relatedType: 'booking'
    });

    res.status(200).json({ success: true, message: 'Worker payment marked successfully', data: booking });
  } catch (error) {
    console.error('Pay worker error:', error);
    res.status(500).json({ success: false, message: 'Failed to process worker payment' });
  }
};

/**
 * Get vendor ratings and reviews
 */
const getVendorRatings = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await SpBooking.find({ vendorId, rating: { $ne: null } })
      .populate('userId', 'name profilePhoto')
      .populate('serviceId', 'title iconUrl')
      .populate('workerId', 'name profilePhoto')
      .sort({ reviewedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SpBooking.countDocuments({ vendorId, rating: { $ne: null } });

    const stats = await SpBooking.aggregate([
      { $match: { vendorId: new mongoose.Types.ObjectId(vendorId), rating: { $ne: null } } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          star5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          star4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          star3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          star2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          star1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: bookings,
      stats: stats[0] || { averageRating: 0, totalReviews: 0, star5: 0, star4: 0, star3: 0, star2: 0, star1: 0 },
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Get vendor ratings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ratings' });
  }
};

/**
 * Get pending booking requests for vendor (for reconnection)
 */
const getPendingBookings = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { default: SpBookingRequest } = await import('../../models/SpBookingRequest.js');

    const pendingRequests = await SpBookingRequest.find({
      vendorId,
      status: { $in: ['PENDING', 'VIEWED'] }
    })
      .populate({
        path: 'bookingId',
        match: { status: SP_BOOKING_STATUS.SEARCHING, vendorId: null },
        populate: [
          { path: 'userId', select: 'name phone' },
          { path: 'serviceId', select: 'title iconUrl categoryId', populate: { path: 'categoryId', select: 'title' } }
        ]
      })
      .sort({ sentAt: -1 })
      .limit(20);

    const validRequests = pendingRequests.filter(r => r.bookingId !== null);

    const bookings = validRequests.map(r => ({
      requestId: r._id,
      bookingId: r.bookingId._id,
      bookingNumber: r.bookingId.bookingNumber,
      serviceName: r.bookingId.serviceId?.title || r.bookingId.serviceName,
      customerName: r.bookingId.userId?.name,
      customerPhone: r.bookingId.userId?.phone,
      scheduledDate: r.bookingId.scheduledDate,
      scheduledTime: r.bookingId.scheduledTime,
      address: r.bookingId.address,
      price: r.bookingId.finalAmount,
      distance: r.distance,
      wave: r.wave,
      sentAt: r.sentAt,
      status: r.status,
      serviceCategory: r.bookingId.serviceCategory,
      brandName: r.bookingId.brandName,
      brandIcon: r.bookingId.brandIcon,
      categoryIcon: r.bookingId.categoryIcon,
      createdAt: r.bookingId.createdAt,
      expiresAt: r.bookingId.expiresAt
    }));

    res.status(200).json({ success: true, data: bookings, count: bookings.length });
  } catch (error) {
    console.error('Get pending bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending bookings' });
  }
};

export {
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
};
