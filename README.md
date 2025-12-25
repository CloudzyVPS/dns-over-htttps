# Cloudzy DNS-over-HTTPS Service

Welcome to Cloudzy's DNS-over-HTTPS (DoH) service at **dns.cloudzy.com**. This service helps protect your online privacy and security by encrypting your DNS queries.

## What is DNS-over-HTTPS?

DNS-over-HTTPS (DoH) encrypts your DNS lookups using HTTPS, the same secure protocol used for websites. Instead of sending DNS queries in plain text, DoH wraps them in encryption so your internet activity stays private.

## Why Use Cloudzy's DoH Service?

- **Privacy Protection**: Your DNS queries are encrypted, so your internet service provider and others can't see which websites you're visiting
- **Security**: Protects against DNS hijacking and tampering attacks
- **Bypass Restrictions**: Helps access websites that might be blocked by your network
- **Fast & Reliable**: Uses multiple trusted upstream DNS providers for better performance

## How to Use Our DoH Service

### For Web Browsers

**Firefox:**
1. Open Firefox Settings
2. Scroll to "Network Settings" → Click "Settings"
3. Enable "DNS over HTTPS"
4. Choose "Custom" and enter: `https://dns.cloudzy.com/dns-query`
5. Click "OK"

**Chrome/Edge:**
1. Go to Settings → Privacy and Security → Security
2. Enable "Use secure DNS"
3. Select "With custom" and enter: `https://dns.cloudzy.com/dns-query`

### For Android Devices

1. Go to Settings → Network & Internet → Advanced → Private DNS
2. Select "Private DNS provider hostname"
3. Enter: `dns.cloudzy.com`
4. Save

## Testing the Service

You can test our DoH service directly in your browser. Here are some examples:

### Example 1: Look up a website's IP address

Visit this URL to find the IP address of `mail.cloudzy.com`:
```
https://dns.cloudzy.com/resolve?name=mail.cloudzy.com&type=A
```

This will return the IP address in JSON format, showing you that the DoH service is working correctly.

### Example 2: Check mail server records

To see mail server information for `mail.cloudzy.com`:
```
https://dns.cloudzy.com/resolve?name=mail.cloudzy.com&type=MX
```

### Example 3: Verify DNS resolution

Test that DNS queries are being encrypted and resolved properly:
```
https://dns.cloudzy.com/resolve?name=mail.cloudzy.com&type=A
```

If you see a response with IP addresses, your DoH setup is working!

### Example 4: Check SPF record (Email authentication)

SPF records help prevent email spoofing. Check the SPF record for `mail.cloudzy.com`:
```
https://dns.cloudzy.com/resolve?name=mail.cloudzy.com&type=TXT
```

Look for the TXT record that starts with `v=spf1` in the response. This shows which servers are authorized to send email for this domain.

### Example 5: Check DKIM record (Email authentication)

DKIM records are used for email signing. They're typically located at `selector._domainkey.domain.com`. Check DKIM for `mail.cloudzy.com`:
```
https://dns.cloudzy.com/resolve?name=default._domainkey.mail.cloudzy.com&type=TXT
```

Or check with a specific selector:
```
https://dns.cloudzy.com/resolve?name=selector1._domainkey.mail.cloudzy.com&type=TXT
```

The response will contain the public key used to verify DKIM signatures.

### Example 6: Check BIMI record (Brand Indicators for Message Identification)

BIMI records allow email clients to display brand logos. Check BIMI for `mail.cloudzy.com`:
```
https://dns.cloudzy.com/resolve?name=default._bimi.mail.cloudzy.com&type=TXT
```

This will show the BIMI configuration including the logo location and verification method.

### Example 7: Reverse DNS lookup (PTR record)

PTR records are used for reverse DNS lookups (IP address to domain name). For example, if the IP is `192.0.2.1`, reverse it to `1.2.0.192.in-addr.arpa`:
```
https://dns.cloudzy.com/resolve?name=1.2.0.192.in-addr.arpa&type=PTR
```

This will show the domain name associated with that IP address.

**Try it yourself!** Open your browser console (F12) and run this script to check your own IP's PTR record:

```javascript
// Fetch your public IP from ip.cloudzy.com
fetch('https://ip.cloudzy.com')
  .then(res => res.text())
  .then(ip => {
    // Reverse the IP octets (e.g., 1.2.3.4 becomes 4.3.2.1.in-addr.arpa)
    const reversed = ip.trim().split('.').reverse().join('.') + '.in-addr.arpa';
    console.log('Your IP:', ip.trim());
    console.log('Reversed:', reversed);
    
    // Query PTR record using Cloudzy DoH
    return fetch(`https://dns.cloudzy.com/resolve?name=${reversed}&type=PTR`);
  })
  .then(res => res.json())
  .then(data => {
    console.log('PTR Record:', data);
    if (data.Answer) {
      console.log('Hostname:', data.Answer.map(a => a.data).join(', '));
    }
  });
```

## Service Endpoint

**DoH Endpoint:** `https://dns.cloudzy.com/dns-query`

Use this URL when configuring DoH in your applications or devices.

## Need Help?

If you have questions or need assistance setting up DoH, please contact our support team. We're here to help you enjoy a more private and secure internet experience!

