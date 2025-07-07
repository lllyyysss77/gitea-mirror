# Custom CA Certificate Support

This guide explains how to configure Gitea Mirror to work with self-signed certificates or custom Certificate Authorities (CAs).

> **📁 This is the certs directory!** Place your `.crt` certificate files directly in this directory and they will be automatically loaded when the Docker container starts.

## Overview

When connecting to a Gitea instance that uses self-signed certificates or certificates from a private CA, you need to configure the application to trust these certificates. Gitea Mirror supports mounting custom CA certificates that will be automatically configured for use.

## Configuration Steps

### 1. Prepare Your CA Certificates

You're already in the right place! Simply copy your CA certificate(s) into this `certs` directory with `.crt` extension:

```bash
# From the project root:
cp /path/to/your/ca-certificate.crt ./certs/

# Or if you're already in the certs directory:
cp /path/to/your/ca-certificate.crt .
```

You can add multiple CA certificates - they will all be combined into a single bundle.

### 2. Mount Certificates in Docker

Edit your `docker-compose.yml` file to mount the certificates. You have two options:

**Option 1: Mount individual certificates from certs directory**
```yaml
services:
  gitea-mirror:
    # ... other configuration ...
    volumes:
      - gitea-mirror-data:/app/data
      - ./certs:/app/certs:ro  # Mount CA certificates directory
```

**Option 2: Mount system CA bundle (if your CA is already installed system-wide)**
```yaml
services:
  gitea-mirror:
    # ... other configuration ...
    volumes:
      - gitea-mirror-data:/app/data
      - /etc/ssl/certs/ca-certificates.crt:/etc/ssl/certs/ca-certificates.crt:ro
```

> **Note**: Use Option 2 if you've already added your CA certificate to your system's certificate store using `update-ca-certificates` or similar commands.

> **System CA Bundle Locations**:
> - Debian/Ubuntu: `/etc/ssl/certs/ca-certificates.crt`
> - RHEL/CentOS/Fedora: `/etc/pki/tls/certs/ca-bundle.crt`
> - Alpine Linux: `/etc/ssl/certs/ca-certificates.crt`
> - macOS: `/etc/ssl/cert.pem`

### 3. Start the Container

Start or restart your container:

```bash
docker-compose up -d
```

The container will automatically:
1. Detect any `.crt` files in `/app/certs` (Option 1) OR detect mounted system CA bundle (Option 2)
2. For Option 1: Combine certificates into a CA bundle
3. Configure Node.js to use these certificates via `NODE_EXTRA_CA_CERTS`

You should see log messages like:

**For Option 1 (individual certificates):**
```
Custom CA certificates found, configuring Node.js to use them...
Adding certificate: my-ca.crt
NODE_EXTRA_CA_CERTS set to: /app/certs/ca-bundle.crt
```

**For Option 2 (system CA bundle):**
```
System CA bundle mounted, configuring Node.js to use it...
NODE_EXTRA_CA_CERTS set to: /etc/ssl/certs/ca-certificates.crt
```

## Testing & Troubleshooting

### Disable TLS Verification (Testing Only)

For testing purposes only, you can disable TLS verification entirely:

```yaml
environment:
  - GITEA_SKIP_TLS_VERIFY=true
```

**WARNING**: This is insecure and should never be used in production!

### Common Issues

1. **Certificate not recognized**: Ensure your certificate file has a `.crt` extension
2. **Connection still fails**: Check that the certificate is in PEM format
3. **Multiple certificates needed**: Add all required certificates (root and intermediate) to the certs directory

### Verifying Certificate Loading

Check the container logs to confirm certificates are loaded:

```bash
docker-compose logs gitea-mirror | grep "CA certificates"
```

## Security Considerations

- Always use proper CA certificates in production
- Never disable TLS verification in production environments
- Keep your CA certificates secure and limit access to the certs directory
- Regularly update certificates before they expire

## Example Setup

Here's a complete example for a self-hosted Gitea with custom CA:

1. Copy your Gitea server's CA certificate to this directory:
   ```bash
   cp /etc/ssl/certs/my-company-ca.crt ./certs/
   ```

2. Update `docker-compose.yml`:
   ```yaml
   services:
     gitea-mirror:
       image: ghcr.io/raylabshq/gitea-mirror:latest
       volumes:
         - gitea-mirror-data:/app/data
         - ./certs:/app/certs:ro
       environment:
         - GITEA_URL=https://gitea.mycompany.local
         - GITEA_TOKEN=your-token
         # ... other configuration ...
   ```

3. Start the service:
   ```bash
   docker-compose up -d
   ```

The application will now trust your custom CA when connecting to your Gitea instance.