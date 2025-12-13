# ⚡ Quick Setup Guide - Resend Email Service

## 🎯 Problem Solved
Email was working on **localhost** but not on **hosted URL** (Render.com) because:
- Render blocks SMTP ports (25, 465, 587) on free tier
- Solution: Use Resend API instead of SMTP

---

## 🚀 Quick Deploy to Render

### 1️⃣ Set Environment Variables on Render

Go to: https://dashboard.render.com → Your Service → Environment

Add these variables:

```bash
RESEND_API_KEY=re_your_resend_api_key_here
EMAIL_FROM=onboarding@resend.dev
WEBSITE_URL=https://bxiflowdesk.netlify.app/login
NODE_ENV=production
```

### 2️⃣ Deploy Code

```bash
git add .
git commit -m "fix: migrate to Resend for email service"
git push origin main
```

Render will auto-deploy.

### 3️⃣ Test

1. Go to: https://bxiflowdesk.netlify.app/login
2. Enter your email
3. Click "Send OTP"
4. Check your email inbox ✅

---

## 📋 Files Changed

- ✅ `utils/emailService.js` - Refactored to use Resend
- ✅ `controllers/testController.js` - Updated error handling
- ✅ `env.example` - Added new environment variables
- ✅ `package.json` - Already has `resend` dependency

---

## 🧪 Local Development

Create `.env` file:

```bash
RESEND_API_KEY=re_your_resend_api_key_here
EMAIL_FROM=onboarding@resend.dev
WEBSITE_URL=http://localhost:5173
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
NODE_ENV=development
```

Run:
```bash
npm run dev
```

---

## 📧 Email Templates Supported

All these email types now work with Resend:

- ✅ OTP Login emails
- ✅ Task assignment notifications
- ✅ @mention notifications
- ✅ Help request emails
- ✅ Daily task reminders
- ✅ Overdue task alerts

---

## ⚠️ Important Notes

1. **Free tier limit**: 100 emails/day (3,000/month)
2. **Default sender**: `onboarding@resend.dev`
3. **For production**: Set up your own verified domain
4. **Security**: Never commit `.env` files

---

## 🔗 Useful Links

- Resend Dashboard: https://resend.com/emails
- Resend Docs: https://resend.com/docs
- Full deployment guide: See `DEPLOYMENT.md`

---

**That's it! Your emails should now work on the hosted URL.** 🎉

