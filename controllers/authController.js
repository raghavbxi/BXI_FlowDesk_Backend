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

const verifyGoogleIdToken = async (idToken) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const err = new Error('GOOGLE_CLIENT_ID is not set');
    err.statusCode = 500;
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const resp = await fetch(url, { signal: controller.signal });
    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const err = new Error(data?.error_description || 'Invalid Google ID token');
      err.statusCode = 401;
      throw err;
    }

    // Validate audience matches our Google OAuth client ID
    if (data.aud !== clientId) {
      const err = new Error('Google token audience mismatch');
      err.statusCode = 401;
      throw err;
    }

    // Ensure email exists and is verified
    if (!data.email || data.email_verified !== 'true') {
      const err = new Error('Google account email is not verified');
      err.statusCode = 401;
      throw err;
    }

    return {
      email: String(data.email).toLowerCase().trim(),
      name: data.name ? String(data.name).trim() : undefined,
      avatar: data.picture ? String(data.picture).trim() : undefined,
      sub: data.sub ? String(data.sub) : undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name and email',
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email: email.toLowerCase() });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create user without password (OTP login only)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      // No password - will use OTP login
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

// @desc    Login/Signup user with Google OAuth (ID token)
// @route   POST /api/auth/oauth/google
// @access  Public
exports.googleOAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Please provide idToken',
      });
    }

    const profile = await verifyGoogleIdToken(idToken);

    let user = await User.findOne({ email: profile.email });

    if (!user) {
      user = await User.create({
        name: profile.name || profile.email.split('@')[0],
        email: profile.email,
        avatar: profile.avatar || '',
      });
    } else {
      // Keep user info fresh (but don’t overwrite intentionally-set fields)
      let shouldSave = false;
      if (!user.avatar && profile.avatar) {
        user.avatar = profile.avatar;
        shouldSave = true;
      }
      if (profile.name && user.name !== profile.name) {
        user.name = profile.name;
        shouldSave = true;
      }
      if (shouldSave) {
        await user.save();
      }
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
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
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: 'Error logging in with Google',
      error: error.message,
    });
  }
};

// @desc    Login user with OTP
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate email and OTP
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP',
      });
    }

    // Check for user
    const user = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpires');

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

    // Verify OTP
    if (!user.otp || user.otp !== otp) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(401).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Clear OTP after successful verification
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.status(200).json({
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

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[OTP Request] Looking for user with email: ${normalizedEmail}`);

    // Check for user
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      console.log(`[OTP Request] User not found: ${normalizedEmail}`);
      // Don't reveal if user exists for security
      return res.status(200).json({
        success: true,
        message: 'If the email exists, an OTP has been sent.',
      });
    }

    console.log(`[OTP Request] User found: ${user.name} (${user.email})`);

    // Check if user is active
    if (!user.isActive) {
      console.log(`[OTP Request] User account is deactivated: ${user.email}`);
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated',
      });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    console.log(`[OTP Request] Generated OTP for ${user.email}: ${otp}`);

    // Save OTP to user
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save({ validateBeforeSave: false });

    console.log(`[OTP Request] OTP saved to database for ${user.email}`);

    // Send response immediately to avoid timeout
    res.status(200).json({
      success: true,
      message: 'OTP has been sent to your email',
    });

    // Send OTP email asynchronously (fire and forget)
    // This prevents timeout issues on hosting platforms like Render
    console.log(`[OTP Request] Attempting to send email to ${user.email}...`);
    sendOTPEmail(user, otp)
      .then(() => {
        console.log(`✓ [OTP Email] Successfully sent to ${user.email}`);
      })
      .catch((error) => {
        console.error(`✗ [OTP Email] Failed to send to ${user.email}:`, error.message);
        console.error(`[OTP Email] Error code: ${error.code}`);
        console.error(`[OTP Email] Error response:`, error.response);
        // Log error but don't clear OTP - user can request a new one if needed
      });
  } catch (error) {
    console.error(`[OTP Request] Unexpected error:`, error);
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

