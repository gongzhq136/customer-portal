# Admin Role Setup

This application supports automatic admin role assignment based on email addresses defined in environment variables.

## Setup

### 1. Environment Variable

Add the following environment variable to your `.env` file:

```env
ADMIN_EMAILS="admin@example.com,superuser@example.com"
```

- Use comma-separated email addresses
- Case-insensitive matching
- Emails are trimmed of whitespace

### 2. How It Works

The system automatically assigns the admin role to users with whitelisted email addresses in two scenarios:

1. **New User Registration**: When a user with a whitelisted email signs up, they are automatically assigned the admin role
2. **Existing User Sign-in**: When an existing user with a whitelisted email signs in, their role is updated to admin if it wasn't already

### 3. Admin Permissions

Users with the admin role have access to:
- All questionnaire permissions (create, read, update, delete, list, share, view-responses)
- All questionnaire-response permissions (create, read, update, delete, list, generate-sample-responses)
- Default admin permissions from Better Auth

### 4. Testing

To test the admin functionality:

1. Add your email to `ADMIN_EMAILS` in your `.env` file
2. Sign up or sign in with that email
3. Check that your user role is set to "admin" in the database
4. Verify admin permissions are available in the application

### 5. Database

The admin role is stored in the `role` field of the `users` table as a string value "admin".
