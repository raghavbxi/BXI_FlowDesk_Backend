const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendOTPEmail } = require('../utils/emailService');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message,
    });
  }
};

// @desc    Login user (with password or OTP)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email',
      });
    }

    // Check for user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated',
      });
    }

    // If OTP is provided, verify OTP
    if (otp) {
      const userWithOTP = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpires');
      
      if (!userWithOTP.otp || userWithOTP.otp !== otp) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired OTP',
        });
      }

      if (userWithOTP.otpExpires < Date.now()) {
        return res.status(401).json({
          success: false,
          message: 'OTP has expired. Please request a new one.',
        });
      }

      // Clear OTP after successful verification
      userWithOTP.otp = undefined;
      userWithOTP.otpExpires = undefined;
      await userWithOTP.save();

      const token = generateToken(userWithOTP._id);

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: userWithOTP._id,
          name: userWithOTP.name,
          email: userWithOTP.email,
          role: userWithOTP.role,
          avatar: userWithOTP.avatar,
        },
      });
    }

    // If password is provided, verify password (for users with passwords)
    if (password) {
      const userWithPassword = await User.findOne({ email: email.toLowerCase() }).select('+password');
      
      if (!userWithPassword.password) {
        return res.status(400).json({
          success: false,
          message: 'This account uses OTP login. Please request an OTP.',
        });
      }

      const isMatch = await userWithPassword.matchPassword(password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const token = generateToken(user._id);

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
      });
    }

    // Neither password nor OTP provided
    return res.status(400).json({
      success: false,
      message: 'Please provide either password or OTP',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message,
    });
  }
};

// @desc    Send login OTP
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email',
      });
    }

    // Check for user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists for security
      return res.status(200).json({
        success: true,
        message: 'If the email exists, an OTP has been sent.',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated',
      });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save OTP to user
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save({ validateBeforeSave: false });

    // Send OTP email
    try {
      await sendOTPEmail(user, otp);
    } catch (error) {
      // Clear OTP if email fails
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Error sending OTP email',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP has been sent to your email',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending OTP',
      error: error.message,
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message,
    });
  }
};

