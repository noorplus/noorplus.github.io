# GitHub Setup Guide for NoorPlus

This guide explains the GitHub automation and infrastructure set up for NoorPlus.

## 📋 Table of Contents

1. [Repository Settings](#repository-settings)
2. [Branch Protection](#branch-protection)
3. [GitHub Actions](#github-actions)
4. [GitHub Issues & Discussions](#github-issues--discussions)
5. [Pull Request Process](#pull-request-process)
6. [Security & Dependencies](#security--dependencies)
7. [Deployment](#deployment)

## Repository Settings

### Basic Configuration
- **Repository Type**: Public
- **Default Branch**: `main`
- **Enforce Admins**: ✅ Yes
- **Dismiss Stale Reviews**: ✅ Yes
- **Allow Force Pushes**: ❌ No
- **Allow Deletions**: ❌ No

### Features Enabled
- ✅ Issues
- ✅ Discussions
- ✅ Projects
- ✅ Wiki
- ✅ GitHub Pages

## Branch Protection

The `main` branch is protected with:

### Requirements
- ✅ Pull Request reviews (minimum 1 approval)
- ✅ Code owner reviews required
- ✅ Branches must be up to date
- ✅ All status checks passing
- ✅ Admin enforcement

### Workflow
```
Your Branch → Pull Request → Review → Merge to Main → Auto Deploy
```

## GitHub Actions

### 1. Validate Workflow (`.github/workflows/validate.yml`)
**Trigger**: Push/PR to `main` or `develop`

**Checks**:
- ✅ HTML syntax validation
- ✅ CSS file integrity
- ✅ JavaScript syntax checking
- ✅ File encoding verification
- ✅ Large file detection
- ✅ TODO/FIXME comments

**Status Badge**:
```markdown
![Lint & Validate](https://github.com/noorplus/noorplus.github.io/actions/workflows/validate.yml/badge.svg)
```

### 2. Build Workflow (`.github/workflows/build.yml`)
**Trigger**: Push to `main` (deploys)

**Checks**:
- ✅ Project structure verification
- ✅ HTML validation
- ✅ Asset verification
- ✅ Code statistics
- ✅ GitHub Pages readiness

### 3. Security Workflow (`.github/workflows/security.yml`)
**Trigger**: Push/PR + Weekly schedule

**Checks**:
- ✅ Hardcoded credential scanning
- ✅ XSS vulnerability detection
- ✅ Unsafe code patterns
- ✅ Dependency security
- ✅ HTTPS/Security header recommendations

## GitHub Issues & Discussions

### Issue Types
We provide templates for:
- 🐛 **Bug Reports** - `.github/ISSUE_TEMPLATE/bug_report.md`
- ✨ **Feature Requests** - `.github/ISSUE_TEMPLATE/feature_request.md`
- 📚 **Documentation** - `.github/ISSUE_TEMPLATE/documentation.md`
- 🔒 **Security Reports** - `.github/ISSUE_TEMPLATE/security_report.md`

### Labels
Recommended labels:
- `bug` - Bugs and defects
- `enhancement` - New features
- `documentation` - Docs improvements
- `security` - Security issues
- `dependencies` - Dependency updates
- `good first issue` - Beginner-friendly
- `help wanted` - Need assistance
- `in progress` - Currently being worked on
- `blocked` - Blocked by other issues
- `question` - Questions/discussions

### Discussions
GitHub Discussions enable community conversations:
- 💬 General discussions
- ❓ Q&A forum
- 🎉 Announcements
- 🎓 Show and tell

## Pull Request Process

### Creating a PR
1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Commit with conventional messages
4. Push to your fork
5. Open a PR to `main` branch
6. Use the PR template (`.github/pull_request_template.md`)

### PR Template
The PR template includes:
- ✅ Description of changes
- ✅ Type of change checkbox
- ✅ Related issues
- ✅ Testing checklist
- ✅ Screenshots for UI changes
- ✅ Final approval checklist

### PR Review Process
1. **Automated Checks**: All workflows must pass
2. **Code Review**: At least 1 approval required
3. **Code Owner Review**: CODEOWNERS file determines required reviewers
4. **Branch Updates**: Must be up to date with main
5. **Approval**: Admin/maintainer approval
6. **Merge**: Squash or rebase merge recommended

## Security & Dependencies

### Dependabot Configuration
Configured in `.github/dependabot.yml`:

**GitHub Actions** - Weekly checks
**npm Dependencies** - Daily checks

Auto-generated PRs for:
- Security vulnerabilities
- Minor version updates
- Major version updates (manual review)

### CODEOWNERS File
Automatically assigns reviewers:
```
* @noorplus/maintainers
```

To assign specific people:
```
assets/js/* @javascript-expert
assets/css/* @css-expert
pages/* @content-expert
```

### Security Policy
See [SECURITY.md](../SECURITY.md) for:
- How to report vulnerabilities
- Security best practices
- Infrastructure security details

## Deployment

### Automatic Deployment
- **Trigger**: Push to `main` branch
- **Deployment Target**: GitHub Pages
- **URL**: https://noorplus.github.io/
- **Time**: ~1-2 minutes
- **Status**: Check Actions tab for status

### Manual Deployment (if needed)
```bash
# View deployment status
git log --oneline --decorate

# Check Actions tab
# https://github.com/noorplus/noorplus.github.io/actions
```

### Domain Configuration
For custom domain:
1. Go to Settings → Pages
2. Set custom domain
3. Update DNS records
4. Enable HTTPS

### Rollback
If deployment has issues:
1. Push a fix to `main`
2. GitHub automatically re-deploys
3. Or revert last commit: `git revert HEAD`

## Workflow Examples

### Creating a New Feature
```bash
# 1. Clone the repo
git clone https://github.com/noorplus/noorplus.github.io.git

# 2. Create feature branch
git checkout -b feature/add-hadith-feature

# 3. Make changes, test locally
python -m http.server 8000

# 4. Commit with conventional message
git commit -m "feat: add hadith of the day widget

- Integrate with Sunnah API
- Display daily hadith with translation
- Add refresh button
"

# 5. Push to fork
git push origin feature/add-hadith-feature

# 6. Open PR on GitHub
# Fill out PR template
# Wait for reviews and automated checks

# 7. After approval, maintainer merges
# Automatic deployment happens
```

### Reporting a Bug
```
1. Go to Issues → New Issue
2. Select "Bug Report" template
3. Fill in template details
4. Submit
5. Team will triage and assign
```

### Requesting a Feature
```
1. Go to Issues → New Issue
2. Select "Feature Request" template
3. Describe use case and proposed solution
4. Submit
5. Community discussion will follow
```

## Monitoring & Analytics

### GitHub Actions Status
- View at: Actions tab → Workflows
- Check latest runs
- View logs for failed runs

### Repository Traffic
- Settings → Traffic
- Track visitors over time
- See popular pages

### Insights
- Settings → Insights
- Contributors
- Commit frequency
- Code frequency
- Network graph

## Best Practices

### Commit Messages
```
feat: add new feature
fix: resolve issue
docs: update documentation
style: code style changes
refactor: code restructuring
perf: performance improvement
test: add/update tests
chore: build, deps, etc
```

### Branch Naming
```
feature/feature-name
fix/bug-name
docs/what-document
chore/task-description
```

### Code Review Checklist
- [ ] Code follows style guide
- [ ] No console errors
- [ ] Works on mobile
- [ ] Dark mode tested
- [ ] Accessibility considered
- [ ] Documentation updated
- [ ] No breaking changes

### Release Process
1. Update CHANGELOG.md
2. Update version numbers
3. Create release branch
4. Merge to main
5. Create GitHub Release with tag
6. Auto-deploy to production

## Useful Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Issues Documentation](https://docs.github.com/en/issues)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

## Support

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open an Issue
- **Security**: Email security@noorplus.github.io
- **General**: contact@noorplus.github.io

---

**Last Updated**: January 2026
