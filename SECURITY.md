# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in NoorPlus, please report it responsibly. We take all security concerns seriously and will work to fix issues quickly.

### How to Report

**Please do NOT publicly disclose the vulnerability** before it has been fixed. Instead:

1. **Email** us at: **security@noorplus.github.io**
   - Include a detailed description of the vulnerability
   - Provide steps to reproduce if applicable
   - Include the affected versions
   - Suggest fixes if you have any

2. **Or use GitHub Security Advisory**:
   - Go to [Security Advisories](https://github.com/noorplus/noorplus.github.io/security/advisories)
   - Click "Report a vulnerability"
   - Fill in the details privately

### What to Include

Please provide the following information to help us respond quickly:

- **Type of vulnerability** (e.g., XSS, CSRF, data exposure, etc.)
- **Affected component** (e.g., Quran module, prayer times, etc.)
- **Browser/device** affected
- **Detailed description** of the vulnerability
- **Proof of concept** or reproduction steps
- **Potential impact** (high, medium, low)
- **Suggested fix** (if you have one)
- **Your name/contact** for follow-up (we'll keep you credited if you wish)

## Response Timeline

We aim to:
1. **Acknowledge** your report within 48 hours
2. **Assess** the vulnerability within 3-5 days
3. **Develop a fix** and security patch
4. **Release the patch** as soon as practical
5. **Credit** you for the discovery (unless you prefer anonymity)

## Security Considerations

### What We Consider a Security Issue

- Cross-Site Scripting (XSS) vulnerabilities
- Cross-Site Request Forgery (CSRF) attacks
- Data exposure or unauthorized access
- Authentication bypass
- Injection attacks (SQL, Command, etc.)
- Sensitive data in logs or error messages
- Dependency vulnerabilities with actual exploitability

### What We Do NOT Consider a Security Issue

- Denial of Service (DoS) attacks on the client side (browser)
- Bugs that do not affect security
- Missing security features (suggest as feature requests instead)
- Vulnerabilities in dependencies without active exploitation
- Issues requiring unlikely user interaction
- Social engineering issues

## Security Best Practices

### For Users

1. **Keep Your Browser Updated** - Always use the latest browser version
2. **Enable Dark Mode** - Better for privacy in public spaces
3. **Clear Cache Regularly** - Remove stored data when needed
4. **Use HTTPS Only** - Access the app through https://noorplus.github.io
5. **Report Suspicious Activity** - Email security@noorplus.github.io

### For Developers

1. **Code Review** - All changes reviewed before merging
2. **Dependency Management** - Regular updates through Dependabot
3. **Input Validation** - Sanitize all user inputs
4. **Output Encoding** - Properly encode data before rendering
5. **CSP Headers** - Content Security Policy to prevent XSS

## Infrastructure Security

- **GitHub Pages Hosting** - HTTPS by default
- **No Backend Data** - App is entirely client-side (no server compromise risk)
- **Static Content** - No dynamic server-side code execution
- **Repository Protection** - Branch protection rules, required reviews
- **Access Control** - Limited admin access, team-based permissions

## Dependency Security

We use:
- **Dependabot** - Automated dependency updates and security alerts
- **GitHub Security Scanning** - CodeQL analysis on all commits
- **Manual Audits** - Regular reviews of dependencies

### Third-Party Libraries

Current dependencies are minimal:
- **Lucide Icons** - [Repository](https://github.com/lucide-icons/lucide)
- **Google Fonts (Inter)** - Loaded via CDN

## Known Limitations

### Current Version (1.0.0)

- No user authentication system
- No backend server (all processing is client-side)
- Geolocation data processed locally only
- LocalStorage used for theme preference only
- No personal data collection or storage

### Future Versions

As we add features like user accounts, we will:
- Implement proper authentication
- Use HTTPS for all communications
- Follow OWASP security guidelines
- Conduct security audits
- Implement data encryption

## Security Headers

We recommend your hosting service implement:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(self), microphone=()`

## Contact

- **Security Email**: security@noorplus.github.io
- **General Email**: contact@noorplus.github.io
- **GitHub Issues**: [Report publicly](https://github.com/noorplus/noorplus.github.io/issues)

## Acknowledgments

We appreciate the security researchers and community members who help keep NoorPlus safe and secure. Thank you for your responsible disclosure and commitment to making our app safer.

---

**Last Updated**: January 2026

**Version**: 1.0.0
