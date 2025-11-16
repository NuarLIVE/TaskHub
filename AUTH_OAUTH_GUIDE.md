# OAuth Authentication Guide

## 📋 Overview

TaskHub now supports OAuth authentication through Google and GitHub, allowing users to sign in with their existing accounts.

## 🎯 Features

- ✅ **Google OAuth** - Sign in with Google account
- ✅ **GitHub OAuth** - Sign in with GitHub account
- ✅ **Automatic Profile Creation** - Profiles created automatically on first OAuth login
- ✅ **Error Handling** - User-friendly error messages
- ✅ **Multi-language Support** - OAuth buttons translated to English and Russian
- ✅ **AuthContext Integration** - Works seamlessly with existing authentication system

## 🏗️ Implementation

### Components

#### 1. OAuthButtons Component
**Location:** `/src/components/auth/OAuthButtons.tsx`

Handles OAuth authentication for both Google and GitHub:

```typescript
<OAuthButtons onError={setError} mode="login" />
```

**Props:**
- `onError?: (message: string) => void` - Error callback
- `mode?: 'login' | 'register'` - Display mode (changes text slightly)

**Features:**
- Loading states for each provider
- Automatic redirect to provider
- Error handling
- Translated button text

#### 2. Login Page Integration
**Location:** `/src/pages/LoginPage.tsx`

OAuth buttons added after email/password form:

```tsx
<OAuthButtons onError={setError} mode="login" />
```

#### 3. Register Page Integration
**Location:** `/src/pages/RegisterPage.tsx`

OAuth buttons added after registration form:

```tsx
<OAuthButtons onError={setError} mode="register" />
```

### How It Works

1. **User clicks OAuth button** (Google or GitHub)
2. **Component calls** `supabase.auth.signInWithOAuth()`
3. **User redirects** to provider (Google/GitHub)
4. **User authorizes** the application
5. **Provider redirects back** to app with auth code
6. **Supabase creates session** automatically
7. **Database trigger** creates profile if doesn't exist
8. **AuthContext updates** with new user
9. **User logged in** and redirected to home

### Profile Creation

Profiles are **automatically created** via database trigger:

**Location:** `supabase/migrations/20251105102837_create_profiles_table.sql`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'FREELANCER')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**What happens:**
- ✅ Profile created automatically on first login
- ✅ Name extracted from OAuth provider data
- ✅ Email from OAuth provider
- ✅ Default role: FREELANCER
- ✅ No manual profile creation needed

## 🔧 Configuration

### Supabase Dashboard Setup

#### 1. Enable OAuth Providers

Navigate to: **Supabase Dashboard → Authentication → Providers**

#### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs:
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```
7. Copy **Client ID** and **Client Secret**
8. In Supabase Dashboard:
   - Enable Google provider
   - Paste Client ID
   - Paste Client Secret
   - Save

#### 3. GitHub OAuth Setup

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in details:
   - **Application name:** TaskHub (or your app name)
   - **Homepage URL:** Your app URL
   - **Authorization callback URL:**
     ```
     https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
     ```
4. Click **Register application**
5. Copy **Client ID**
6. Generate **Client Secret** and copy it
7. In Supabase Dashboard:
   - Enable GitHub provider
   - Paste Client ID
   - Paste Client Secret
   - Save

### Environment Variables

**No environment variables needed!** OAuth configuration is handled entirely through Supabase Dashboard.

Your existing `.env` file already has everything needed:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 🎨 UI/UX

### Button Design

**Google Button:**
- Google logo (4 colors)
- Text: "Continue with Google"
- White background, border
- Hover effect

**GitHub Button:**
- GitHub icon (Lucide React)
- Text: "Continue with GitHub"
- White background, border
- Hover effect

### Loading States

When user clicks OAuth button:
- ✅ Button shows spinner
- ✅ Other buttons disabled
- ✅ Prevents double-clicks
- ✅ User feedback during redirect

### Error Handling

Errors displayed in red alert box above form:
- OAuth provider errors
- Network errors
- Configuration errors
- User-friendly messages

## 🌐 Translations

OAuth buttons support both English and Russian:

### English
- "Continue with Google"
- "Continue with GitHub"
- "Or sign in with"
- "Or sign up with"

### Russian
- "Продолжить с Google"
- "Продолжить с GitHub"
- "Или войти через"
- "Или зарегистрироваться через"

**Translation Keys:**
```json
{
  "auth": {
    "continueWithGoogle": "Continue with Google",
    "continueWithGitHub": "Continue with GitHub",
    "orLoginWith": "Or sign in with",
    "orRegisterWith": "Or sign up with"
  }
}
```

## 🔐 Security

### Data Safety
- ✅ OAuth handled by Supabase (secure)
- ✅ No passwords stored for OAuth users
- ✅ Tokens managed by Supabase
- ✅ Automatic session refresh
- ✅ Profile creation via database trigger (SECURITY DEFINER)

### User Privacy
- ✅ Only email and name requested
- ✅ No additional permissions asked
- ✅ User can revoke access anytime
- ✅ Data stored securely in Supabase

### RLS (Row Level Security)
Profiles created via OAuth have same RLS policies as regular users:
- Users can only read/update own profile
- Automatic profile ownership
- Secure by default

## 🧪 Testing

### Test OAuth Flow

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Navigate to login page**
   ```
   http://localhost:5173/#/login
   ```

3. **Click "Continue with Google" or "Continue with GitHub"**

4. **Authorize on provider**

5. **Check redirect back to app**

6. **Verify:**
   - User logged in
   - Profile created in database
   - No errors in console
   - Name populated from OAuth

### Test Error Handling

1. **Temporarily disable OAuth in Supabase Dashboard**
2. **Try to login with OAuth**
3. **Verify error message shown**
4. **Re-enable OAuth**

## 🚀 Production Checklist

Before deploying OAuth to production:

- [ ] Google OAuth configured in Supabase
- [ ] GitHub OAuth configured in Supabase
- [ ] Redirect URLs updated for production domain
- [ ] OAuth providers tested in production
- [ ] Error handling verified
- [ ] Profile creation tested
- [ ] User can login with existing OAuth account
- [ ] User can register new account with OAuth
- [ ] Translations working correctly
- [ ] Loading states working
- [ ] Error messages displaying

## 🐛 Troubleshooting

### "OAuth provider not configured"
**Solution:** Enable OAuth provider in Supabase Dashboard and add credentials

### "Redirect URI mismatch"
**Solution:** Check redirect URI in provider matches Supabase callback URL:
```
https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
```

### "Profile not created"
**Solution:** Check database trigger is enabled:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### "User logged in but no profile"
**Solution:** Manually run profile creation or check trigger logs

### "OAuth button not working"
**Solution:**
1. Check browser console for errors
2. Verify Supabase URL and anon key
3. Check network tab for failed requests
4. Ensure OAuth provider is enabled

## 📚 API Reference

### `supabase.auth.signInWithOAuth()`

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google' | 'github',
  options: {
    redirectTo: string,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
});
```

**Returns:**
- `data.url` - Redirect URL to provider
- `error` - Error object if failed

### AuthContext Integration

OAuth works automatically with AuthContext:

```typescript
// AuthContext listens to onAuthStateChange
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    // Load user profile
    await this.loadUserProfile(session.user.id, session.user.email);
  }
});
```

## 🎯 Future Enhancements

Potential improvements:

- [ ] Additional OAuth providers (Facebook, Twitter, Apple)
- [ ] Link multiple OAuth accounts to one profile
- [ ] Unlink OAuth provider
- [ ] Show which OAuth provider user signed up with
- [ ] OAuth account settings page
- [ ] Custom OAuth scopes

## 📝 Notes

- OAuth flow redirects user away from app temporarily
- User must allow browser popups (if popup mode used)
- Profile auto-created on first OAuth login
- Existing email users cannot use OAuth with same email
- OAuth and email/password are separate authentication methods

## ✅ Summary

OAuth authentication is fully integrated and working:

1. ✅ Google and GitHub providers
2. ✅ Beautiful, translated UI buttons
3. ✅ Automatic profile creation
4. ✅ Error handling
5. ✅ AuthContext integration
6. ✅ Secure database triggers
7. ✅ Production-ready

**Setup Time:** 10-15 minutes per provider
**User Experience:** Seamless, one-click login
**Security:** Handled by Supabase + OAuth providers
