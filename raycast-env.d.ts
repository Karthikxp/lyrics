/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Genius API Key - Get your API key from https://genius.com/api-clients */
  "geniusApiKey"?: string,
  /** Spotify Client ID - Get your credentials from https://developer.spotify.com/dashboard */
  "spotifyClientId": string,
  /** Spotify Client Secret - Get your credentials from https://developer.spotify.com/dashboard */
  "spotifyClientSecret": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-lyrics` command */
  export type SearchLyrics = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-lyrics` command */
  export type SearchLyrics = {}
}

