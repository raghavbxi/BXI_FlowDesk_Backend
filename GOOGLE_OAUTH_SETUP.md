# 🔐 Google OAuth Configuration

## ✅ Google Web Client ID

```
892328854200-s7s1pir1t1p3va3u75cgtdad9flh0ght.apps.googleusercontent.com
```

## 🚀 Deployment to Render

### Required Environment Variable:

```bash
GOOGLE_CLIENT_ID=892328854200-s7s1pir1t1p3va3u75cgtdad9flh0ght.apps.googleusercontent.com
```

### Steps:

1. Go to: https://dashboard.render.com
2. Select: `bxi-flowdesk-backend`
3. Click: Environment (left sidebar)
4. Add Environment Variable:
   - Key: `GOOGLE_CLIENT_ID`
   - Value: `892328854200-s7s1pir1t1p3va3u75cgtdad9flh0ght.apps.googleusercontent.com`
5. Click: Save Changes
6. Wait for auto-redeploy (2-3 minutes)

## ✅ Complete Environment Variables Checklist

Make sure ALL these are set on Render:

```bash
# Authentication
JWT_SECRET=7f9d8a6b5c4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a
GOOGLE_CLIENT_ID=892328854200-s7s1pir1t1p3va3u75cgtdad9flh0ght.apps.googleusercontent.com

# Email Service
RESEND_API_KEY=re_PG1TKbBw_8yWfXsPBk3UrG8qi4MBusu2w
EMAIL_FROM=onboarding@resend.dev
WEBSITE_URL=https://bxiflowdesk.netlify.app/login

# Database
MONGODB_URI=your_mongodb_connection_string

# Server
NODE_ENV=production
PORT=5000
```

## 🧪 Testing After Deployment

1. Go to: https://bxiflowdesk.netlify.app/login
2. Click: "Continue with Google"
3. Select your Google account
4. Should redirect to dashboard ✅

## 📝 Notes

- Firebase Authentication is enabled ✅
- Google Sign-In provider is enabled ✅
- Authorized domains configured ✅
- Backend route: `POST /api/auth/oauth/google`
- Frontend: Uses Firebase Auth + sends ID token to backend

