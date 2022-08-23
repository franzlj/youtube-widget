// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: tv;

// YOUTUBE TABKE
// Displays list of latest videos of favorite channels within Scriptable as a table

const dataModule = importModule('YouTube Data Module')

let table = new UITable()
table.showSeparators = true

let videos = await dataModule.loadFavoriteChannelVideos()

let dateFormatter = new DateFormatter()
dateFormatter.useShortDateStyle()
dateFormatter.useShortTimeStyle()

let rows = videos.map(video => {
	let date = new Date(video.publishedAt)
	let row = new UITableRow()
	let formattedDate = dateFormatter.string(date)

	let imageCell = UITableCell.imageAtURL(video.thumbnailUrl)
	imageCell.widthWeight = 30
	row.addCell(imageCell)

	let textCell = UITableCell.text(
		video.title,
		video.channel + " - " + formattedDate
	)

	textCell.titleFont = Font.mediumRoundedSystemFont(16)

	textCell.subtitleColor = Color.gray()

	textCell.widthWeight = 85

	row.addCell(textCell)

	row.onSelect = () => {
		Safari.open(video.videoWatchUrl)
	}

	row.dismissOnSelect = false
	row.cellSpacing = 12
	row.height = 72

	return row
})

for (i = 0; i < rows.length; i++) {
	table.addRow(rows[i])
}

table.present(false)