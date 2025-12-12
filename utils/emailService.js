const nodemailer = require('nodemailer');
const User = require('../models/User');

// Website URL constant
const WEBSITE_URL = 'https://bxiflowdesk.netlify.app/login';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'otp@bxiworld.com',
      pass: 'ammpkmvamvlslkrg',
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000, // 10 seconds
    socketTimeout: 10000, // 10 seconds
  });
};

// Send email with timeout
const sendEmail = async (options) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Task Management System" <otp@bxiworld.com>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  // Add timeout to prevent hanging (20 seconds max)
  const emailPromise = transporter.sendMail(mailOptions);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Email sending timeout')), 20000);
  });

  try {
    await Promise.race([emailPromise, timeoutPromise]);
    console.log(`Email sent to ${options.email}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Task assignment email
exports.sendTaskAssignmentEmail = async (userIds, task) => {
  try {
    const users = await User.find({ _id: { $in: userIds } });
    const creator = await User.findById(task.createdBy);

    for (const user of users) {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2980B9;">New Task Assignment</h2>
          <p>Hello ${user.name},</p>
          <p>You have been assigned to a new task:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${task.title}</h3>
            <p><strong>Description:</strong> ${task.description || 'No description'}</p>
            <p><strong>Start Date:</strong> ${new Date(task.startDate).toLocaleDateString()}</p>
            <p><strong>End Date:</strong> ${new Date(task.endDate).toLocaleDateString()}</p>
            <p><strong>Assigned by:</strong> ${creator.name}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${WEBSITE_URL}" style="background-color: #0071e3; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 500;">Log In to View Task</a>
          </div>
          <p style="text-align: center; color: #86868b; font-size: 14px;">
            Or copy and paste this link: <a href="${WEBSITE_URL}" style="color: #0071e3;">${WEBSITE_URL}</a>
          </p>
        </div>
      `;

      await sendEmail({
        email: user.email,
        subject: `New Task Assignment: ${task.title}`,
        html,
      });
    }
  } catch (error) {
    console.error('Error sending task assignment email:', error);
  }
};

// Mention notification email
exports.sendMentionEmail = async (mentionedUserIds, task, commenter, commentText) => {
  try {
    const users = await User.find({ _id: { $in: mentionedUserIds } });

    for (const user of users) {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2980B9;">You were mentioned in a comment</h2>
          <p>Hello ${user.name},</p>
          <p><strong>${commenter.name}</strong> mentioned you in a comment on task: <strong>${task.title}</strong></p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;">"${commentText}"</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${WEBSITE_URL}" style="background-color: #0071e3; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 500;">Log In to View Conversation</a>
          </div>
          <p style="text-align: center; color: #86868b; font-size: 14px;">
            Or copy and paste this link: <a href="${WEBSITE_URL}" style="color: #0071e3;">${WEBSITE_URL}</a>
          </p>
        </div>
      `;

      await sendEmail({
        email: user.email,
        subject: `You were mentioned: ${task.title}`,
        html,
      });
    }
  } catch (error) {
    console.error('Error sending mention email:', error);
  }
};

// Help request email
exports.sendHelpRequestEmail = async (task, requester) => {
  try {
    const creator = await User.findById(task.createdBy);
    const assignedUsers = await User.find({ _id: { $in: task.assignedUsers } });

    const recipients = [creator, ...assignedUsers].filter(
      (user) => user._id.toString() !== requester._id.toString()
    );

    for (const user of recipients) {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #D76D77;">Help Request</h2>
          <p>Hello ${user.name},</p>
          <p><strong>${requester.name}</strong> has requested help with the following task:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${task.title}</h3>
            <p><strong>Description:</strong> ${task.description || 'No description'}</p>
            <p><strong>Current Progress:</strong> ${task.manualProgress}%</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${WEBSITE_URL}" style="background-color: #0071e3; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 500;">Log In to Provide Assistance</a>
          </div>
          <p style="text-align: center; color: #86868b; font-size: 14px;">
            Or copy and paste this link: <a href="${WEBSITE_URL}" style="color: #0071e3;">${WEBSITE_URL}</a>
          </p>
        </div>
      `;

      await sendEmail({
        email: user.email,
        subject: `Help Request: ${task.title}`,
        html,
      });
    }
  } catch (error) {
    console.error('Error sending help request email:', error);
  }
};

// Daily reminder for due tasks
exports.sendDailyReminder = async (user, tasks) => {
  try {
    if (tasks.length === 0) return;

    const tasksHtml = tasks
      .map(
        (task) => `
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 10px 0;">
        <h4 style="margin-top: 0;">${task.title}</h4>
        <p><strong>Due Date:</strong> ${new Date(task.endDate).toLocaleDateString()}</p>
        <p><strong>Progress:</strong> ${task.manualProgress}%</p>
      </div>
    `
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2980B9;">Daily Task Reminder</h2>
        <p>Hello ${user.name},</p>
        <p>You have <strong>${tasks.length}</strong> task(s) due soon:</p>
        ${tasksHtml}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${WEBSITE_URL}" style="background-color: #0071e3; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 500;">Log In to View Tasks</a>
        </div>
        <p style="text-align: center; color: #86868b; font-size: 14px;">
          Or copy and paste this link: <a href="${WEBSITE_URL}" style="color: #0071e3;">${WEBSITE_URL}</a>
        </p>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: 'Daily Task Reminder',
      html,
    });
  } catch (error) {
    console.error('Error sending daily reminder:', error);
  }
};

// Overdue alert email
exports.sendOverdueAlert = async (user, tasks) => {
  try {
    if (tasks.length === 0) return;

    const tasksHtml = tasks
      .map(
        (task) => `
      <div style="background: #ffebee; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #f44336;">
        <h4 style="margin-top: 0; color: #c62828;">${task.title}</h4>
        <p><strong>Due Date:</strong> ${new Date(task.endDate).toLocaleDateString()}</p>
        <p><strong>Days Overdue:</strong> ${Math.ceil((Date.now() - new Date(task.endDate)) / (1000 * 60 * 60 * 24))}</p>
        <p><strong>Progress:</strong> ${task.manualProgress}%</p>
      </div>
    `
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c62828;">⚠️ Overdue Tasks Alert</h2>
        <p>Hello ${user.name},</p>
        <p>You have <strong>${tasks.length}</strong> overdue task(s):</p>
        ${tasksHtml}
        <p style="color: #c62828; font-weight: bold;">Please take immediate action on these tasks.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${WEBSITE_URL}" style="background-color: #ff3b30; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 500;">Log In to View Tasks</a>
        </div>
        <p style="text-align: center; color: #86868b; font-size: 14px;">
          Or copy and paste this link: <a href="${WEBSITE_URL}" style="color: #0071e3;">${WEBSITE_URL}</a>
        </p>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: '⚠️ Overdue Tasks Alert',
      html,
    });
  } catch (error) {
    console.error('Error sending overdue alert:', error);
  }
};

// Send OTP email for login
exports.sendOTPEmail = async (user, otp) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0071e3;">Login OTP</h2>
        <p>Hello ${user.name},</p>
        <p>You requested to login to your account. Use the following OTP to complete your login:</p>
        <div style="background: #f5f5f7; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h1 style="color: #0071e3; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
        </div>
        <p style="color: #86868b; font-size: 14px;">This OTP will expire in 10 minutes.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${WEBSITE_URL}" style="background-color: #0071e3; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 500;">Log In to Your Account</a>
        </div>
        <p style="text-align: center; color: #86868b; font-size: 14px;">
          Or copy and paste this link: <a href="${WEBSITE_URL}" style="color: #0071e3;">${WEBSITE_URL}</a>
        </p>
        <p style="color: #86868b; font-size: 14px; margin-top: 20px;">If you didn't request this OTP, please ignore this email.</p>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: 'Your Login OTP - Task Management System',
      html,
    });
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

