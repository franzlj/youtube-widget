// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: tv;

// YOUTUBE WIDGET
// Displays list of latest videos of favorite channels.

const dataModule = importModule('YouTube Data Module')
Date.prototype.addHours = function(h) {
  this.setTime(this.getTime() + (h*60*60*1000));
  return this;
}

// --------------------------------- Configuration ------------------------------------

// Columns the widget will lost videos in
const cols = config.widgetFamily == "extraLarge" ? 2 : 1

// Number of videos displayed per column
var numberOfVideos = {
	small: 1,
	medium: 2,
	large: 5,
	extraLarge: 5
}[config.widgetFamily] ?? 5

const widgetPadding = Device.isPhone() ? 12 : 16
const titleFontSize = Device.isPhone() ? 15 : 16
const captionFontSize = Device.isPhone() ? 12 : 14


// --------------------------------- Script Main ------------------------------------

let videos = await dataModule.loadFavoriteChannelVideos()
let widget = await createWidget(videos)

if (!config.runsInWidget) {
  await widget.presentLarge()
}

Script.setWidget(widget)

// --------------------------------- Widget Logic & Creation ------------------------------------
	
async function createWidget(videos) {
	var widget = new ListWidget()
	var refreshDate = new Date()
	refreshDate.addHours(2)
	widget.refreshAfterDate = refreshDate

	widget.setPadding(widgetPadding, widgetPadding, widgetPadding, widgetPadding)

	var gradient = new LinearGradient()
	gradient.colors = [
		new Color("#202020"),
		new Color("#202020"),
		new Color("#332221")
	]
	gradient.locations = [0, 0.33, 1]
	widget.backgroundGradient = gradient
	widget.spacing = widgetPadding
        
	let outerStack = widget.addStack()
	outerStack.layoutVertically()
	outerStack.spacing = 6
	
	let colsStack = outerStack.addStack()
	colsStack.layoutHorizontally()
	colsStack.spacing = widgetPadding
	
	for (var c = 0; c < cols; c += 1) {	let column = colsStack.addStack()
		column.layoutVertically()
		column.spacing = widgetPadding / 2
		
		for (var i = c * numberOfVideos; i < videos.slice(0, numberOfVideos * (c + 1)).length; i += 1) {
			let video = videos[i]
			let hStack = column.addStack()
			await videoElement(hStack, video)
		}
	}

	let dateStack = outerStack.addStack()
	dateStack.addSpacer()
	let datePrefix = dateStack.addText("Aktualisiert vor ")
	datePrefix.font = Font.mediumRoundedSystemFont(10)    
	datePrefix.textColor = Color.gray()
	let date = dateStack.addDate(new Date())
	date.applyRelativeStyle()    
	date.font = Font.mediumRoundedSystemFont(10)    
	date.textColor = Color.gray()
	dateStack.addSpacer()

	return widget
}

async function videoElement(hStack, video) {
	var date = new Date(video.publishedAt)
	let dateFormatter = new DateFormatter()
	dateFormatter.useShortTimeStyle()
	if (isDateToday(date)) {
		dateFormatter.useNoDateStyle()
	} else {
		dateFormatter.useShortDateStyle()
	}
	
	hStack.url = video.videoWatchUrl // Tapping will open it!
	console.log(video.videoWatchUrl)
	
	hStack.spacing = widgetPadding
	var thumb = hStack.addImage(await loadImage(video.thumbnailUrl))
	thumb.resizable = true    
    thumb.containerRelativeShape = true
	
	var vStack = hStack.addStack()
	vStack.layoutVertically()
	vStack.spacing = 2
	
	var title = vStack.addText(video.title)
	title.font = Font.boldRoundedSystemFont(titleFontSize)
	title.textColor = new Color("#FFFFFF")
	title.lineLimit = 2
	
	var subtitleStack = vStack.addStack()
	subtitleStack.layoutHorizontally()
	var channelNameText = subtitleStack.addText(video.channel + " - ")
	channelNameText.lineLimit = 1
	channelNameText.font = Font.mediumRoundedSystemFont(captionFontSize)
	channelNameText.textColor = new Color("#BBBBBB")
	
	var videoDate = subtitleStack.addText(
		(isDateToday(date) ? "Heute, " : "") + dateFormatter.string(date)
	)
	videoDate.lineLimit = 1
	videoDate.font = Font.mediumRoundedSystemFont(captionFontSize)
	videoDate.textColor = new Color("#BBBBBB")
}

async function loadImage(imageUrl) {
	let request = new Request(imageUrl)
	let image = request.loadImage()
	return image
}

function formatDateWithoutTime(date) {
	return date.getDate() + "." + date.getMonth() + "." + date.getFullYear()
}

function isDateToday(date) {	
	return formatDateWithoutTime(date) == formatDateWithoutTime(new Date())
}

function formatDate(date) {
	var dateStr = formatDateWithoutTime(date)
	if (dateStr == formatDateWithoutTime(new Date())) {
		dateStr = "Heute"
	}
	var timeStr = date.getHours() + ":" + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes())
	return dateStr + ", " + timeStr + " Uhr"
}