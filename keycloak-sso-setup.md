# Keycloak SSO Setup for Gitea Mirror

## 1. Access Keycloak Admin Console

1. Open http://localhost:8080
2. Login with:
   - Username: `admin`
   - Password: `admin`

## 2. Create a New Realm (Optional)

1. Click on the realm dropdown (top-left, probably says "master")
2. Click "Create Realm"
3. Name it: `gitea-mirror`
4. Click "Create"

## 3. Create a Client for Gitea Mirror

1. Go to "Clients" in the left menu
2. Click "Create client"
3. Fill in:
   - Client type: `OpenID Connect`
   - Client ID: `gitea-mirror`
   - Name: `Gitea Mirror Application`
4. Click "Next"
5. Enable:
   - Client authentication: `ON`
   - Authorization: `OFF`
   - Standard flow: `ON`
   - Direct access grants: `OFF`
6. Click "Next"
7. Set the following URLs:
   - Root URL: `http://localhost:4321`
   - Valid redirect URIs: `http://localhost:4321/api/auth/sso/callback/keycloak`
   - Valid post logout redirect URIs: `http://localhost:4321`
   - Web origins: `http://localhost:4321`
8. Click "Save"

## 4. Get Client Credentials

1. Go to the "Credentials" tab of your client
2. Copy the "Client secret"

## 5. Configure Keycloak SSO in Gitea Mirror

1. Go to your Gitea Mirror settings: http://localhost:4321/settings
2. Navigate to "Authentication" → "SSO Settings"
3. Click "Add SSO Provider"
4. Fill in:
   - **Provider ID**: `keycloak`
   - **Issuer URL**: `http://localhost:8080/realms/master` (or `http://localhost:8080/realms/gitea-mirror` if you created a new realm)
   - **Client ID**: `gitea-mirror`
   - **Client Secret**: (paste the secret from step 4)
   - **Email Domain**: Leave empty or set a specific domain to restrict access
   - **Scopes**: Select the scopes you want to test:
     - `openid` (required)
     - `profile`
     - `email`
     - `offline_access` (Keycloak supports this!)

## 6. Optional: Create Test Users in Keycloak

1. Go to "Users" in the left menu
2. Click "Add user"
3. Fill in:
   - Username: `testuser`
   - Email: `testuser@example.com`
   - Email verified: `ON`
4. Click "Create"
5. Go to "Credentials" tab
6. Click "Set password"
7. Set a password and turn off "Temporary"

## 7. Test SSO Login

1. Logout from Gitea Mirror if you're logged in
2. Go to the login page: http://localhost:4321/login
3. Click "Continue with SSO"
4. Enter the email address (e.g., `testuser@example.com`)
5. You'll be redirected to Keycloak
6. Login with your Keycloak user credentials
7. You should be redirected back to Gitea Mirror and logged in!

## Troubleshooting

- If you get SSL/TLS errors, make sure you're using the correct URLs (http for both Keycloak and Gitea Mirror)
- Check the browser console and network tab for any errors
- Keycloak logs: `docker logs gitea-mirror-keycloak`
- The `offline_access` scope should work with Keycloak (unlike Google)