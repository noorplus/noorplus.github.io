# Contributing to NoorPlus

Thank you for your interest in contributing to NoorPlus! We welcome contributions from everyone in the community. This document provides guidelines and instructions for contributing.

## 🤝 Ways to Contribute

- **Report Bugs** - Help us identify and fix issues
- **Suggest Features** - Propose new features or improvements
- **Write Code** - Submit pull requests with bug fixes or features
- **Improve Documentation** - Fix typos, clarify instructions, add examples
- **Translate Content** - Help localize the app for different languages
- **Test** - Test features and report edge cases
- **Spread the Word** - Share NoorPlus with your community

## 🐛 Reporting Bugs

### Before Submitting a Bug Report
1. Check the [GitHub Issues](https://github.com/noorplus/noorplus.github.io/issues) to see if the bug already exists
2. Try to reproduce the issue with the latest version
3. Collect information about your environment (browser, OS, device)

### How to Submit a Bug Report
1. Go to [Issues](https://github.com/noorplus/noorplus.github.io/issues) and click "New Issue"
2. Select the "Bug Report" template
3. Fill in the template with:
   - **Clear description** of the bug
   - **Steps to reproduce** with specific examples
   - **Expected behavior** vs actual behavior
   - **Screenshots or videos** if applicable
   - **Device/Browser information**: OS, browser version
   - **Additional context** if relevant

### Example Bug Report
```
## Description
Prayer timer shows incorrect remaining time after 5 minutes

## Steps to Reproduce
1. Open the app on home page
2. Note the current time shown
3. Wait 5 minutes
4. Observe the timer

## Expected
Timer should show 5 minutes less remaining

## Actual
Timer shows same remaining time as before

## Environment
- Device: iPhone 12, iOS 15.2
- Browser: Safari
- App Version: 1.0.0
```

## 💡 Suggesting Features

### Before Suggesting a Feature
1. Check [GitHub Discussions](https://github.com/noorplus/noorplus.github.io/discussions) for similar ideas
2. Check the [Roadmap](#roadmap) to see if it's already planned

### How to Suggest a Feature
1. Go to [Issues](https://github.com/noorplus/noorplus.github.io/issues) and click "New Issue"
2. Select the "Feature Request" template
3. Describe:
   - **Clear title** of the feature
   - **Use case** - Why is this feature needed?
   - **Proposed solution** - How should it work?
   - **Alternatives** - Any other approaches?
   - **Additional context** - Any relevant information

### Example Feature Request
```
## Feature
Add Hadith of the Day to home page

## Use Case
Users want daily Islamic inspiration with authentic hadith

## Proposed Solution
Display random hadith on home dashboard with Arabic + English
Include source (Book & Hadith #) and rating system

## Additional Context
Integration with Sunnah.com API recommended
```

## 🔧 Setting Up for Development

### Prerequisites
- Git installed
- Code editor (VS Code recommended)
- Basic understanding of HTML, CSS, JavaScript
- Browser with DevTools

### Development Setup
```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR-USERNAME/noorplus.github.io.git
cd noorplus.github.io

# Create a development branch
git checkout -b feature/your-feature-name

# Start local server (Python 3)
python -m http.server 8000

# Open browser to http://localhost:8000
```

## 📝 Code Style Guide

### HTML
- Use semantic HTML5 tags (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`)
- Include `data-*` attributes for JavaScript hooks
- Maintain proper indentation (2 spaces)
- Always include `aria-label` on interactive elements

```html
<!-- Good -->
<button data-page="home" aria-label="Home Page">
  <i data-lucide="home"></i>
</button>

<!-- Avoid -->
<button onclick="loadPage('home')">
  <i class="icon-home"></i>
</button>
```

### CSS
- Use CSS custom properties (variables) defined in `:root`
- Follow mobile-first approach with media queries
- Organize sections with comments
- Use meaningful class names (BEM convention optional)

```css
/* Good */
:root {
  --primary-color: #2E7E9D;
  --spacing-sm: 8px;
}

.button {
  background-color: var(--primary-color);
  padding: var(--spacing-sm);
}

/* Avoid */
.btn { background: #2E7E9D; padding: 8px; }
```

### JavaScript
- Use ES6+ syntax (arrow functions, const/let, template literals)
- Add comments for complex logic
- Keep functions small and focused
- Use descriptive variable names
- Handle errors gracefully

```javascript
// Good
function formatTo12Hour(time24) {
  if (!time24) return "--:--";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

// Avoid
function format(t) {
  return t ? t.split(":").map(x => x % 12) : "--:--";
}
```

## 📤 Submitting Changes

### Step 1: Create a Feature Branch
```bash
git checkout -b feature/add-hadith-feature
# or for bug fixes
git checkout -b fix/prayer-timer-bug
```

### Step 2: Make Your Changes
- Make focused, logical commits
- Write meaningful commit messages
- Reference related issues: `Fixes #123` or `Related to #456`

### Step 3: Test Your Changes
- Test in multiple browsers (Chrome, Firefox, Safari, Edge)
- Test on mobile devices (or use DevTools device emulation)
- Verify responsive design
- Check dark mode works correctly
- Verify no console errors

### Step 4: Commit & Push
```bash
# Stage changes
git add .

# Commit with meaningful message
git commit -m "feat: add hadith of the day to home page

- Fetch random hadith from API
- Display with translations
- Add refresh button"

# Push to your fork
git push origin feature/add-hadith-feature
```

### Step 5: Create a Pull Request
1. Go to your fork on GitHub
2. Click "Compare & pull request"
3. Select the "Pull Request" template
4. Fill in:
   - **Title**: Brief description
   - **Description**: What changed and why
   - **Fixes**: Reference related issues (`Fixes #123`)
   - **Testing**: How you tested changes
   - **Screenshots**: If UI changes

### Pull Request Template Example
```
## Description
Adds Hadith of the Day feature to dashboard

## Changes
- New API integration with Sunnah API
- Display random hadith with translation
- Refresh button to get new hadith
- Cache hadith in localStorage for offline

## Fixes
Fixes #89

## Testing
- Tested on Chrome, Firefox, Safari
- Works on iPhone & Android
- Dark mode verified
- No console errors

## Checklist
- [x] Code follows style guide
- [x] No new warnings generated
- [x] Tested on mobile
- [x] Updated documentation
```

## 📋 Commit Message Convention

Use conventional commits for clarity:

```
type(scope): subject

body

footer
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Examples**:
```
feat(quran): add search by keyword feature
fix(prayer-timer): correct calculation for sunrise
docs: update installation instructions
style: update color palette for dark mode
```

## ✅ Pull Request Checklist

Before submitting your PR, ensure:

- [ ] Changes follow the code style guide
- [ ] You've tested locally
- [ ] No console errors or warnings
- [ ] Mobile responsive design verified
- [ ] Dark mode works correctly
- [ ] Documentation is updated if needed
- [ ] Commit messages are clear
- [ ] No unrelated changes included
- [ ] Branch is up to date with main

## 🔍 Code Review Process

1. **Automated Checks** - GitHub Actions run tests and linting
2. **Review** - Maintainers review for code quality and design
3. **Feedback** - We may request changes or improvements
4. **Approval** - Once approved, maintainers merge the PR
5. **Deployment** - Changes automatically deploy to GitHub Pages

## 🎯 Development Priorities

When contributing, please prioritize:

1. **Critical Bugs** - Issues affecting core functionality
2. **Security Issues** - Any security vulnerabilities
3. **Documentation** - Improving guides and examples
4. **Quality of Life** - UI/UX improvements
5. **New Features** - Features from the roadmap

## 📚 Resources

- [Mozilla MDN Web Docs](https://developer.mozilla.org/)
- [Lucide Icons Documentation](https://lucide.dev/)
- [JavaScript Modern Features](https://javascript.info/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)

## 🚀 Roadmap

Features we're working on or planning:
- Prayer reminders and notifications
- Hadith of the day
- Islamic calendar integration
- Qibla finder
- Tafsir integration
- Audio recitations
- User profiles
- Offline mode
- Multi-language support

## ❓ Questions?

- Join us on [GitHub Discussions](https://github.com/noorplus/noorplus.github.io/discussions)
- Check [GitHub Issues](https://github.com/noorplus/noorplus.github.io/issues) for common questions
- Email: contact@noorplus.github.io

## 📄 License

By contributing to NoorPlus, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to NoorPlus! Your efforts help make Islamic technology accessible to everyone. 🙏**
