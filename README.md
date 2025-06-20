# Lyrics Finder - Raycast Extension

A Raycast extension that allows you to search for and display song lyrics directly in Raycast.

## Features

- 🔍 **Smart autocomplete search** - See song suggestions as you type
- 👥 **Artist and album info** - Preview song details before selecting
- 🎵 **Instant song preview** - Shows song title, artist, and album in dropdown
- 📖 **Beautiful lyrics display** - Clean, readable formatting
- 🔗 **Open on Genius** - Direct links to original source
- 📋 **Copy functionality** - Copy lyrics or song info with shortcuts
- ⚡ **Fast search** - Powered by Genius database
- 🎨 **Intuitive interface** - Easy navigation between search and lyrics

## Usage

1. Open Raycast and type "Search Lyrics"
2. Start typing a song title in the search bar
   - Autocomplete suggestions appear as you type
   - Each suggestion shows: **Song Title** by **Artist** (Album if available)
3. Select a song from the dropdown to view full lyrics
4. Use "Back to Search" to return to the autocomplete list

## Keyboard Shortcuts

### In Search View:
- `⌘ + O` - Open selected song on Genius
- `⌘ + C` - Copy song info (title and artist)

### In Lyrics View:
- `⌘ + B` - Back to search
- `⌘ + O` - Open song on Genius  
- `⌘ + C` - Copy lyrics to clipboard
- `⌘ + ⇧ + C` - Copy song info (title and artist)

## Tips for Better Results

- Include the artist name in your search for more accurate results
- Use the main keywords from the song title
- Check your spelling
- Try different variations if the first search doesn't find the right song

## Installation

1. Clone or download this repository
2. Run `npm install` to install dependencies  
3. **Add an icon**: Create a 512x512 PNG file named `icon.png` in the `assets/` folder
   - You can use any music-related icon (🎵, 🎶, or design your own)
   - Raycast's [Icon Generator](https://icon.ray.so/) can help create one
4. Run `npm run dev` to start development mode
5. The extension will appear in Raycast

## Icon Note

The extension currently needs a proper icon file. You can:
- Use Raycast's Icon Generator: https://icon.ray.so/
- Create your own 512x512 PNG with a music theme
- Use any music emoji (🎵, 🎶, 🎼) as inspiration

## Dependencies

- `@raycast/api` - Raycast extension API
- `genius-lyrics` - Library for fetching lyrics from Genius

## License

MIT License 