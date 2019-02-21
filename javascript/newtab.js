function addNewEntryButton(entryArray) {
	var newEntry = $('<div class="entry" id="new_entry" title="Add New"><div>&#43;</div></div>');
	newEntry.on("click", function() {
		showBookmarkEntryForm("New Bookmark or Folder", "", "", "new_entry");
	});
	entryArray.push(newEntry);
}

function addSpeedDialBookmark(bookmark, entryArray) {
	var entry = $('<div id="' + bookmark.id + '" class="entry">' +
				'<div class="title">' + bookmark.title + '</div>' +
				'<div class="icon"> <img src="chrome://favicon/'+bookmark.url+'"/> </div>' +
				'<div class="edit">&#9998;</div>' +
				'<div class="remove">&#735;</div>' +
				'</div>');

	entry.find(".title").on("click", function(event) {
		event.preventDefault();
		location.href = bookmark.url;
	});
	entry.find(".icon").on("click", function(event) {
		event.preventDefault();
		location.href = bookmark.url;
	});
	entry.find(".edit").on("click", function(event) {
		event.preventDefault();
		showBookmarkEntryForm("Edit Bookmark: " + bookmark.title, bookmark.title, bookmark.url, bookmark.id);
	});
	entry.find(".remove").on("click", function(event) {
		event.preventDefault();
		if (confirm("Are you sure you want to remove this bookmark?")) {
			removeBookmark(bookmark);
		}
	});

	$bg = JSON.parse(localStorage.getItem("custom_bg_data"))[bookmark.url];
	if ($bg) {
		entry.css("background", $bg);
	}

	entryArray.push(entry);
}

function addSpeedDialFolder(bookmark, entryArray) {
	var entry = $('<div class="entry" id="' + bookmark.id + '">' +
				'<div class="title">' + bookmark.title + '</div>' +
				'<div class="icon">&#128447;</div>' +
				'<div class="edit">&#9998;</div>' +
				'<div class="remove">&#735;</div>' +
				'</div>');

	entry.find(".title").on("click", function(event) {
		event.preventDefault();
		location.href = 'newtab.html#' + bookmark.id;
	});
	entry.find(".icon").on("click", function(event) {
		event.preventDefault();
		location.href = 'newtab.html#' + bookmark.id;
	});
	entry.find(".edit").on("click", function(event) {
		event.preventDefault();
		showBookmarkEntryForm("Edit Folder: " + bookmark.title, bookmark.title, bookmark.url, bookmark.id);
	});
	entry.find(".remove").on("click", function(event) {
		event.preventDefault();
		if (confirm("Are you sure you want to remove this folder including all of it's bookmarks?")) {
			removeFolder(bookmark.id);
		}
	});

	$bg = JSON.parse(localStorage.getItem("custom_bg_data"))[('folder#'+bookmark.id)];
	if ($bg) {
		entry.css("background", $bg);
	}

	entryArray.push(entry);
}

// Figures out how big the dial and its elements should be
// Needs to be called before the entries are inserted
function setDialStyles() {
	var dialColumns = localStorage.getItem("dial_columns");
	var dialWidth = localStorage.getItem("dial_width");
	var folderColor = localStorage.getItem("folder_color");
	var adjustedDialWidth = window.innerWidth * (dialWidth / 100);
	var borderWidth = 14;
	var minEntryWidth = 120 - borderWidth;
	var entryWidth = (adjustedDialWidth / dialColumns) - borderWidth;

	if (entryWidth < minEntryWidth) {
		entryWidth = minEntryWidth;
	}

	// Set the values through CSS, rather than explicit individual CSS styles
	// Height values are 3/4 or * 0.75 width values
	$("#styles").html(
		"#dial { width:" + (adjustedDialWidth | 0) + "px; } " +
		".entry { width:" + (entryWidth | 0) + "px; } " +
		".image { height:" + ((entryWidth * 0.75) - 20 | 0) + "px; } " +
		".foundicon-folder { font-size:" + (entryWidth * 0.5 | 0) + "px; top:" + (entryWidth * 0.05 | 0) + "px; color:" + folderColor + " } " +
		".foundicon-plus { font-size:" + (entryWidth * 0.3 | 0) + "px; top:" + (entryWidth * 0.18 | 0) + "px; } "
	);
}

// Retrieve the bookmarks bar node and use it to generate speed dials
function createSpeedDial(folderId) {
	setDialStyles();

	chrome.bookmarks.getSubTree(folderId, function(node) {
		// Loop over bookmarks in folder and add to the dial
		var entryArray = [];
		(node[0].children).forEach(function(bookmark) {
			if (bookmark.children !== undefined && localStorage.getItem("show_subfolder_icons") === "true") {
				addSpeedDialFolder(bookmark, entryArray);
			}
		});
		entryArray.push( $('<div style="background: #607D8B;height: 8px;margin: 12px 0;clear: both;">&nbsp;</div>') );
		(node[0].children).forEach(function(bookmark) {
			if (bookmark.url !== undefined) {
				addSpeedDialBookmark(bookmark, entryArray);
			}
		});


		// Adds the + button to the dom only if enabled
		if (localStorage.getItem("show_new_entry") === "true") {
			addNewEntryButton(entryArray);
		}

		// Batch add all the entries to the dial at once and set the folderId
		$("#dial").html(entryArray).prop("folderId", folderId);
		alignVertical();

		// Show the options gear icon only if enabled and doesn't already exist
		if (localStorage.getItem("show_options_gear") === "true" && $("#options").children().length === 0) {
			$("#options").append($('<a class="foundicon-settings" href="options.html" title="Options"></a>'));
		}

		if (localStorage.getItem("drag_and_drop") === "true") {
			$("#dial").sortable({
				items: ".entry:not(#new_entry)"
			}).on("sortupdate", function() {
				updateBookmarksOrder();
			});
		}
	});
}


function showBookmarkEntryForm(heading, title, url, target) {
	var form = $("#bookmark_form");
	form.find("h1").html(heading);
	form.find(".title").prop("value", title);
	// Must || "" .url and .icon fields when using .prop() to clear previously set input values
	form.find(".url").prop("value", url || "");
	//form.find(".icon").prop("value", JSON.parse(localStorage.getItem("custom_icon_data"))[url] || "");
	form.prop("target", target);

	// Selectors to hide URL & custom icon fields when editing a folder name
	if (form.find("h1").text().indexOf("Edit Folder") > -1) {
		form.find("p").eq(1).hide();
		//form.find("p").eq(2).hide();
	}
	// Selectors to hide the cusom icon field when adding a new entry
	// if (form.find("h1").text().indexOf("New") > -1) {
	// 	form.find("p").eq(2).hide();
	// }

	form.reveal();
	form.find(".title").focus();
	form.on("reveal:close", function() {
		form.find("p").show();
	});
}


function updateBackgroundColor( url, deleteit ) {
	var bg_object = JSON.parse(localStorage.getItem("custom_bg_data"));
	if (deleteit) {
		delete bg_object[url];
	}
	else {
		var bg = $("#bookmark_form #background_color").prop("value");
		bg_object[url] = bg;
	}
	localStorage.setItem("custom_bg_data", JSON.stringify(bg_object));
	if (localStorage.getItem("enable_sync") === "true") {
		syncToStorage();
	}
	createSpeedDial(getStartingFolder());
}

// function updateCustomIcon(url, old_url) {
// 	var icon_object = JSON.parse(localStorage.getItem("custom_icon_data"));
// 	var icon_url = $("#bookmark_form .icon").prop("value").trim();

// 	icon_object[url] = icon_url;

// 	if (url !== old_url) {
// 		delete icon_object[old_url];
// 	} // Makes sure thumbnail URL changes along with the bookmark

// 	if (icon_url.length === 0 || url.trim().length === 0) {
// 		delete icon_object[url];
// 		delete icon_object[old_url];
// 	} // Cleans out any empty entries from localStorage

// 	localStorage.setItem("custom_icon_data", JSON.stringify(icon_object));
// 	if (localStorage.getItem("enable_sync") === "true") {
// 		syncToStorage();
// 	}
// 	createSpeedDial(getStartingFolder());
// }

function alignVertical() {
	if (localStorage.getItem("center_vertically") === "true") {
		var dial = $("#dial");
		if (localStorage.getItem("show_folder_list") === "true") {
			dial.css("padding-top", ((window.innerHeight - dial.height()) / 2) - 50 | 0);
		} else {
			dial.css("padding-top", (window.innerHeight - dial.height()) / 2 | 0);
		}
	}
}

document.addEventListener("DOMContentLoaded", function() {
	initialize();
	createSpeedDial(getStartingFolder());

	$("#bookmark_form .title, #bookmark_form .url, #bookmark_form .icon").on("keydown", function(e) {
		if (e.which === 13) { // 13 is the character code of the return key
			$("#bookmark_form button").trigger("click");
		}
	});

	$("#bookmark_form button").on("click", function() {
		var target = $("#bookmark_form").prop("target");
		var title = $("#bookmark_form .title").prop("value").trim();
		var url = $("#bookmark_form .url").prop("value").trim();

		if (target === "new_entry") {
			addBookmark(title, url);
		} else {
			updateBookmark(target, title, url);
		}
	});

	// Navigates to the entry corresponding to the single digit number between 1-9
	$(document.body).on("keypress", function(e) {
		// Prevents navigation while typing numbers in #bookmark_form input fields
		if (document.activeElement.type !== "text") {
			var key = String.fromCharCode(e.which);
			if (key >= 1 && key <= 9) {
				if ($(".bookmark").eq(key - 1).length !== 0) {
					window.location = $(".bookmark").get(key - 1).href;
				}
			}
			// Navigates to options page when letter "o" is pressed.
			if (key === "o" || key === "s") {
				window.location = "options.html";
			}
		}
	});

	$(window).on("resize", function() {
		setDialStyles();
		alignVertical();
	});

	// Change the current dial if the page hash changes
	$(window).on("hashchange", function() {
		createSpeedDial(getStartingFolder());
	});

	// Load the .css that refrences the .woff font file asynchronously in an ajax request, halves render speed of dial
	$.get().done(function() {
		$("#foundicons").prop("href", "css/general_foundicons.css");
	});
});
