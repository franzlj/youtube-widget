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

module.exports.loadFavoriteChannelVideos = async () => {
    let concatenatedChannelIds = readFavoriteChannelIds()
    let videos = await loadVideos(concatenatedChannelIds)
    return videos
}

const apiKey = Keychain.get("YouTubeDatav3")
const favoriteChannelsFilename = "YouTubeChannels.json"

// Reads user configured YT channels from disk via first JSON file in Data folder
// of Scriptable iCloud. 
function readFavoriteChannelIds() {
    const dataFolder = FileManager.iCloud().documentsDirectory() + "/Data"
    const docs = FileManager.iCloud().listContents(dataFolder)
    const channels = JSON
        .parse(FileManager.iCloud().readString(dataFolder + "/" + favoriteChannelsFilename))
        .channels
        // If a widget parameter is present, use it as channel title to filter
        // for videos only of that channel.
        .filter(channel => args.widgetParameter
            ? channel.channelTitle == args.widgetParameter
            : true
        )
    const channelIds = channels.map(channel => channel.channelId)
    const concatenatedChannelIds = channelIds.reduce((prev, next) => prev + "," + next)
    return concatenatedChannelIds
}

// Loads all n last videos of the provided channels and returns
// an array of all videos sorted by published date in a compact
// format.
async function loadVideos(channelIds) {

    // Get Playlist IDs for all the channels
    let uploadPlaylists = (await loadChannels(channelIds))
        .map(channel => channel.contentDetails.relatedPlaylists.uploads)

    // Start collecting video objects for later display
    let videos = []

    // For each playlist ID we request the videos and fill an array of compact video info objects
    for (let i = 0; i < uploadPlaylists.length; i += 1) {
        let vids = await videosOfPlaylist(uploadPlaylists[i], 10)
        vids
            .map(video => {
                return {
                    videoWatchUrl: "https://www.youtube.com/embed/"
                        + video.snippet.resourceId.videoId
                        + "?vq=hd1440&autoplay=1",
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

    return videos
}

// Function to get the channel details of given channel IDs
async function loadChannels(channels) {
    var request = new Request("https://youtube.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=" + channels + "&key=" + apiKey)
    var response = await request.loadJSON()
    return response.items
}

// Function to request videos of a given playlist
async function videosOfPlaylist(playlistId, numberOfVideos) {
    var request = new Request("https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=" + numberOfVideos + "&playlistId=" + playlistId + "&key=" + apiKey)
    var response = await request.loadJSON()
    return response.items
}

function valueAtKeypath(object, keypath) {
    return keypath.split('.').reduce((previous, current) => previous[current], object)
}
