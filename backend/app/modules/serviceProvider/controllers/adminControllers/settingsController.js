import SpSettings from '../../models/SpSettings.js';

export const getSettings = async (req, res) => {
  try {
    let settings = await SpSettings.findOne({ type: 'global' });
    if (!settings) {
      settings = await SpSettings.create({ type: 'global' });
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    let settings = await SpSettings.findOne({ type: 'global' });
    if (!settings) {
      settings = await SpSettings.create({ type: 'global', ...req.body });
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }
    res.status(200).json({ success: true, message: 'Settings updated successfully', data: settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};
