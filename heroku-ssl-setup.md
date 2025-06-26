# Heroku SSL Setup Guide

## Method 1: Heroku SSL (Free with Custom Domains)

### Step 1: Add your custom domain to Heroku
```bash
heroku domains:add your-domain.com
heroku domains:add www.your-domain.com
```

### Step 2: Enable Automated Certificate Management (ACM)
```bash
heroku certs:auto:enable
```

### Step 3: Update your DNS settings
After running the commands above, Heroku will provide you with DNS targets. Update your domain's DNS records:

- Create a CNAME record for `www` pointing to the Heroku DNS target
- Create an ALIAS/ANAME record for the root domain pointing to the Heroku DNS target

### Step 4: Wait for SSL provisioning
```bash
heroku certs:auto
```

## Method 2: Manual SSL Certificate

### Step 1: Get SSL certificate from Let's Encrypt or your provider
```bash
# If using certbot for Let's Encrypt
certbot certonly --manual -d your-domain.com
```

### Step 2: Upload certificate to Heroku
```bash
heroku certs:add server.crt server.key
```

## Method 3: Cloudflare (Recommended for quick setup)

1. Sign up for Cloudflare (free plan available)
2. Add your domain to Cloudflare
3. Update your domain's nameservers to Cloudflare's
4. Enable "Full (strict)" SSL in Cloudflare dashboard
5. Set up DNS records pointing to your Heroku app

## Environment Variables

Add this environment variable to your Heroku app:
```bash
heroku config:set NODE_ENV=production
```

## Verify SSL is working

After setup, test your SSL:
```bash
curl -I https://your-domain.com
```

Look for:
- Status: 200 OK
- strict-transport-security header
- No certificate errors

## Troubleshooting

### Common issues:
1. **DNS not propagated**: Wait 24-48 hours for DNS changes
2. **Certificate not issued**: Ensure DNS is correct and domain is accessible
3. **Mixed content**: Ensure all resources load over HTTPS

### Check SSL status:
```bash
heroku certs
heroku certs:auto
```

### Force HTTPS redirect:
The server.js has been updated to automatically redirect HTTP to HTTPS in production. 