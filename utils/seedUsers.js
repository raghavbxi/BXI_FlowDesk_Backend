const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');
require('dotenv').config();

const users = [
  { name: 'Raghvendra', email: 'rsingh@bxiworld.com' },
  { name: 'prathmesh', email: 'pkokkula@bxiworld.com' },
  { name: 'anmol', email: 'arajput@bxiworld.com' },
  { name: 'shubham', email: 'shubham@bxiworld.com' },
  { name: 'samiksha', email: 'sjain@bxiworld.com' },
  { name: 'jitesh', email: 'jiteshs@bxiworld.com' },
];

const seedUsers = async () => {
  try {
    await connectDB();

    console.log('Seeding users...');

    for (const userData of users) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email.toLowerCase() });

      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Create user without password
      const user = await User.create({
        name: userData.name,
        email: userData.email.toLowerCase(),
        // No password - will use OTP login
      });

      console.log(`✓ Created user: ${user.name} (${user.email})`);
    }

    console.log('\nAll users seeded successfully!');
    console.log('Users can now login using OTP sent to their email.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers();


