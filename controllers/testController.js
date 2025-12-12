const { sendOTPEmail } = require('../utils/emailService');
const User = require('../models/User');

// @desc    Test email sending
// @route   POST /api/test/send-email
// @access  Public (for testing only - remove in production)
exports.testEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    // Try to find user or create a test user object
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Create a temporary user object for testing
      user = {
        name: 'Test User',
        email: email.toLowerCase(),
      };
    }

    const testOTP = '123456';
    
    console.log(`[Test Email] Attempting to send test email to ${user.email}...`);
    
    await sendOTPEmail(user, testOTP);
    
    res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${user.email}`,
    });
  } catch (error) {
    console.error('[Test Email] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test email',
      error: error.message,
      details: {
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        response: error.response,
      },
    });
  }
};

