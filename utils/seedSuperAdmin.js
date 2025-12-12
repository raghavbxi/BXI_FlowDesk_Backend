const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');
require('dotenv').config();

const seedSuperAdmin = async () => {
  try {
    await connectDB();

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'superadmin' });

    if (existingSuperAdmin) {
      console.log('Super admin already exists');
      process.exit(0);
    }

    // Create super admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@taskmanagement.com',
      password: 'SuperAdmin123!',
      role: 'superadmin',
    });

    console.log('Super admin created successfully:');
    console.log('Email:', superAdmin.email);
    console.log('Password: SuperAdmin123!');
    console.log('Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding super admin:', error);
    process.exit(1);
  }
};

seedSuperAdmin();

