# Project Structure

Complete file structure and documentation of the NoorPlus repository:

```
noorplus.github.io/
│
├── 📄 index.html                    # Main application shell with enhanced SEO
├── 📄 manifest.json                 # PWA web app manifest
├── 📄 README.md                     # Project overview & getting started
├── 📄 CONTRIBUTING.md               # Contribution guidelines & code standards
├── 📄 CODE_OF_CONDUCT.md            # Community standards & conduct
├── 📄 SECURITY.md                   # Security policy & vulnerability reporting
├── 📄 CHANGELOG.md                  # Version history & release notes
├── 📄 LICENSE                       # MIT License
├── 📄 QUICK_START.md               # Quick reference for developers
├── 📄 .gitignore                    # Git ignore patterns
│
├── 📁 .github/                      # GitHub configuration
│   ├── 📁 ISSUE_TEMPLATE/           # Issue templates
│   │   ├── bug_report.md            # Bug report template
│   │   ├── feature_request.md       # Feature request template
│   │   ├── documentation.md         # Documentation issue template
│   │   └── security_report.md       # Security vulnerability template
│   ├── 📁 workflows/                # GitHub Actions workflows
│   │   ├── validate.yml             # Lint & validation workflow
│   │   ├── build.yml                # Build verification workflow
│   │   └── security.yml             # Security scanning workflow
│   ├── 📄 pull_request_template.md  # PR template with checklist
│   ├── 📄 dependabot.yml            # Dependabot configuration
│   ├── 📄 CODEOWNERS                # Auto-assign code reviewers
│   ├── 📄 repo-config.yml           # Repository configuration
│   └── 📄 GITHUB_SETUP.md           # Detailed GitHub automation guide
│
├── 📁 assets/                       # Static assets
│   ├── 📁 css/
│   │   └── style.css                # Complete styling & design system
│   └── 📁 js/
│       └── app.js                   # Core application logic
│
├── 📁 pages/                        # Dynamic page components
│   ├── home.html                    # Prayer times dashboard
│   ├── quran.html                   # Quran browsing interface
│   ├── community.html               # Community features
│   ├── library.html                 # Resource library
│   └── menu.html                    # Settings & menu
│
├── 📄 CODEOWNERS                    # GitHub CODEOWNERS (auto-reviewer assignment)
└── 📄 manifest.json                 # Web app manifest for PWA

```

## 📂 Directory Purpose & Details

### Root Level Files

| File | Purpose | Type |
|------|---------|------|
| `index.html` | Main HTML shell with enhanced SEO & meta tags | Application |
| `manifest.json` | PWA configuration for app installation | Configuration |
| `README.md` | Complete project documentation | Documentation |
| `CONTRIBUTING.md` | Contribution guidelines & code standards | Documentation |
| `CODE_OF_CONDUCT.md` | Community behavior standards | Documentation |
| `SECURITY.md` | Security policy & vulnerability reporting | Documentation |
| `CHANGELOG.md` | Version history & release notes | Documentation |
| `QUICK_START.md` | Quick reference for developers | Documentation |
| `LICENSE` | MIT open source license | License |
| `.gitignore` | Git ignore patterns | Configuration |

### `.github/` - GitHub Integration

#### `ISSUE_TEMPLATE/` - Issue Templates
- `bug_report.md` - Structured bug report format
- `feature_request.md` - Feature proposal template
- `documentation.md` - Documentation improvement template
- `security_report.md` - Security vulnerability reporting

#### `workflows/` - GitHub Actions Automation
- `validate.yml` - Lint, syntax, and file validation (runs on push/PR)
- `build.yml` - Build verification and deployment (runs on main)
- `security.yml` - Security scanning and vulnerability detection

#### GitHub Configuration Files
- `pull_request_template.md` - PR checklist and structure
- `dependabot.yml` - Automated dependency updates
- `CODEOWNERS` - Auto-assign reviewers
- `repo-config.yml` - Repository settings documentation
- `GITHUB_SETUP.md` - Detailed GitHub automation guide

### `assets/` - Static Resources

#### `css/`
- **style.css** (1,210 lines)
  - Design tokens (colors, spacing, typography)
  - Reset & base styles
  - Layout components
  - UI components
  - Page-specific styles
  - Animations & transitions
  - Dark mode support

#### `js/`
- **app.js** (636 lines)
  - Core utilities
  - Page routing
  - Theme management
  - Prayer timer functionality
  - Quran module
  - Event handling

### `pages/` - Dynamic Components

| Page | Purpose | Features |
|------|---------|----------|
| `home.html` | Prayer times dashboard | Location, prayer status, timing info |
| `quran.html` | Quran browsing | Search, tabs, surah list, ayah view |
| `community.html` | Community features | User connection, sharing |
| `library.html` | Resource library | Educational materials |
| `menu.html` | Settings & menu | Theme toggle, preferences |

## 📊 File Statistics

- **Total Documentation Files**: 9 (README, CONTRIBUTING, etc.)
- **GitHub Automation Files**: 8 (workflows, templates, configs)
- **Application Files**: 6 (HTML, CSS, JS)
- **Configuration Files**: 4 (manifest, gitignore, codeowners, etc.)

## 🔄 File Relationships

```
index.html
├── Loads → assets/css/style.css
├── Loads → assets/js/app.js
├── References → manifest.json
└── Contains → Enhanced meta tags (SEO, OG, PWA)

app.js
├── Loads → pages/home.html
├── Loads → pages/quran.html
├── Loads → pages/community.html
├── Loads → pages/library.html
└── Loads → pages/menu.html

GitHub Actions
├── validate.yml checks → All HTML, CSS, JS files
├── build.yml deploys → GitHub Pages
└── security.yml scans → All source files

Templates
├── Issue templates → .github/ISSUE_TEMPLATE/
├── PR template → .github/pull_request_template.md
└── Auto-load → When user creates issue/PR
```

## 📝 Documentation Map

**For Users:**
- `README.md` - What is NoorPlus?
- `manifest.json` - PWA configuration

**For Contributors:**
- `CONTRIBUTING.md` - How to contribute
- `CODE_OF_CONDUCT.md` - Community standards
- `.github/workflows/` - Automated checks

**For Maintainers:**
- `SECURITY.md` - Handling vulnerabilities
- `.github/CODEOWNERS` - Reviewer assignment
- `.github/dependabot.yml` - Dependency management
- `.github/GITHUB_SETUP.md` - Complete automation guide

**For Developers:**
- `QUICK_START.md` - Quick reference
- `assets/css/style.css` - Styling guide
- `assets/js/app.js` - Application logic

## 🚀 Deployment Flow

```
Developer
    ↓ git commit & push
GitHub Repository
    ↓ trigger workflows
GitHub Actions
├── validate.yml → Check syntax
├── security.yml → Scan security
└── build.yml → Build & test
    ↓ All checks pass
Merge to main
    ↓
GitHub Pages
    ↓
Live at noorplus.github.io/
```

## 🔐 Security Files

- `SECURITY.md` - Policy & best practices
- `.github/workflows/security.yml` - Automated scanning
- `.github/ISSUE_TEMPLATE/security_report.md` - Vulnerability template
- `.gitignore` - Prevent sensitive data commits

## 📦 Key Features by File

### Configuration Files
- `manifest.json` - PWA app shortcuts and installation
- `.gitignore` - Prevent committing sensitive files
- `.github/dependabot.yml` - Auto-update dependencies
- `CODEOWNERS` - Auto-assign reviewers

### Workflow Files
- `validate.yml` - Pre-commit validation
- `build.yml` - Build verification
- `security.yml` - Security scanning
- Templates - Standardized issues/PRs

### Documentation
- Multi-layered: README → CONTRIBUTING → CODE_OF_CONDUCT → SECURITY
- Issue templates guide users
- PR template ensures quality
- QUICK_START for developers

---

**Last Updated**: January 2026
**Version**: 1.0.0
