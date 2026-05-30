import SpUserService from '../../models/SpUserService.js';
import { validationResult } from 'express-validator';
import { SP_SERVICE_STATUS } from '../../constants.js';

/**
 * Get vendor's services
 */
const getVendorServices = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get services
    const services = await SpUserService.find({
      ...query,
      status: SP_SERVICE_STATUS.ACTIVE
    })
      .populate('categoryId', 'title slug')
      .populate('categoryIds', 'title slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SpUserService.countDocuments({
      ...query,
      status: SP_SERVICE_STATUS.ACTIVE
    });

    res.status(200).json({
      success: true,
      data: services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get vendor services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services. Please try again.'
    });
  }
};

/**
 * Update service availability (enable/disable)
 */
const updateServiceAvailability = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const vendorId = req.user.id;
    const { serviceId } = req.params;
    const { isAvailable } = req.body;

    const service = await SpUserService.findById(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Update availability (using status field)
    if (isAvailable) {
      service.status = SP_SERVICE_STATUS.ACTIVE;
    } else {
      service.status = SP_SERVICE_STATUS.INACTIVE;
    }

    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service availability updated successfully',
      data: service
    });
  } catch (error) {
    console.error('Update service availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service availability. Please try again.'
    });
  }
};

/**
 * Set service pricing (vendor-specific pricing)
 */
const setServicePricing = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const vendorId = req.user.id;
    const { serviceId } = req.params;
    const { basePrice, discountPrice } = req.body;

    const service = await SpUserService.findById(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Update pricing
    if (basePrice !== undefined) {
      service.basePrice = basePrice;
    }
    if (discountPrice !== undefined) {
      service.discountPrice = discountPrice;
    }

    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service pricing updated successfully',
      data: service
    });
  } catch (error) {
    console.error('Set service pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service pricing. Please try again.'
    });
  }
};

export {
  getVendorServices,
  updateServiceAvailability,
  setServicePricing
};
