# Cloudzy DNS-over-HTTPS Service

Welcome to Cloudzy's DNS-over-HTTPS (DoH) service at **dns.cloudzy.com**. This service helps protect your online privacy and security by encrypting your DNS queries.

## What is DNS-over-HTTPS?

DNS-over-HTTPS (DoH) encrypts your DNS lookups using HTTPS, the same secure protocol used for websites. Instead of sending DNS queries in plain text, DoH wraps them in encryption so your internet activity stays private.

## Why Use Cloudzy's DoH Service?

- **Privacy Protection**: Your DNS queries are encrypted, so your internet service provider and others can't see which websites you're visiting
- **Security**: Protects against DNS hijacking and tampering attacks
- **Bypass Restrictions**: Helps access websites that might be blocked by your network
- **Fast & Reliable**: Uses multiple trusted upstream DNS providers (Cloudflare, Google, Quad9) with automatic failover for better performance
- **CORS Enabled**: Browser-friendly with Cross-Origin Resource Sharing support
- **Input Validation**: Validates all requests to prevent malformed queries

## Service Endpoint

**DoH Endpoint:** `https://dns.cloudzy.com/dns-query`

Use this URL when configuring DoH in your applications or devices.

---

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

Android's system "Private DNS" setting uses **DNS-over-TLS (DoT)** (TLS on port 853). Cloudzy currently provides **DNS-over-HTTPS (DoH)** at `https://dns.cloudzy.com/dns-query`, which **will not** work if you set `dns.cloudzy.com` in Android's Private DNS.

Options for using Cloudzy on Android:

- **Per-app DoH (recommended):** Use a DoH-capable browser such as **Firefox for Android** and configure a custom DoH provider:
  1. Open Firefox Settings → Privacy → Use DNS over HTTPS
  2. Select **Custom** and enter: `https://dns.cloudzy.com/dns-query`

- **DoH apps / VPN-based apps:** Use apps which support DoH and can route DNS traffic through `https://dns.cloudzy.com/dns-query` for system-like behavior.

- **System-wide Private DNS (requires DoT):** To use Android's built-in Private DNS setting with the hostname `dns.cloudzy.com`, a **DoT server** (TLS on port 853) must be running and presenting a valid certificate for that hostname. This repository does **not** include a DoT server.

### For iOS Devices (iPhone/iPad)

iOS requires a configuration profile to enable DNS-over-HTTPS. Follow these steps:

**Option 1: Download a profile generator**
1. Visit a DNS profile generator like [dns.notjakob.com](https://dns.notjakob.com) or similar
2. Enter the DoH URL: `https://dns.cloudzy.com/dns-query`
3. Download the generated `.mobileconfig` file
4. Open the file on your iPhone/iPad
5. Go to Settings → General → VPN & Device Management
6. Tap on the downloaded profile and install it

**Option 2: Manual profile creation**

Save this as `cloudzy-doh.mobileconfig` and open it on your iOS device:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>DNSSettings</key>
            <dict>
                <key>DNSProtocol</key>
                <string>HTTPS</string>
                <key>ServerURL</key>
                <string>https://dns.cloudzy.com/dns-query</string>
            </dict>
            <key>PayloadDisplayName</key>
            <string>Cloudzy DNS over HTTPS</string>
            <key>PayloadIdentifier</key>
            <string>com.cloudzy.dns.doh</string>
            <key>PayloadType</key>
            <string>com.apple.dnsSettings.managed</string>
            <key>PayloadUUID</key>
            <string>A1B2C3D4-E5F6-7890-ABCD-EF1234567890</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>Cloudzy DoH</string>
    <key>PayloadIdentifier</key>
    <string>com.cloudzy.dns</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>12345678-90AB-CDEF-1234-567890ABCDEF</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>
```

After installing the profile:
1. Go to Settings → General → VPN & Device Management
2. Find and tap "Cloudzy DoH"
3. Tap "Install" and enter your passcode if prompted

---

## API Reference

### Supported Request Formats

Cloudzy's DNS-over-HTTPS service supports multiple request formats, compatible with major DoH clients and standards:

#### 1. Wire-format POST (RFC 8484)

- **Endpoint:** `POST /dns-query`
- **Content-Type:** `application/dns-message`
- **Body:** Raw DNS message (binary)
- **Max Size:** 4096 bytes
- **Response:** `application/dns-message` (binary)

**Example using curl:**
```sh
curl -X POST \
  -H "Content-Type: application/dns-message" \
  --data-binary @query.bin \
  "https://dns.cloudzy.com/dns-query"
```

Where `query.bin` is a binary DNS query (e.g., generated by `dig +dnssec +notcp @127.0.0.1 example.com A +bufsize=4096 +norecurse +noedns +short | xxd -r -p > query.bin`).

#### 2. Wire-format GET (RFC 8484)

- **Endpoint:** `GET /dns-query?dns=<base64url-encoded-dns-message>`
- **Query Parameter:** `dns` (base64url-encoded DNS message, no padding)
- **Accept:** `application/dns-message`
- **Response:** `application/dns-message` (binary)

**Example using curl:**
```sh
curl -H "Accept: application/dns-message" \
  "https://dns.cloudzy.com/dns-query?dns=BASE64URLENCODEDQUERY"
```

Where `BASE64URLENCODEDQUERY` is your DNS query encoded in base64url (no padding, `+` replaced by `-`, `/` replaced by `_`).

#### 3. JSON API GET

Supports multiple JSON API formats for compatibility:

**Cloudflare style:**
- **Endpoint:** `GET /dns-json?name=example.com&type=A`
- **Response:** `application/dns-json`

**Google style:**
- **Endpoint:** `GET /resolve?name=example.com&type=A`
- **Response:** `application/dns-json`

**Quad9 style:**
- **Endpoint:** `GET /dns-query?name=example.com&type=A&ct=application/dns-json`
- **Response:** `application/dns-json`

**Query Parameters:**
- `name` (required): Domain name to query
- `type` (optional): DNS record type (A, AAAA, MX, TXT, etc.) or numeric type (1-65535)
- Additional parameters are passed through to upstream providers

**Example using curl (Cloudflare style):**
```sh
curl "https://dns.cloudzy.com/dns-json?name=example.com&type=A"
```

**Example using curl (Google style):**
```sh
curl "https://dns.cloudzy.com/resolve?name=example.com&type=A"
```

**Example using curl (Quad9 style):**
```sh
curl "https://dns.cloudzy.com/dns-query?name=example.com&type=A&ct=application/dns-json"
```

All JSON endpoints return a response compatible with the [dns.google JSON format](https://developers.google.com/speed/public-dns/docs/dns-over-https#json).

#### 4. Health Check Endpoint

- **Endpoint:** `GET /health`
- **Response:** JSON with `{"ok": true, "ts": <timestamp>}`

**Example:**
```sh
curl "https://dns.cloudzy.com/health"
```

#### 5. Help/Documentation Endpoint

- **Endpoint:** `GET /` or `GET /help`
- **Response:** Plain text documentation

**Example:**
```sh
curl "https://dns.cloudzy.com/help"
```

### CORS Support

All endpoints support Cross-Origin Resource Sharing (CORS) for browser-based clients:

- **Access-Control-Allow-Origin:** `*` (all origins)
- **Access-Control-Allow-Methods:** `GET, POST, OPTIONS`
- **Access-Control-Allow-Headers:** `Content-Type, Accept`
- **Access-Control-Max-Age:** `86400` (24 hours)

OPTIONS preflight requests are automatically handled.

### Input Validation

The service validates all incoming requests:

- **DNS Parameter:** Must be valid base64url encoding (RFC 4648 Section 5)
- **Domain Names:** Must follow valid domain name format (RFC 1035)
- **Request Size:** Maximum 4096 bytes for POST requests
- **Empty Requests:** Rejected with appropriate error messages

### Error Responses

Error responses follow RFC 7807 (Problem Details for HTTP APIs) format:

```json
{
  "error": "Error Type",
  "message": "Descriptive error message",
  "code": 400
}
```

**HTTP Status Codes:**
- `400 Bad Request`: Invalid request format or missing parameters
- `413 Payload Too Large`: Request body exceeds 4096 bytes
- `404 Not Found`: Endpoint not found
- `500 Internal Server Error`: Server error or all upstreams failed

### Upstream Providers

The service uses multiple upstream DoH providers with automatic failover:

1. **Cloudflare** (`https://cloudflare-dns.com`)
2. **Cloudflare Alt** (`https://1.1.1.1`)
3. **Google** (`https://dns.google`)
4. **Quad9** (`https://dns.quad9.net`)

If one upstream fails, the service automatically tries the next one. If all upstreams fail, a 500 error is returned.

---

## Testing the Service

You can test our DoH service directly in your browser or with curl. Here are some examples:

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

---

## Developer Information

### For Developers

This DoH service is built as a Cloudflare Worker using TypeScript. The codebase is open source and available for review.

**Key Features:**
- RFC 8484 compliant wire format support
- Multiple JSON API format compatibility
- Automatic upstream failover
- Input validation and request size limits
- CORS support for browser clients
- Comprehensive error handling (RFC 7807)

**Technical Details:**
- Maximum request size: 4096 bytes
- Cache TTL: 60 seconds
- Supported methods: GET, POST, OPTIONS
- Response formats: `application/dns-message`, `application/dns-json`

**Environment Variables:**
- `UPSTREAM` (optional): Override default upstream providers with a custom DoH server URL

---

## Frequently Asked Questions

### What is DNS-over-HTTPS and why should I care?

DNS-over-HTTPS (DoH) is a technology that encrypts your DNS queries—the requests your device makes to find website addresses. Without DoH, these queries are sent in plain text, meaning anyone on your network (like your ISP, workplace, or a hacker on public WiFi) can see every website you try to visit.

By using DoH, your browsing becomes private. Your DNS queries are wrapped in the same encryption used for online banking and shopping, so no one can snoop on your internet activity.

### How can I protect my kids' privacy online, even from their school?

Schools often monitor student internet activity through DNS logging and content filters. While this can help with safety, it also means detailed records of your child's browsing exist on school servers.

At home, configure DoH on your family's devices to prevent your ISP from logging browsing activity. Teach your kids about the difference between school networks (monitored) and home networks (private with DoH). This helps them understand when their activity might be observed.

### What's the simplest way to secure my phone's internet in 5 minutes?

On Android: Go to Settings → Network & Internet → Advanced → Private DNS, select "Private DNS provider hostname," and enter `dns.cloudzy.com`. That's it—all DNS queries from your phone are now encrypted.

**Note:** Android's Private DNS uses DoT (DNS-over-TLS), not DoH. For DoH on Android, use Firefox or a DoH-capable app.

On iPhone: You'll need to install a configuration profile (see our iOS setup guide above). Once installed, go to Settings → General → VPN & Device Management and enable the Cloudzy DoH profile. Your iPhone will now use encrypted DNS.

### How do I set up encrypted DNS on all my devices?

For browsers like Firefox and Chrome, go to settings and enable "DNS over HTTPS" or "Secure DNS" with the URL `https://dns.cloudzy.com/dns-query`. For Android, use the Private DNS setting with `dns.cloudzy.com`. For iOS, you'll need to install a configuration profile.

Once configured, all DNS queries from that device or browser will be encrypted. You can verify it's working by visiting `https://dns.cloudzy.com/resolve?name=example.com&type=A` in your browser.

### What can WiFi network owners actually see about my browsing?

WiFi network owners can see: which devices connect, DNS queries (websites you visit), connection times, and how much data you transfer. If websites use HTTPS, they can't see the actual content—just that you visited that site.

With DoH enabled, network owners can only see that you're connecting to dns.cloudzy.com. They can't see which specific websites you're visiting because the DNS queries are encrypted. This significantly improves your privacy on any network.

### Is my hotel WiFi spying on me? How do I stay safe while traveling?

Hotel WiFi networks can absolutely monitor your browsing activity through DNS logs. Some hotels even inject ads or tracking into your browsing. Since you're on their network, they control the DNS servers your device uses by default.

Before connecting to hotel WiFi, make sure DoH is enabled on your devices. This encrypts your DNS queries so the hotel can't see which websites you visit. For extra security, also verify that websites you visit use HTTPS (look for the padlock icon).

### How do I hide my browsing on public WiFi at airports or coffee shops?

Public WiFi networks are notoriously insecure. The network operator—and potentially other users—can see your unencrypted DNS queries, revealing every website you visit. This is true even if the websites themselves use HTTPS.

Enable DoH on your device before connecting to public WiFi. Your DNS queries will be encrypted, so the coffee shop, airport, or hotel can't log which sites you're browsing. Combined with HTTPS websites, your browsing activity stays private.

### How does my ISP track every website I visit?

Every time you type a website address, your device asks a DNS server to translate that name into an IP address. By default, your Internet Service Provider (ISP) handles these requests and can log every single one. They know exactly which websites you visit, when, and how often.

ISPs can use this data to build profiles about you, sell your browsing history to advertisers, or even inject their own ads into your browsing. By switching to Cloudzy's encrypted DNS at dns.cloudzy.com, your ISP can no longer see or log your DNS queries.

### How do I stop my internet provider from selling my browsing data?

In many countries, ISPs are legally allowed to collect and sell your browsing history to advertisers. They do this primarily through DNS query logs, which reveal every website you visit. This data is valuable for targeted advertising.

Switching to Cloudzy's DoH service removes your ISP from the equation. Your DNS queries are encrypted and sent directly to dns.cloudzy.com, bypassing your ISP's DNS servers entirely. They can no longer log or sell your browsing activity.

### DNS-over-HTTPS vs VPN: Which one do I really need?

A VPN encrypts all your internet traffic and hides your IP address, while DoH only encrypts your DNS queries. VPNs are more comprehensive but can slow down your connection and often cost money. DoH is free, lightweight, and focuses specifically on DNS privacy.

For most users, DoH provides excellent privacy protection without the overhead of a VPN. If you need to hide your IP address or access region-locked content, use a VPN. If you just want to stop your ISP from tracking which websites you visit, DoH is the simpler solution.

### How can I keep my searches private at school or work?

Schools and workplaces often monitor network traffic, including DNS queries, to enforce acceptable use policies or track productivity. They can see every website you attempt to visit, even if you use private browsing mode.

By configuring DoH in your browser, your DNS queries are encrypted and sent to dns.cloudzy.com instead of the school or company DNS server. Network administrators will see encrypted traffic but won't know which specific websites you're visiting.

### Why does my school or office block certain websites?

Organizations use DNS filtering to block websites they consider inappropriate, distracting, or dangerous. When you try to visit a blocked site, the DNS server returns an error or redirects you to a block page. This is one of the simplest ways to enforce content policies.

Understanding how DNS blocking works helps you see why it's easily bypassed with DoH. When your DNS queries are encrypted and sent to an external server, the local network's DNS filters can't see or block your requests.

### How do I browse privately on library computers and public networks?

On shared or public computers, you often can't change system settings. However, you can configure DoH directly in your browser without admin access. In Firefox or Chrome, go to settings and enable secure DNS with `https://dns.cloudzy.com/dns-query`.

This encrypts your DNS queries even on public computers. Remember that the computer itself may have monitoring software, so for sensitive browsing, use your own device with DoH enabled.

### How does DoH help bypass internet censorship?

Many countries and networks block websites by filtering DNS queries. When you try to visit a blocked site, the DNS server returns no result or a fake address. Traditional DNS blocking is easy to implement because queries are unencrypted and visible.

DoH encrypts your queries so censors can't see which sites you're requesting. They only see encrypted HTTPS traffic to dns.cloudzy.com, making it much harder to block specific websites. This helps users access the open internet in restrictive environments.

### What are DNS hijacking attacks and how does DoH protect me?

DNS hijacking occurs when attackers intercept your DNS queries and return fake responses, redirecting you to malicious websites. This can happen through malware, compromised routers, or man-in-the-middle attacks on public WiFi. You might think you're visiting your bank's website, but you're actually on a phishing page.

DoH prevents this by encrypting your DNS queries end-to-end. Attackers can't see or modify your DNS traffic because it's protected by HTTPS encryption, the same security used for sensitive websites.

### How do I verify my mail server is properly configured?

Use our DoH service to check your email-related DNS records. Query your domain's MX records to see your mail servers, TXT records for SPF, and specific DKIM selector records. You can also check PTR records to ensure reverse DNS is set up correctly.

Proper email configuration prevents your messages from being marked as spam. If your PTR record doesn't match your sending domain, or if SPF/DKIM aren't configured, receiving servers may reject or flag your emails.

---

## Need Help?

If you have questions or need assistance setting up DoH, please contact our support team at <support@cloudzy.com>. We're here to help you enjoy a more private and secure internet experience!
