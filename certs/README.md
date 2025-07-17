# CA Certificates Configuration

This document explains how to configure custom Certificate Authority (CA) certificates for Gitea Mirror when connecting to self-signed or privately signed Gitea instances.

## Overview

When your Gitea instance uses a self-signed certificate or a certificate signed by a private Certificate Authority (CA), you need to configure Gitea Mirror to trust these certificates.

## Common SSL/TLS Errors

If you encounter any of these errors, you need to configure CA certificates:

- `UNABLE_TO_VERIFY_LEAF_SIGNATURE`
- `SELF_SIGNED_CERT_IN_CHAIN`
- `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`
- `CERT_UNTRUSTED`
- `unable to verify the first certificate`

## Configuration by Deployment Method

### Docker

#### Method 1: Volume Mount (Recommended)

1. Create a certificates directory:
   ```bash
   mkdir -p ./certs
   ```

2. Copy your CA certificate(s):
   ```bash
   cp /path/to/your-ca-cert.crt ./certs/
   ```

3. Update `docker-compose.yml`:
   ```yaml
   version: '3.8'
   services:
     gitea-mirror:
       image: raylabs/gitea-mirror:latest
       volumes:
         - ./data:/app/data
         - ./certs:/usr/local/share/ca-certificates:ro
       environment:
         - NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/your-ca-cert.crt
   ```

4. Restart the container:
   ```bash
   docker-compose down && docker-compose up -d
   ```

#### Method 2: Custom Docker Image

Create a `Dockerfile`:

```dockerfile
FROM raylabs/gitea-mirror:latest

# Copy CA certificates
COPY ./certs/*.crt /usr/local/share/ca-certificates/

# Update CA certificates
RUN update-ca-certificates

# Set environment variable
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/your-ca-cert.crt
```

Build and use:
```bash
docker build -t my-gitea-mirror .
```

### Native/Bun

#### Method 1: Environment Variable

```bash
export NODE_EXTRA_CA_CERTS=/path/to/your-ca-cert.crt
bun run start
```

#### Method 2: .env File

Add to your `.env` file:
```
NODE_EXTRA_CA_CERTS=/path/to/your-ca-cert.crt
```

#### Method 3: System CA Store

**Ubuntu/Debian:**
```bash
sudo cp your-ca-cert.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

**RHEL/CentOS/Fedora:**
```bash
sudo cp your-ca-cert.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust
```

**macOS:**
```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain your-ca-cert.crt
```

### LXC Container (Proxmox VE)

1. Enter the container:
   ```bash
   pct enter <container-id>
   ```

2. Create certificates directory:
   ```bash
   mkdir -p /usr/local/share/ca-certificates
   ```

3. Copy your CA certificate:
   ```bash
   cat > /usr/local/share/ca-certificates/your-ca.crt
   ```
   (Paste certificate content and press Ctrl+D)

4. Update the systemd service:
   ```bash
   cat >> /etc/systemd/system/gitea-mirror.service << EOF
   Environment="NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/your-ca.crt"
   EOF
   ```

5. Reload and restart:
   ```bash
   systemctl daemon-reload
   systemctl restart gitea-mirror
   ```

## Multiple CA Certificates

### Option 1: Bundle Certificates

```bash
cat ca-cert1.crt ca-cert2.crt ca-cert3.crt > ca-bundle.crt
export NODE_EXTRA_CA_CERTS=/path/to/ca-bundle.crt
```

### Option 2: System CA Store

```bash
# Copy all certificates
cp *.crt /usr/local/share/ca-certificates/
update-ca-certificates
```

## Verification

### 1. Test Gitea Connection
Use the "Test Connection" button in the Gitea configuration section.

### 2. Check Logs

**Docker:**
```bash
docker logs gitea-mirror
```

**Native:**
Check terminal output

**LXC:**
```bash
journalctl -u gitea-mirror -f
```

### 3. Manual Certificate Test

```bash
openssl s_client -connect your-gitea-domain.com:443 -CAfile /path/to/ca-cert.crt
```

## Best Practices

1. **Certificate Security**
   - Keep CA certificates secure
   - Use read-only mounts in Docker
   - Limit certificate file permissions
   - Regularly update certificates

2. **Certificate Management**
   - Use descriptive certificate filenames
   - Document certificate purposes
   - Track certificate expiration dates
   - Maintain certificate backups

3. **Production Deployment**
   - Use proper SSL certificates when possible
   - Consider Let's Encrypt for public instances
   - Implement certificate rotation procedures
   - Monitor certificate expiration

## Troubleshooting

### Certificate not being recognized
- Ensure the certificate is in PEM format
- Check that `NODE_EXTRA_CA_CERTS` points to the correct file
- Restart the application after adding certificates

### Still getting SSL errors
- Verify the complete certificate chain is included
- Check if intermediate certificates are needed
- Ensure the certificate matches the server hostname

### Certificate expired
- Check validity: `openssl x509 -in cert.crt -noout -dates`
- Update with new certificate from your CA
- Restart Gitea Mirror after updating

## Certificate Format

Certificates must be in PEM format. Example:

```
-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKl8bUgMdErlMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
[... certificate content ...]
-----END CERTIFICATE-----
```

If your certificate is in DER format, convert it:
```bash
openssl x509 -inform der -in certificate.cer -out certificate.crt
```