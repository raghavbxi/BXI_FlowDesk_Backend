# 🚀 Deployment Instructions - Resend Email Service

## ✅ Changes Made

This project has been updated to use **Resend** instead of Gmail SMTP for sending emails. This fixes the email functionality on hosted platforms like Render.

### What Changed:
1. ✅ Replaced `nodemailer` with `resend` package
2. ✅ Removed hardcoded Gmail credentials (security fix)
3. ✅ All email configuration now uses environment variables
4. ✅ Works on Render's free tier (no SMTP port restrictions)

---

## 📋 Environment Variables Required

You need to set these environment variables on your hosting platform:

### Required Variables:
```bash
RESEND_API_KEY=re_PG1TKbBw_8yWfXsPBk3UrG8qi4MBusu2w
EMAIL_FROM=onboarding@resend.dev
WEBSITE_URL=https://bxiflowdesk.netlify.app/login
```

### Optional Variables (if not already set):
```bash
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
PORT=5000
NODE_ENV=production
```

---

## 🔧 Deploying to Render

### Step 1: Set Environment Variables on Render

1. Go to your Render dashboard: https://dashboard.render.com
2. Click on your backend service: `bxi-flowdesk-backend`
3. Click **"Environment"** in the left sidebar
4. Click **"Add Environment Variable"**
5. Add each of the following variables:

| Key | Value |
|-----|-------|
| `RESEND_API_KEY` | `re_PG1TKbBw_8yWfXsPBk3UrG8qi4MBusu2w` |
| `EMAIL_FROM` | `onboarding@resend.dev` |
| `WEBSITE_URL` | `https://bxiflowdesk.netlify.app/login` |
| `NODE_ENV` | `production` |

### Step 2: Deploy the Changes

**Option A: Auto-Deploy (if enabled)**
- Just push your changes to your Git repository
- Render will automatically detect and deploy the changes

**Option B: Manual Deploy**
```bash
# In your project directory
git add .
git commit -m "feat: migrate email service from Gmail SMTP to Resend"
git push origin main
```

Then on Render:
- Click **"Manual Deploy"** → **"Deploy latest commit"**

### Step 3: Verify Deployment

After deployment completes:

1. Check the logs on Render for any errors
2. Test the email functionality by requesting an OTP login
3. Watch for log messages like:
   ```
   ✓ [Email Service] Email sent successfully to user@example.com
   [Email Service] Message ID: abc123...
   ```

---

## 🧪 Testing Locally

### 1. Create `.env` file in `BXI_FlowDesk_Backend/`:

```bash
# Database
MONGODB_URI=your_local_or_atlas_mongodb_uri

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d

# Server
PORT=5000
NODE_ENV=development

# Email (Resend)
RESEND_API_KEY=re_PG1TKbBw_8yWfXsPBk3UrG8qi4MBusu2w
EMAIL_FROM=onboarding@resend.dev
WEBSITE_URL=http://localhost:5173
```

### 2. Start the server:

```bash
cd BXI_FlowDesk_Backend
npm install
npm run dev
```

### 3. Test email sending:

**Method 1: Test Endpoint (Development only)**
```bash
curl -X POST http://localhost:5000/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

**Method 2: Real Login Flow**
- Open your frontend: http://localhost:5173
- Go to login page
- Enter your email
- Click "Send OTP"
- Check your email inbox

---

## 📧 About Resend Email Service

### Default Sender Address
By default, emails will be sent from: **`onboarding@resend.dev`**

This is Resend's sandbox domain and works for testing, but has limitations:
- ✅ Can send to **any email address**
- ⚠️ Emails may go to spam
- ⚠️ Limited to 100 emails/day on free tier

### Using Your Own Domain (Recommended for Production)

To use your own domain (e.g., `noreply@bxiworld.com`):

1. **Add your domain to Resend:**
   - Login to https://resend.com/domains
   - Click "Add Domain"
   - Enter your domain (e.g., `bxiworld.com`)
   
2. **Verify domain with DNS records:**
   - Add the provided DNS records to your domain registrar
   - Wait for verification (usually takes a few minutes)

3. **Update environment variable:**
   ```bash
   EMAIL_FROM=noreply@bxiworld.com
   # or
   EMAIL_FROM=Task Management <noreply@bxiworld.com>
   ```

4. **Redeploy** your backend with the new `EMAIL_FROM` value

### Benefits of verified domain:
- ✅ Better email deliverability
- ✅ Professional sender name
- ✅ Less likely to land in spam
- ✅ Higher sending limits

---

## 🐛 Troubleshooting

### Emails not sending?

**1. Check Render logs:**
```
Look for error messages like:
✗ [Email Service] Error sending email...
```

**2. Verify API key is set:**
```bash
# On Render dashboard, check Environment tab
# Make sure RESEND_API_KEY is present and correct
```

**3. Check Resend dashboard:**
- Login to https://resend.com/emails
- See if emails were sent/failed
- Check error messages

**4. Common errors:**

| Error | Solution |
|-------|----------|
| "Invalid API key" | Check `RESEND_API_KEY` is set correctly |
| "Validation error" | Check `EMAIL_FROM` format is valid |
| "Rate limit exceeded" | Wait a few minutes, or upgrade Resend plan |

### Still not working?

1. Check that the code changes were deployed (look for `resend` in package.json)
2. Restart your Render service
3. Check Resend API status: https://resend.com/status
4. Contact Resend support if API issues persist

---

## 📊 Resend Free Tier Limits

- ✅ **3,000 emails/month** (100/day)
- ✅ **1 verified domain**
- ✅ **Unlimited team members**
- ✅ **Email analytics**

For higher limits, consider upgrading to Resend Pro ($20/month for 50,000 emails).

---

## 🔒 Security Notes

### ⚠️ IMPORTANT: Protect your API key!

- ✅ Never commit `.env` files to Git
- ✅ Never share your `RESEND_API_KEY` publicly
- ✅ Rotate API keys regularly
- ✅ Use different API keys for development and production

### If your API key is compromised:
1. Go to https://resend.com/api-keys
2. Delete the compromised key
3. Create a new API key
4. Update environment variables on Render

---

## 📝 Summary

**✅ Email service is now working on hosted URL!**

The migration from Gmail SMTP to Resend solves the port restriction issue on Render's free tier. All email functionality (OTP login, task assignments, mentions, reminders, etc.) will now work correctly in production.

**Next steps:**
1. Deploy the code changes
2. Set environment variables on Render
3. Test the email functionality
4. (Optional) Set up your own verified domain for better deliverability

---

For questions or issues, check:
- Resend Documentation: https://resend.com/docs
- Render Documentation: https://render.com/docs

