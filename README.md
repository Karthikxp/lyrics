# Lyrics Finder - Raycast Extension

A powerful Raycast extension that allows you to search for and display song lyrics from multiple sources including Spotify, Genius, and regional platforms. Enhanced with comprehensive search capabilities, multi-language support, and intelligent source prioritization.

## 🚀 Key Features

### **Multi-Source Search**
- 🎵 **Spotify Integration** - Primary search with comprehensive catalog access
- 🧠 **Genius API** - Fallback for lyrics and detailed song information  
- 🌏 **Regional Sources** - Specialized Tamil lyrics scraping from multiple sites
- 🔄 **Alternative Sources** - Automatic fallback when primary sources fail

### **Advanced Search Modes**
- 🎶 **Song Search** - Find specific tracks with autocomplete suggestions
- 👨‍🎤 **Artist Search** - Browse complete discographies (albums + singles)
- 🌍 **Regional Search** - Specialized search for Tamil and other regional lyrics

### **Intelligent Features**
- 🔍 **Smart autocomplete** - Real-time suggestions as you type
- 🎯 **Duplicate detection** - Clean results without repeated entries
- 📊 **Source prioritization** - Best available lyrics source automatically selected
- 🎨 **Rich metadata** - Album art, artist info, release details
- ⚡ **Performance optimized** - Cached authentication and rate-limited API calls

### **User Experience**
- 📖 **Beautiful lyrics display** - Clean, readable formatting with line breaks
- 🔗 **Multiple actions** - Open on platforms, copy lyrics/info, search alternatives
- 📋 **Advanced copy options** - Copy lyrics, song info, or search queries
- 🎛️ **Mode switching** - Easy toggle between song, artist, and regional modes
- 🌐 **Platform linking** - Direct links to Spotify, Genius, and regional sites

## 📱 Usage Guide

### **Basic Search (Song Mode)**
1. Open Raycast and type "Search Lyrics"
2. Start typing a song title or artist name
   - Real-time autocomplete shows: **Song Title** by **Artist** (Album)
   - Thumbnails and metadata preview available
3. Select a song to view full lyrics with multiple source options
4. Use "Back to Search" to return to results

### **Artist Mode**
1. Switch to Artist mode in the dropdown
2. Search for an artist name
3. Select an artist to see their complete catalog
   - Top tracks, albums, and singles
   - Comprehensive discography from Spotify
   - Up to 100+ songs per artist
4. Select any song to view lyrics

### **Regional Mode (Tamil Lyrics)**
1. Switch to Regional mode for specialized Tamil content
2. Search using English or Tamil terms
3. Get results from multiple Tamil lyrics sources:
   - Tamil2Lyrics.com
   - TamilPaa.com  
   - LyricsTamil.com
   - Alternative scrapers
4. Automatic query variations and movie-based searches

## ⌨️ Keyboard Shortcuts

### **In Search View:**
- `⌘ + O` - Open selected song on original platform (Spotify/Genius)
- `⌘ + C` - Copy song info (title and artist)
- `⌘ + ↑/↓` - Navigate through search modes

### **In Lyrics View:**
- `⌘ + B` - Back to search results
- `⌘ + O` - Open song on Genius/original source
- `⌘ + C` - Copy full lyrics to clipboard
- `⌘ + ⇧ + C` - Copy song info (title and artist)
- `⌘ + ⇧ + S` - Search online for alternatives (Tamil mode)

## 🎯 Search Tips & Best Practices

### **For Better Song Results:**
- Include artist name for more accurate matches
- Use primary keywords from song titles
- Try alternative spellings if needed
- Regional songs: include movie name for Tamil content

### **For Artist Discovery:**
- Artist mode provides complete discographies
- Results include albums, singles, and collaborations
- Sorted by popularity and release chronology
- Duplicate removal ensures clean browsing

### **For Regional Content:**
- Tamil mode supports movie-based searches
- Multiple spelling variations automatically tried
- Includes transliteration and native script options
- Provides search suggestions and manual fallbacks

## 🛠️ Installation & Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd lyrics-finder
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Add Required Icon**
   - Create a 512x512 PNG file named `icon.png` in the `assets/` folder
   - Use [Raycast's Icon Generator](https://icon.ray.so/) for best results
   - Music-themed icons (🎵, 🎶, 🎼) work well

4. **Development Mode**
   ```bash
   npm run dev
   ```

5. **Production Build**
   ```bash
   npm run build
   ```

## 🔧 Technical Architecture

### **Data Sources**
- **Spotify Web API** - Primary music catalog and metadata
- **Genius API** - Lyrics content and song information
- **Regional Scrapers** - Tamil lyrics from multiple websites
- **Alternative APIs** - Fallback sources for comprehensive coverage

### **Search Intelligence**
- Query preprocessing and variation generation
- Duplicate detection across sources
- Result relevance scoring and ranking
- Automatic language and region detection

### **Performance Features**
- OAuth token caching with automatic refresh
- Rate limiting and request optimization
- Parallel source querying where possible
- Result caching to minimize API calls

## 📦 Dependencies

### **Core Dependencies**
- `@raycast/api` - Raycast extension framework
- `genius-lyrics` - Genius API integration
- `spotify-web-api-node` - Spotify Web API client
- `axios` - HTTP requests for custom scrapers
- `cheerio` - HTML parsing for regional sources

### **Development Tools**
- `@raycast/eslint-config` - Code quality standards
- `typescript` - Type safety and modern JavaScript
- `prettier` - Code formatting

## 🌟 Advanced Features

### **Multi-Language Support**
- Tamil lyrics with specialized scraping
- English transliteration support
- Movie-based search for regional content
- Automatic language detection

### **Source Fallback Chain**
1. **Spotify** (metadata + track info)
2. **Genius** (lyrics + song details)  
3. **Regional Sources** (Tamil websites)
4. **Alternative Scrapers** (backup options)
5. **Manual Search** (online fallback links)

### **Smart Search Enhancements**
- Real-time autocomplete with rich metadata
- Artist discography exploration
- Album and single browsing
- Collaborative track detection

## 🆘 Troubleshooting

### **Common Issues**
- **No search results**: Try alternative spellings or include artist name
- **Missing lyrics**: Some songs may not have lyrics available on any source
- **Slow performance**: Check network connection; API rate limits may apply
- **Tamil content**: Use movie names for better regional search results

### **Debug Information**
- Check Raycast console for detailed search logs
- Spotify authentication status logged on each search
- Source fallback progression shown in development mode

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please read the contribution guidelines and submit pull requests for any enhancements.

---

**Note**: This extension requires active internet connection for all search and lyrics functionality. Some features may be limited by API rate limits during heavy usage. 