# 🌙 NoorPlus - Islamic Mobile App

> A comprehensive Islamic mobile web application featuring prayer times, Quran access, community features, and more.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-noorplus.github.io-blue?style=flat-square)](https://noorplus.github.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
![Version](https://img.shields.io/badge/Version-1.0.0-green?style=flat-square)

## ✨ Features

### 🕌 Prayer Times Dashboard
- **Real-time Prayer Times** - Accurate prayer schedules based on your location
- **Current Prayer Status** - Visual indicator of which prayer is currently in progress
- **Prayer Progress Circle** - Animated ring showing remaining time for active prayer
- **Sahur & Iftar Times** - Special times for Ramadan observance
- **Geolocation Support** - Automatic location detection with manual override

### 📖 Quran Module
- **Multiple Browse Options** - Access Quran by Surah, Ayah, Juz, Page, Ruku, or Keywords
- **Search Functionality** - Quick search for specific Surahs and Ayahs
- **Quick Access Cards** - Bookmarked Ayahs and pinned verses for easy reference
- **Ayah View** - Detailed view with translations and additional information

### 👥 Community Features
- **Community Hub** - Connect with other Islamic app users
- **Shared Resources** - Access community-curated Islamic content

### 📚 Library & Resources
- **Resource Collection** - Curated Islamic learning materials
- **Knowledge Base** - Articles, guides, and educational content

### ⚙️ Additional Features
- **Dark Mode** - Eye-friendly dark theme with light/dark mode toggle
- **Theme Persistence** - Your theme preference is saved locally
- **Responsive Design** - Optimized for all mobile devices
- **Fast Navigation** - Bottom navigation bar for easy page switching
- **Smooth Animations** - Elegant page transitions and UI interactions

## 🚀 Getting Started

### Prerequisites
- Modern web browser with JavaScript enabled
- Internet connection for prayer time API and Quran data

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/noorplus/noorplus.github.io.git
   cd noorplus.github.io
   ```

2. **Local Development**
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (if http-server installed)
   http-server
   ```

3. **Access the App**
   - Open `http://localhost:8000` in your browser

### Deploy to GitHub Pages
1. Push changes to your GitHub repository
2. GitHub automatically deploys from the `main` branch
3. Access your live app at `https://noorplus.github.io/noorplus.github.io/`

## 📁 Project Structure

```
noorplus.github.io/
├── index.html                 # Main app shell
├── assets/
│   ├── css/
│   │   └── style.css         # All styling and design system
│   └── js/
│       └── app.js            # Core application logic
├── pages/
│   ├── home.html             # Prayer times dashboard
│   ├── quran.html            # Quran browsing interface
│   ├── community.html        # Community features
│   ├── library.html          # Resource library
│   └── menu.html             # Additional menu options
├── README.md                 # This file
├── LICENSE                   # MIT License
├── CONTRIBUTING.md           # Contribution guidelines
├── CODE_OF_CONDUCT.md        # Community standards
└── SECURITY.md              # Security policy
```

## 🛠️ Tech Stack

- **Frontend Framework**: Vanilla JavaScript (ES6+)
- **Styling**: CSS3 with CSS Variables (Design Tokens)
- **Icons**: Lucide Icons
- **Typography**: Inter Font (Google Fonts)
- **Deployment**: GitHub Pages
- **Browser Support**: All modern browsers (Chrome, Firefox, Safari, Edge)

## 🎨 Design System

The app uses a comprehensive design system with:
- **Color Palette** - Primary: Blue (#2E7E9D), Success: Green (#48B572), Alert: Red (#E14B4B)
- **Spacing Scale** - From 4px (2xs) to 48px (2xl)
- **Typography** - Responsive font sizes from 11px to 22px
- **Border Radius** - Consistent rounded corners (10px - 18px)
- **Transitions** - Smooth animations (150ms - 250ms)
- **Dark Mode Support** - Full dark theme with adjusted color palette

## 📱 Responsive Design

The app is built mobile-first with:
- Viewport-optimized layouts
- Touch-friendly interface elements
- Flexible navigation
- Bottom navigation bar (72px height)
- Safe area padding for notched devices

## 🔧 Configuration

### Theme Settings
Users can toggle between light and dark themes. Theme preference is stored in browser localStorage as `theme`.

### Location Settings
The app requests geolocation permission to detect user location for accurate prayer times. Users can enable/disable location access in browser settings.

## 📚 API & External Services

The app integrates with:
- **Prayer Times API** - For accurate prayer schedules (Aladhan API recommended)
- **Quran API** - For Quran text and information (quran.com API)
- **Google Fonts** - For Inter typeface
- **Lucide Icons** - For SVG icons

## 🤝 Contributing

We welcome contributions from the community! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:
- How to report bugs
- How to suggest features
- How to submit pull requests
- Code style standards
- Development workflow

## 📋 Code of Conduct

Please review our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) to understand our community standards and expectations.

## 🔒 Security

If you discover a security vulnerability, please email security@noorplus.github.io or see [SECURITY.md](SECURITY.md) for details.

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Lucide Icons** - Beautiful icon library
- **Google Fonts** - Inter typeface
- **Quran.com** - Quran data source
- **Aladhan API** - Prayer times data
- Islamic community for inspiration and feedback

## 📞 Support

- **Issues**: Report bugs or request features on [GitHub Issues](https://github.com/noorplus/noorplus.github.io/issues)
- **Discussions**: Join community discussion on [GitHub Discussions](https://github.com/noorplus/noorplus.github.io/discussions)
- **Email**: contact@noorplus.github.io

## 🚀 Roadmap

Future features in development:
- [ ] Prayer reminders and notifications
- [ ] Hadith of the day
- [ ] Islamic calendar integration
- [ ] Qibla finder
- [ ] Tafsir (Quran commentary)
- [ ] Audio recitations
- [ ] User profiles and progress tracking
- [ ] Offline mode with service workers
- [ ] Multi-language support
- [ ] PWA installation support

---

**Made with ❤️ for the Islamic community**

**Last Updated**: January 2026
