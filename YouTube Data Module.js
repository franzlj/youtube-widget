// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: tv;

// YouTube Data Module
// Provides latest videos from favorited channels
    
// Import: const dataModule = importModule('YouTube Data Module')
// Usage: let videos = await dataModule.loadFavoriteChannelVideos()
// Expects:
// * YouTube Data v3 API Key in Keychain for Scriptable, key "YouTubeDatav3"
// * List of favorite channels as JSON file at "Data/YouTubeChannels.json" in your Scriptable iCloud folder

// Output:
// [
// 		{
// 			videoWatchUrl: "URL",
// 			title: "String",
// 			channel: "String",
// 			publishedAt: "Date",
//			thumbnailUrl: "URL"
// 		}
// ]

const apiKey = Keychain.get("YouTubeDatav3")
const favoriteChannelsFilename = "YouTubeChannels.json"
const cachedVideosFilename = "YouTubeCachedWidgetVideos.json"
const videosToLoadPerPlaylist = 5
const hoursAfterWhichToIgnoreCache = 2

module.exports.loadFavoriteChannelVideos = async () => {
    let concatenatedChannelIds = readFavoriteChannelIds()
    let cache = getJSONFromFile(getCachedVideosFileURL())

    if (cache && isTimestampOutdated(cache.cachedAt) === true) {
        return await loadVideos(concatenatedChannelIds)
    } else {
        return cache.videos
    }
}

// If this module is run as a script, and an input is provided, use the input to perform
// data actions like adding or removing a channel.
if (args.shortcutParameter) {
    var input = args.shortcutParameter

    // Check for objects to add to the favorites
    if (input.channelId && input.channelTitle) {
        addChannelToFavorites(input)
    }
    
    Script.complete()
} else if (config.runsInApp) {
    console.log("Currently favorited channels:")
    console.log(readFavoriteChannelIds())
}

// Add a new channel to your favorited channels JSON file.
function addChannelToFavorites(channelInfo) {
    var channelToAdd = {
        channelId: channelInfo.channelId,
        channelTitle: channelInfo.channelTitle
    }

    var currentData = getJSONFromFile(getFavoriteChannelsFileURL())

    // Make sure we don't add duplicates
    if (currentData.channels.filter(channel => channel.channelId === channelInfo.channelId).length >= 1) {
        throw new Error(`Channel is already in your YouTube favorites (${channelInfo.channelId})`)
    }
    currentData.channels.push(channelToAdd)

    writeJSONToFile(getFavoriteChannelsFileURL(), currentData)
}

// Reads user configured YT channels from disk via first JSON file in Data folder
// of Scriptable iCloud. 
function readFavoriteChannelIds() {
    var channels = getJSONFromFile(getFavoriteChannelsFileURL()).channels
        
    channels
        // If a widget parameter is present, use it as channel title to filter
        // for videos only of that channel.
        .filter(channel => {
            args.widgetParameter
                ? channel.channelTitle == args.widgetParameter
                : true
            }
        )
    
    const channelIds = channels.map(channel => channel.channelId)
    const concatenatedChannelIds = channelIds.reduce((prev, next) => `${prev},${next}`)
    return concatenatedChannelIds
}

// Loads all n last videos of the provided channels and returns
// an array of all videos sorted by published date in a compact
// format. Saves loaded videos to cache.
async function loadVideos(channelIds) {

    // Get Playlist IDs for all the channels
    let uploadPlaylists = (await loadChannels(channelIds))
        .map(channel => channel.contentDetails.relatedPlaylists.uploads)

    // Start collecting video objects for later display
    let videos = []

    // For each playlist ID we request the videos and fill an array of compact video info objects
    for (let playlistID of uploadPlaylists) {
        let vids = await videosOfPlaylist(playlistID, videosToLoadPerPlaylist)
        vids
            .map(video => {
                return {
                    videoWatchUrl: `https://www.youtube.com/embed/${video.snippet.resourceId.videoId}?vq=hd1440&autoplay=1`,
                    title: video.snippet.title,
                    channel: video.snippet.videoOwnerChannelTitle,
                    publishedAt: video.contentDetails.videoPublishedAt,
                    thumbnailUrl: video.snippet.thumbnails.medium.url
                }
            })
            .forEach(compactVideoInfo => videos.push(compactVideoInfo))
    }

    keypath = "publishedAt"
    videos
        .sort((a, b) => valueAtKeypath(a, keypath) < valueAtKeypath(b, keypath))

    let cache = { cachedAt: Date.now(), videos: videos }
    writeJSONToFile(getCachedVideosFileURL(), cache)

    return videos
}

// Function to get the channel details of given channel IDs
async function loadChannels(channels) {
    var request = new Request(`https://youtube.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${channels}&key=${apiKey}`)
    var response = await request.loadJSON()
    return response.items
}

// Function to request videos of a given playlist
async function videosOfPlaylist(playlistId, numberOfVideos) {
    var request = new Request(`https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=${numberOfVideos}&playlistId=${playlistId}&key=${apiKey}`)
    var response = await request.loadJSON()
    return response.items
}

function valueAtKeypath(object, keypath) {
    return keypath.split('.').reduce((previous, current) => previous[current], object)
}

// Checks whether the duration between now and the provided timestamp (in ms since UNIX epoch time)
// exceeds the defined time to wait until the cache is discarded.
function isTimestampOutdated(ms) {
    return ((Date.now() - ms) / 1000 / 60 / 60) >= hoursAfterWhichToIgnoreCache
}

// - File Management

// Provides the URL to the expected JSON file in which the favorite channels are stored.
// This usually is "Data/YouTubeChannels.json" inside Scriptables iCloud Drive folder.
function getFavoriteChannelsFileURL() {
    return getDataFolder() + "/" + favoriteChannelsFilename
}

function getCachedVideosFileURL() {
    return getDataFolder() + "/" + cachedVideosFilename
}

function getDataFolder() {
    return `${FileManager.iCloud().documentsDirectory()}/Data`
}

// Read favorite channels from iCloud file and return parsed contents
function getJSONFromFile(fileURL) {
    return JSON.parse(FileManager.iCloud().readString(fileURL))
}

function writeJSONToFile(fileURL, object) {
    if (typeof object !== "object") {
        throw new Error("Expected to write an object but got other type instead.")
    }
    FileManager.iCloud().writeString(fileURL, JSON.stringify(object, null, 4))
}