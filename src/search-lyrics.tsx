import React, { useState, useEffect } from "react";
import { Action, ActionPanel, Detail, List, showToast, Toast } from "@raycast/api";
import axios from "axios";
import * as cheerio from "cheerio";
import SpotifyWebApi from "spotify-web-api-node";

// Import genius-lyrics with fallback
let GeniusClient: any;
try {
  const Genius = require("genius-lyrics");
  GeniusClient = Genius.Client || Genius.default?.Client || Genius;
} catch (error) {
  console.error("Failed to import genius-lyrics:", error);
}

// Spotify API configuration
const spotifyApi = new SpotifyWebApi({
  clientId: '1ccb4f5713f8424986d613b49e337a73',
  clientSecret: 'e941a3e941aa4e4d98b686c72e9d223e'
});

let spotifyTokenExpiry = 0;

// Spotify authentication function
async function authenticateSpotify(): Promise<boolean> {
  try {
    if (Date.now() < spotifyTokenExpiry) {
      return true; // Token still valid
    }

    const response = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(response.body.access_token);
    spotifyTokenExpiry = Date.now() + (response.body.expires_in * 1000) - 60000; // Refresh 1 min early
    console.log('✅ Spotify authenticated successfully');
    return true;
  } catch (error) {
    console.error('❌ Spotify authentication failed:', error);
    return false;
  }
}

// Spotify search functions
async function searchSpotifyTracks(query: string, limit: number = 20): Promise<Song[]> {
  try {
    const authenticated = await authenticateSpotify();
    if (!authenticated) return [];

    const searchResults = await spotifyApi.searchTracks(query, { limit, market: 'IN' });
    const tracks = searchResults.body.tracks?.items || [];

    return tracks.map((track) => ({
      id: track.id,
      title: track.name,
      artist: {
        name: track.artists[0]?.name || 'Unknown Artist',
      },
      album: track.album ? { name: track.album.name } : undefined,
      url: track.external_urls.spotify,
      thumbnail: track.album?.images[0]?.url || "🎵",
      fullSong: track,
    }));
  } catch (error) {
    console.error('Spotify track search error:', error);
    return [];
  }
}

async function searchSpotifyArtists(query: string, limit: number = 10): Promise<Artist[]> {
  try {
    const authenticated = await authenticateSpotify();
    if (!authenticated) return [];

    const searchResults = await spotifyApi.searchArtists(query, { limit, market: 'IN' });
    const artists = searchResults.body.artists?.items || [];

    return artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      url: artist.external_urls.spotify,
      thumbnail: artist.images[0]?.url || "👨‍🎤",
      followers: artist.followers?.total,
      genres: artist.genres,
      popularity: artist.popularity,
      fullArtist: artist,
    }));
  } catch (error) {
    console.error('Spotify artist search error:', error);
    return [];
  }
}

async function getSpotifyArtistTopTracks(artistId: string): Promise<Song[]> {
  try {
    const authenticated = await authenticateSpotify();
    if (!authenticated) return [];

    // Get top tracks (limited to 10 by Spotify)
    const topTracks = await spotifyApi.getArtistTopTracks(artistId, 'IN');
    const tracks = topTracks.body.tracks || [];

    return tracks.map((track) => ({
      id: track.id,
      title: track.name,
      artist: {
        name: track.artists[0]?.name || 'Unknown Artist',
      },
      album: track.album ? { name: track.album.name } : undefined,
      url: track.external_urls.spotify,
      thumbnail: track.album?.images[0]?.url || "🎵",
      fullSong: track,
    }));
  } catch (error) {
    console.error('Spotify artist top tracks error:', error);
    return [];
  }
}

async function getSpotifyArtistAlbums(artistId: string): Promise<Song[]> {
  try {
    const authenticated = await authenticateSpotify();
    if (!authenticated) return [];

    const songs: Song[] = [];
    const seenTrackIds = new Set<string>();
    
    // Get all albums for the artist (up to 50 albums, each with up to 50 tracks)
    const albumsResponse = await spotifyApi.getArtistAlbums(artistId, {
      include_groups: 'album,single',
      market: 'IN',
      limit: 50
    });
    
    const albums = albumsResponse.body.items || [];
    console.log(`📀 Found ${albums.length} albums for artist`);
    
    // Get tracks from each album
    for (const album of albums.slice(0, 10)) { // Limit to first 10 albums to avoid rate limits
      try {
        const tracksResponse = await spotifyApi.getAlbumTracks(album.id, {
          market: 'IN',
          limit: 50
        });
        
        const tracks = tracksResponse.body.items || [];
        
        for (const track of tracks) {
          // Skip duplicates by track ID
          if (seenTrackIds.has(track.id)) {
            continue;
          }
          
          seenTrackIds.add(track.id);
          songs.push({
            id: track.id,
            title: track.name,
            artist: {
              name: track.artists[0]?.name || 'Unknown Artist',
            },
            album: { name: album.name },
            url: track.external_urls.spotify,
            thumbnail: album.images[0]?.url || "🎵",
            fullSong: track,
          });
          
          // Stop if we reach 100 songs
          if (songs.length >= 100) {
            console.log(`🎵 Collected 100 unique songs, stopping`);
            return songs;
          }
        }
      } catch (albumError) {
        console.log(`Failed to get tracks for album ${album.name}:`, albumError);
      }
    }
    
    console.log(`🎵 Collected ${songs.length} unique songs total`);
    return songs;
  } catch (error) {
    console.error('Spotify artist albums error:', error);
    return [];
  }
}

// Enhanced song interface with multiple sources
interface LyricsSource {
  name: string;
  lyrics: string;
  url?: string;
}

interface Artist {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
  fullArtist?: any;
  followers?: number;
  genres?: string[];
  popularity?: number;
}

interface Song {
  id: number;
  title: string;
  artist: {
    name: string;
  };
  album?: {
    name: string;
  };
  url: string;
  thumbnail?: string;
  fullSong?: any;
  availableSources?: LyricsSource[];
}

type SearchMode = "song" | "artist" | "regional";

export default function SearchLyrics() {
  const [searchText, setSearchText] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>("song");

  // Search for songs or artists when search text or mode changes
  useEffect(() => {
    const performSearch = async () => {
      if (!searchText || searchText.trim().length < 2) {
        setSongs([]);
        return;
      }

      setIsLoading(true);
      try {
        if (!GeniusClient) {
          throw new Error("Genius client not available");
        }
        const client = new GeniusClient();
        
        let searchResults: Song[] = [];

        if (searchMode === "song") {
          // Use Spotify for better song search results
          console.log(`🎵 Searching Spotify for songs: "${searchText}"`);
          const spotifyResults = await searchSpotifyTracks(searchText, 15);
          
          if (spotifyResults.length > 0) {
            // Remove duplicates by song ID and title combination
            const uniqueSongs = [];
            const seenKeys = new Set();
            
            for (const song of spotifyResults) {
              const uniqueKey = `${song.id}-${song.title.toLowerCase()}-${song.artist.name.toLowerCase()}`;
              if (!seenKeys.has(uniqueKey)) {
                seenKeys.add(uniqueKey);
                uniqueSongs.push(song);
              }
            }
            
            searchResults = uniqueSongs;
            console.log(`✅ Found ${searchResults.length} unique songs on Spotify`);
          } else {
            // Fallback to Genius if Spotify fails
            console.log(`⚠️ Spotify search failed, trying Genius...`);
            if (!GeniusClient) {
              throw new Error("Both Spotify and Genius unavailable");
            }
            const client = new GeniusClient();
            const searches = await client.songs.search(searchText);
            searchResults = searches.slice(0, 10).map((song: any) => ({
              id: song.id,
              title: song.title,
              artist: {
                name: song.artist.name,
              },
              album: song.album ? { name: song.album.name } : undefined,
              url: song.url,
              thumbnail: song.thumbnail,
              fullSong: song,
            }));
          }
        } else if (searchMode === "artist") {
          // If no artist is selected, search for artists
          if (!selectedArtist) {
            // Use Spotify for better artist search
            console.log(`👨‍🎤 Searching Spotify for artists: "${searchText}"`);
            const spotifyArtists = await searchSpotifyArtists(searchText, 10);
            
            if (spotifyArtists.length > 0) {
              setArtists(spotifyArtists);
              setSongs([]); // Clear songs when showing artists
              console.log(`✅ Found ${spotifyArtists.length} artists on Spotify`);
              return;
            } else {
              // Fallback to Genius if Spotify fails
              console.log(`⚠️ Spotify artist search failed, trying Genius...`);
              if (!GeniusClient) {
                throw new Error("Both Spotify and Genius unavailable");
              }
              const client = new GeniusClient();
              const searches = await client.songs.search(searchText);
              
              // Extract unique artists from search results
              const artistMap = new Map<string, Artist>();
              
              searches.forEach((song: any) => {
                const artistName = song.artist.name;
                const artistId = song.artist.id;
                
                if (!artistMap.has(artistName)) {
                  artistMap.set(artistName, {
                    id: artistId.toString(),
                    name: artistName,
                    url: song.artist.url || `https://genius.com/artists/${artistName.replace(/\s+/g, '-')}`,
                    thumbnail: song.artist.image_url || song.thumbnail || "👨‍🎤",
                    fullArtist: song.artist
                  });
                }
              });
              
              const uniqueArtists = Array.from(artistMap.values())
                .slice(0, 10) // Show top 10 artists
                .sort((a, b) => a.name.localeCompare(b.name));
              
              setArtists(uniqueArtists);
              setSongs([]); // Clear songs when showing artists
              return;
            }
          } else {
            // Artist is selected, fetch their songs
            console.log(`🎵 Getting top tracks for: ${selectedArtist.name}`);
            
            // Try Spotify first for artist's comprehensive catalog
            if (selectedArtist.fullArtist && selectedArtist.fullArtist.id) {
              console.log(`🎵 Getting comprehensive catalog for: ${selectedArtist.name}`);
              const spotifyAlbumTracks = await getSpotifyArtistAlbums(selectedArtist.id);
              if (spotifyAlbumTracks.length > 0) {
                searchResults = spotifyAlbumTracks;
                console.log(`✅ Found ${spotifyAlbumTracks.length} tracks for ${selectedArtist.name} on Spotify`);
              } else {
                // Fallback to top tracks if album method fails
                const spotifyTracks = await getSpotifyArtistTopTracks(selectedArtist.id);
                if (spotifyTracks.length > 0) {
                  searchResults = spotifyTracks;
                  console.log(`✅ Found ${spotifyTracks.length} top tracks for ${selectedArtist.name} on Spotify (fallback)`);
                }
              }
            }
            
            // Fallback to Genius if Spotify fails or no tracks found
            if (searchResults.length === 0) {
              console.log(`⚠️ Spotify tracks failed, trying Genius for ${selectedArtist.name}...`);
              try {
                if (selectedArtist.fullArtist && selectedArtist.fullArtist.songs) {
                  // Use Genius artist API if available
                  const artistSongs = await selectedArtist.fullArtist.songs({ 
                    sort: "popularity", 
                    per_page: 100 
                  });
                  
                  searchResults = artistSongs.map((song: any) => ({
                    id: song.id,
                    title: song.title,
                    artist: {
                      name: song.artist.name,
                    },
                    album: song.album ? { name: song.album.name } : undefined,
                    url: song.url,
                    thumbnail: song.thumbnail,
                    fullSong: song,
                  }));
                }
              } catch (artistError) {
                // Final fallback: search for songs by artist name
                if (GeniusClient) {
                  const client = new GeniusClient();
                  const searches = await client.songs.search(selectedArtist.name);
                  const artistSongs = searches.filter((song: any) => 
                    song.artist.name.toLowerCase() === selectedArtist.name.toLowerCase()
                  );
                  
                  searchResults = artistSongs.slice(0, 100).map((song: any) => ({
                    id: song.id,
                    title: song.title,
                    artist: {
                      name: song.artist.name,
                    },
                    album: song.album ? { name: song.album.name } : undefined,
                    url: song.url,
                    thumbnail: song.thumbnail,
                    fullSong: song,
                  }));
                }
              }
            }
          }
        } else {
          // Regional mode - scrape from Tamil websites
          const regionalResults = await searchRegionalLyrics(searchText);
          searchResults = regionalResults;
        }

        setSongs(searchResults);
        setArtists([]); // Clear artists when showing songs
      } catch (error) {
        console.error("Search error:", error);
        setSongs([]);
        setArtists([]);
        showToast({
          style: Toast.Style.Failure,
          title: "Search Error",
          message: `Failed to search for ${searchMode}s. Please try again.`,
        });
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchText, searchMode, selectedArtist]);

  // Reset states when changing search modes
  useEffect(() => {
    setSelectedArtist(null);
    setArtists([]);
    setSongs([]);
  }, [searchMode]);

  // If a song is selected, show the lyrics view
  if (selectedSong) {
    return React.createElement(LyricsView, {
      song: selectedSong,
      onBack: () => setSelectedSong(null),
    });
  }

  // Show the search/autocomplete view
  return React.createElement(
    List,
    {
      isLoading: isLoading,
      onSearchTextChange: setSearchText,
      searchBarPlaceholder: searchMode === "song" 
        ? "Search for songs... (e.g., 'Bohemian Rhapsody', 'Hotel California')" 
        : searchMode === "artist"
        ? "Search for artists... (e.g., 'Queen', 'Eagles', 'The Beatles')"
        : "Search Tamil lyrics... (e.g., 'happy birthday', 'vennilave', 'yaaro yarodi')",
      throttle: true,
      searchBarAccessory: React.createElement(
        List.Dropdown,
        {
          tooltip: "Search Mode",
          storeValue: true,
          onChange: (newValue: string) => {
            setSearchMode(newValue as SearchMode);
            setSongs([]); // Clear results when switching modes
          }
        },
        React.createElement(List.Dropdown.Item, {
          title: "🎵 Song",
          value: "song"
        }),
        React.createElement(List.Dropdown.Item, {
          title: "👨‍🎤 Artist",
          value: "artist"
        }),
        React.createElement(List.Dropdown.Item, {
          title: "🏛️ Regional",
          value: "regional"
        })
      ),
    },
    // Show different content based on current state
    searchMode === "artist" && !selectedArtist && artists.length === 0 && searchText.length < 2
      ? React.createElement(List.EmptyView, {
          icon: "👨‍🎤",
          title: "Search for Artists",
          description: "Type at least 2 characters to start searching for artists",
        })
      : searchMode === "artist" && !selectedArtist && artists.length === 0
      ? React.createElement(List.EmptyView, {
          icon: "👨‍🎤", 
          title: "No Artists Found",
          description: "No artists found. Try a different search term.",
        })
      : searchMode === "artist" && selectedArtist && songs.length === 0
      ? React.createElement(List.EmptyView, {
          icon: "🎵",
          title: `${selectedArtist.name}'s Songs`,
          description: "Loading songs...",
        })
      : (searchMode === "song" || searchMode === "regional") && songs.length === 0 && searchText.length < 2
      ? React.createElement(List.EmptyView, {
          icon: searchMode === "song" ? "🎵" : "🏛️",
          title: searchMode === "song" ? "Search for Song Lyrics" : "Search Regional Lyrics",
          description: `Type at least 2 characters to start searching for ${searchMode === "regional" ? "regional lyrics" : "songs"}`,
        })
      : React.createElement(List.EmptyView, {
          icon: searchMode === "song" ? "🎵" : searchMode === "artist" ? "👨‍🎤" : "🏛️",
          title: searchMode === "song" ? "No Songs Found" : searchMode === "artist" ? "No Songs Found" : "No Regional Lyrics Found",
          description: searchMode === "song" 
            ? "No songs found. Try a different search term."
            : searchMode === "artist"
            ? "No songs found for this artist."
            : "No regional lyrics found. Try different keywords or spelling variations.",
        }),

    // Show artists when in artist mode and no artist is selected
    ...(searchMode === "artist" && !selectedArtist ? artists.map((artist) => {
      const subtitle = [];
      if (artist.followers) {
        subtitle.push(`${(artist.followers / 1000000).toFixed(1)}M followers`);
      }
      if (artist.genres && artist.genres.length > 0) {
        subtitle.push(artist.genres.slice(0, 2).join(", "));
      }
      if (artist.popularity) {
        subtitle.push(`${artist.popularity}% popularity`);
      }
      
      return React.createElement(List.Item, {
        key: `artist-${artist.id}-${artist.name}`,
        title: artist.name,
        subtitle: subtitle.length > 0 ? subtitle.join(" • ") : "Artist",
        icon: artist.thumbnail || "👨‍🎤",
        accessories: [
          ...(artist.followers ? [{ text: `${(artist.followers / 1000000).toFixed(1)}M` }] : [])
        ],
        actions: React.createElement(
          ActionPanel,
          {},
          React.createElement(Action, {
            title: "View Artist's Songs",
            onAction: () => {
              setSelectedArtist(artist);
              setSearchText(artist.name); // Trigger search for artist's songs
            },
          }),
          React.createElement(Action.OpenInBrowser, {
            title: artist.url.includes('spotify') ? "Open on Spotify" : "Open Artist Page",
            url: artist.url,
            shortcut: { modifiers: ["cmd"], key: "o" },
          }),
          React.createElement(Action.CopyToClipboard, {
            title: "Copy Artist Name",
            content: artist.name,
            shortcut: { modifiers: ["cmd"], key: "c" },
          })
        ),
      });
    }) : []),

    // Show songs (either from song search, artist's songs, or regional search)
    ...songs.map((song) => {
      const isSpotifySource = song.url && song.url.includes('spotify');
      const accessories = [];
      
      if (song.album?.name) {
        accessories.push({ text: song.album.name });
      }
      if (selectedArtist) {
        accessories.push({ text: `${songs.indexOf(song) + 1}/${songs.length}` });
      }
      
             return React.createElement(List.Item, {
         key: `song-${song.id}-${song.title}`,
         title: song.title,
        subtitle: song.artist.name,
        accessories: accessories,
        icon: song.thumbnail || "🎵",
        actions: React.createElement(
          ActionPanel,
          {},
          React.createElement(Action, {
            title: "View Lyrics",
            onAction: () => setSelectedSong(song),
          }),
          ...(selectedArtist ? [React.createElement(Action, {
            title: "Back to Artists",
            onAction: () => {
              setSelectedArtist(null);
              setSearchText(""); // Clear search to go back to artist search
            },
            shortcut: { modifiers: ["cmd"], key: "b" },
          })] : []),
          React.createElement(Action.OpenInBrowser, {
            title: isSpotifySource ? "Open on Spotify" : "Open on Genius",
            url: song.url,
            shortcut: { modifiers: ["cmd"], key: "o" },
          }),
          React.createElement(Action.CopyToClipboard, {
            title: "Copy Song Info",
            content: `${song.title} by ${song.artist.name}${song.album?.name ? ` (${song.album.name})` : ''}`,
            shortcut: { modifiers: ["cmd"], key: "c" },
          })
        ),
      });
    })
  );
}

// Enhanced lyrics fetching functions
async function searchAltLyrics(songTitle: string, artistName: string): Promise<LyricsSource[]> {
  const sources: LyricsSource[] = [];
  
  try {
    // Try MusixMatch API (free tier available)
    const musixmatchQuery = `${songTitle} ${artistName}`;
    console.log(`Searching alternative sources for: ${musixmatchQuery}`);
    
    // Try a general web search approach for Tamil songs
    if (isTamilContent(songTitle, artistName)) {
      const tamilSource = await searchTamilLyrics(songTitle, artistName);
      if (tamilSource) {
        sources.push(tamilSource);
      }
    }
    
    // Fallback message if no alternative sources found
    if (sources.length === 0) {
      sources.push({
        name: "Suggestion",
        lyrics: `We couldn't find lyrics for "${songTitle}" by ${artistName}.\n\nFor Tamil songs, try searching with:\n• Original Tamil script\n• English transliteration\n• Movie name + song name\n\nAlternative sources to try:\n• Tamil lyrics websites\n• Movie soundtrack databases\n• Regional music platforms`,
        url: undefined
      });
    }
  } catch (error) {
    console.error("Error searching alternative lyrics:", error);
  }
  
  return sources;
}

// Regional lyrics scraping functions
async function searchRegionalLyrics(query: string): Promise<Song[]> {
  const songs: Song[] = [];
  
  try {
    console.log(`Searching regional lyrics for: ${query}`);
    
    // Clean and format the query for URL
    const cleanQuery = query.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '-'); // Replace spaces with hyphens
    
    // Generate more comprehensive variations for Tamil songs
    const variations = generateComprehensiveVariations(query);
    console.log(`Generated ${variations.length} variations for "${query}":`, variations);
    
    // Try Tamil2Lyrics.com with all variations
    for (const variation of variations.slice(0, 8)) { // Try more variations
      const result = await scrapeTamil2Lyrics(variation);
      if (result && !songs.find(s => s.title === result.title)) {
        songs.push(result);
        console.log(`✅ Found lyrics with variation: ${variation}`);
      }
    }
    
    // Try alternate Tamil sources
    const alternateResults = await scrapeAlternateTamilSources(query);
    for (const result of alternateResults) {
      if (!songs.find(s => s.title === result.title)) {
        songs.push(result);
      }
    }
    
    // If no results found, create a helpful suggestions result
    if (songs.length === 0) {
      songs.push(createTamilSearchSuggestions(query));
    }
    
  } catch (error) {
    console.error("Error searching regional lyrics:", error);
    // Add error result with suggestions
    songs.push(createTamilSearchSuggestions(query));
  }
  
  return songs;
}

function generateComprehensiveVariations(query: string): string[] {
  const variations: string[] = [];
  const cleanQuery = query.toLowerCase().trim();
  
  // Base variation
  const baseUrl = cleanQuery
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
  
  variations.push(baseUrl);
  variations.push(`${baseUrl}-song-lyrics`);
  variations.push(`${baseUrl}-lyrics`);
  
  // Handle common Tamil song patterns
  const commonPatterns = [
    // For "God Bless You" type queries
    cleanQuery.replace(/\bbless\b/g, 'bless'),
    cleanQuery.replace(/\bgod\s+bless\b/g, 'godbless'),
    
    // For artist names
    cleanQuery.replace(/\banirudh\b/g, 'anirudh-ravichander'),
    cleanQuery.replace(/\bpaal\s+dabba\b/g, 'paaldabba'),
    
    // Common Tamil song URL patterns
    cleanQuery.replace(/\s+(song|lyrics)\b/g, ''),
    cleanQuery.replace(/\s+/g, ''),  // No spaces at all
    
    // Add common suffixes
    `${cleanQuery.replace(/\s+/g, '-')}-song`,
    `${cleanQuery.replace(/\s+/g, '-')}-tamil-lyrics`,
    `${cleanQuery.replace(/\s+/g, '')}-lyrics`,
  ];
  
  // Add pattern variations
  for (const pattern of commonPatterns) {
    if (pattern && pattern.length > 2) {
      const formatted = pattern.replace(/\s+/g, '-').replace(/--+/g, '-');
      if (!variations.includes(formatted)) {
        variations.push(formatted);
      }
    }
  }
  
  // If contains "song", try without it
  if (cleanQuery.includes('song')) {
    const withoutSong = cleanQuery.replace(/\bsong\b/g, '').trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    variations.push(withoutSong);
    variations.push(`${withoutSong}-lyrics`);
  }
  
  return [...new Set(variations)].filter(v => v && v.length > 1); // Remove duplicates and empty
}

function createTamilSearchSuggestions(query: string): Song {
  return {
    id: Date.now(),
    title: `Search suggestions for Tamil song "${query}"`,
    artist: { name: "Tamil Lyrics Helper" },
    album: { name: "Search Tips" },
    url: "https://www.tamil2lyrics.com",
    thumbnail: "💡",
    fullSong: null,
    availableSources: [{
      name: "Search Suggestions",
      lyrics: `🔍 **Try these search strategies:**

1. **Search with movie name**: "[Movie Name] + ${query}"
2. **Use Tamil script**: If you know the Tamil spelling
3. **Try different spellings**: Tamil names have multiple English spellings
4. **Include composer**: Add music director name to search

🌐 **Recommended Tamil lyrics websites:**
• TamilPaa.com
• Lyricstamil.com  
• Tamillyrics.hoodi.com
• A2zlyrics.com (Tamil section)

💡 **Pro tips:**
• Tamil songs often have better results when searched by movie name
• Include the year of release for more accurate results
• Try both original Tamil and transliterated versions

🎵 **For "${query}" specifically, try:**
• "god-bless-you-lyrics"
• "godbless-tamil-song"
• Include movie name if known
• Search "Anirudh Ravichander God Bless You"`,
      url: "https://www.tamil2lyrics.com"
    }]
  };
}

function generateQueryVariations(query: string): string[] {
  const variations: string[] = [];
  const cleanQuery = query.toLowerCase().trim();
  
  // Base variation
  const baseUrl = cleanQuery
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-'); // Replace multiple hyphens with single
  
  variations.push(baseUrl);
  variations.push(`${baseUrl}-song-lyrics`);
  variations.push(`${baseUrl}-lyrics`);
  
  // If it contains "song", try without it
  if (cleanQuery.includes('song')) {
    const withoutSong = cleanQuery.replace(/\bsong\b/g, '').trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    variations.push(withoutSong);
    variations.push(`${withoutSong}-lyrics`);
  }
  
  return variations;
}

async function scrapeTamil2Lyrics(querySlug: string): Promise<Song | null> {
  try {
    const url = `https://www.tamil2lyrics.com/lyrics/${querySlug}/`;
    console.log(`Attempting to scrape: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract song title
    const title = $('h1').first().text().replace('Song Lyrics', '').trim() || querySlug.replace(/-/g, ' ');
    
    // Extract singers - try multiple selectors
    let singers = $('strong:contains("Singers")').parent().text()
      .replace('Singers :', '').replace('பாடகர்கள் :', '').trim();
    if (!singers || singers === 'Unknown') {
      singers = $('strong:contains("பாடகர்கள்")').parent().text()
        .replace('பாடகர்கள் :', '').replace('Singers :', '').trim() || 'Unknown';
    }
    
    // Extract music director - try multiple selectors
    let musicBy = $('strong:contains("Music by")').parent().text()
      .replace('Music by :', '').replace('இசையமைப்பாளர் :', '').trim();
    if (!musicBy || musicBy === 'Unknown') {
      musicBy = $('strong:contains("இசையமைப்பாளர்")').parent().text()
        .replace('இசையமைப்பாளர் :', '').replace('Music by :', '').trim() || 'Unknown';
    }
    
    // Extract lyrics - try multiple approaches
    let lyrics = '';
    
    // Method 1: Look for Tamil section specifically
    const tamilElements = $('*:contains("தமிழ்")');
    for (let i = 0; i < tamilElements.length; i++) {
      const tamilSection = $(tamilElements[i]).next();
      if (tamilSection.length > 0 && tamilSection.text().trim().length > 50) {
        lyrics = tamilSection.text().trim();
        break;
      }
    }
    
    // Method 2: Look for content with Tamil characters
    if (!lyrics) {
      $('p, div').each((i, elem) => {
        const text = $(elem).text();
        if (text.includes('ஆண்') || text.includes('குழு') || text.match(/[த-ஹ]+/)) {
          if (text.length > lyrics.length && text.length > 50) {
            lyrics = text;
          }
        }
      });
    }
    
    // Method 3: General content extraction
    if (!lyrics) {
      const possibleSelectors = [
        '.entry-content',
        '.post-content', 
        '.lyrics-content',
        '.content',
        'article'
      ];
      
      for (const selector of possibleSelectors) {
        const content = $(selector).text().trim();
        if (content.length > 100) {
          lyrics = content;
          break;
        }
      }
    }
    
    // Clean up lyrics
    if (lyrics) {
      lyrics = lyrics
        .replace(/\n\n+/g, '\n\n') // Remove excessive line breaks
        .replace(/^\s+|\s+$/g, '') // Trim whitespace
        .replace(/tamil chat room.*$/i, '') // Remove footer content
        .replace(/© \d+ - www\.tamil2lyrics\.com.*$/i, '') // Remove copyright
        .substring(0, 3000); // Limit length
    }
    
    if (lyrics && lyrics.length > 50) {
      return {
        id: Date.now(),
        title: title,
        artist: { name: singers },
        album: { name: musicBy },
        url: url,
        thumbnail: "🎵",
        fullSong: null,
        availableSources: [{
          name: "Tamil2Lyrics.com",
          lyrics: lyrics,
          url: url
        }]
      };
    }
    
  } catch (error) {
    console.log(`Failed to scrape ${querySlug}:`, error.message || error);
  }
  
  return null;
}

// Add more Tamil lyrics sources
async function scrapeAlternateTamilSources(query: string): Promise<Song[]> {
  const songs: Song[] = [];
  
  try {
    // Try TamilPaa.com
    const tamilPaaResult = await scrapeTamilPaa(query);
    if (tamilPaaResult) songs.push(tamilPaaResult);
    
    // Try LyricsTamil approach
    const lyricsTamilResult = await scrapeLyricsTamil(query);
    if (lyricsTamilResult) songs.push(lyricsTamilResult);
    
  } catch (error) {
    console.error("Error scraping alternate Tamil sources:", error);
  }
  
  return songs;
}

async function scrapeTamilPaa(query: string): Promise<Song | null> {
  try {
    const searchQuery = query.toLowerCase().replace(/\s+/g, '+');
    // Note: This would require implementing a search on TamilPaa
    // For now, return null as we'd need to implement their search API
    console.log(`Would search TamilPaa for: ${searchQuery}`);
    return null;
  } catch (error) {
    console.log("TamilPaa search failed:", error);
    return null;
  }
}

async function scrapeLyricsTamil(query: string): Promise<Song | null> {
  try {
    // Similar approach for LyricsTamil.com
    console.log(`Would search LyricsTamil for: ${query}`);
    return null;
  } catch (error) {
    console.log("LyricsTamil search failed:", error);
    return null;
  }
}

function isTamilContent(title: string, artist: string): boolean {
  const tamilRegex = /[\u0B80-\u0BFF]/;
  const tamilKeywords = ['tamil', 'kollywood', 'chennai', 'madras', 'ilayaraja', 'rahman', 'yuvan', 'anirudh', 'gv prakash', 'harris jayaraj', 'devi sri prasad', 'sean roldan'];
  
  const combined = `${title} ${artist}`.toLowerCase();
  
  return tamilRegex.test(title) || tamilRegex.test(artist) || 
         tamilKeywords.some(keyword => combined.includes(keyword));
}

async function searchTamilLyrics(songTitle: string, artistName: string): Promise<LyricsSource | null> {
  try {
    // This is a placeholder for Tamil lyrics scraping
    // In a real implementation, you would scrape from Tamil lyrics sites
    console.log(`Searching Tamil lyrics for: ${songTitle} by ${artistName}`);
    
    const searchQuery = `${songTitle} ${artistName} tamil lyrics`;
    
    return {
      name: "Tamil Lyrics Helper",
      lyrics: `Search suggestions for Tamil song "${songTitle}" by ${artistName}:

🔍 **Try these search strategies:**

1. **Search with movie name**: "[Movie Name] + ${songTitle}"
2. **Use Tamil script**: If you know the Tamil spelling
3. **Try different spellings**: Tamil names have multiple English spellings
4. **Include composer**: Add music director name to search

🌐 **Recommended Tamil lyrics websites:**
• TamilPaa.com
• Lyricstamil.com  
• Tamillyrics.hoodi.com
• A2zlyrics.com (Tamil section)

💡 **Pro tips:**
• Tamil songs often have better results when searched by movie name
• Include the year of release for more accurate results
• Try both original Tamil and transliterated versions`,
      url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`
    };
  } catch (error) {
    console.error("Error searching Tamil lyrics:", error);
    return null;
  }
}

// Component to show lyrics for a selected song
function LyricsView({ song, onBack }: { song: Song; onBack: () => void }) {
  const [lyrics, setLyrics] = useState<string>("");
  const [alternativeSources, setAlternativeSources] = useState<LyricsSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showAlternatives, setShowAlternatives] = useState(false);

  useEffect(() => {
    const fetchLyrics = async () => {
      try {
        setIsLoading(true);
        setError("");

        let lyricsFound = false;

        // Check if song has pre-scraped lyrics from regional sources (highest priority)
        if (song.availableSources && song.availableSources.length > 0) {
          const primarySource = song.availableSources[0];
          setLyrics(primarySource.lyrics);
          setAlternativeSources(song.availableSources);
          setShowAlternatives(song.availableSources.length > 1);
          lyricsFound = true;
          console.log(`✅ Using pre-scraped lyrics from ${primarySource.name}`);
        }

        // Try Genius for regular songs (if no regional lyrics found)
        if (!lyricsFound) {
          try {
            // If we have a Genius song object, use it directly
            if (song.fullSong && song.fullSong.lyrics) {
              const lyricsText = await song.fullSong.lyrics();
              if (lyricsText && lyricsText.trim() !== "") {
                setLyrics(lyricsText);
                lyricsFound = true;
                console.log("✅ Using Genius lyrics from fullSong object");
              }
            } else {
              // For Spotify songs or when Genius object is not available, search Genius by title/artist
              console.log(`🔍 Searching Genius for: "${song.title}" by "${song.artist.name}"`);
              if (GeniusClient) {
                const client = new GeniusClient();
                const searchResults = await client.songs.search(`${song.title} ${song.artist.name}`);
                
                if (searchResults && searchResults.length > 0) {
                  // Find the best match (exact title match preferred)
                  let bestMatch = searchResults[0];
                  for (const result of searchResults) {
                    if (result.title.toLowerCase() === song.title.toLowerCase() && 
                        result.artist.name.toLowerCase() === song.artist.name.toLowerCase()) {
                      bestMatch = result;
                      break;
                    }
                  }
                  
                  console.log(`🎯 Found match: "${bestMatch.title}" by "${bestMatch.artist.name}"`);
                  const lyricsText = await bestMatch.lyrics();
                  if (lyricsText && lyricsText.trim() !== "") {
                    setLyrics(lyricsText);
                    lyricsFound = true;
                    console.log("✅ Using Genius lyrics from search");
                  }
                }
              }
            }
          } catch (geniusError) {
            console.log("Genius lyrics not available, trying alternatives...", geniusError);
          }
        }

        // If both regional and Genius fail, search alternative sources
        if (!lyricsFound) {
          console.log("Searching alternative lyrics sources...");
          const altSources = await searchAltLyrics(song.title, song.artist.name);
          setAlternativeSources(altSources);
          setShowAlternatives(true);
          
          if (altSources.length > 0) {
            setLyrics(altSources[0].lyrics);
          } else {
            throw new Error("Lyrics not available from any source");
          }
        }
      } catch (err: any) {
        console.error("Error fetching lyrics:", err);
        setError(err.message || "Failed to fetch lyrics. Please try again.");
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: err.message || "Failed to fetch lyrics",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLyrics();
  }, [song]);

  const markdown = () => {
    if (error) {
      return `# Error\n\n${error}\n\n## Tips:\n- Try searching for a different version of the song\n- Check if the song is available on Genius\n- Some songs may not have lyrics available`;
    }

    if (!lyrics) {
      return `# Loading lyrics for "${song.title}"\n\nPlease wait while we fetch the lyrics...`;
    }

    return `# ${song.title}\n\n**Artist:** ${song.artist.name}\n\n${song.album?.name ? `**Album:** ${song.album.name}\n\n` : ''}---\n\n${lyrics.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0).join('\n\n')}`;
  };

  const actions = [
    React.createElement(Action, {
      title: "Back to Search",
      onAction: onBack,
      shortcut: { modifiers: ["cmd"], key: "b" },
    }),
    React.createElement(Action.OpenInBrowser, {
      title: "Open on Genius",
      url: song.url,
      shortcut: { modifiers: ["cmd"], key: "o" },
    }),
  ];

  if (lyrics) {
    actions.push(
      React.createElement(Action.CopyToClipboard, {
        title: "Copy Lyrics",
        content: lyrics,
        shortcut: { modifiers: ["cmd"], key: "c" },
      }),
      React.createElement(Action.CopyToClipboard, {
        title: "Copy Song Info",
        content: `${song.title} by ${song.artist.name}`,
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
      })
    );
  }

  // Add Tamil-specific search action if it's a Tamil song
  if (showAlternatives && alternativeSources.length > 0 && alternativeSources[0].url) {
    actions.push(
      React.createElement(Action.OpenInBrowser, {
        title: "Search Online for Tamil Lyrics",
        url: alternativeSources[0].url,
        shortcut: { modifiers: ["cmd", "shift"], key: "s" },
      })
    );
  }

  return React.createElement(
    Detail,
    {
      isLoading: isLoading,
      markdown: markdown(),
      navigationTitle: `${song.title} - ${song.artist.name}`,
      actions: React.createElement(ActionPanel, {}, ...actions),
    }
  );
} 