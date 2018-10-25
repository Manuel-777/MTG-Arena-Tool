var electron = require('electron');
var desktopCapturer = electron.desktopCapturer;
var shell = electron.shell;
window.ipc = electron.ipcRenderer;
var decks = null;
var changes = null;
var matchesHistory = [];
var economyHistory = [];
var eventsHistory = [];

var explore = null;
var cards = {};
var cardsNew = {};
var settings = null;
var updateState =  {state: -1, available: false, progress: 0, speed: 0};
var sidebarActive = -1;
var arenaRunning = false;
var renderer = 0;
var collectionPage = 0;
var eventFilters = null;
var sortingAlgorithm = 'Set';
var filterEvent = 'All';
var filteredSets = [];
var filteredMana = [];
var draftPosition = 1;
var overlayAlpha = 1;
var cardSizePos = 4;
var cardSize = 140;
var cardQuality = "normal";
var inputTimer = undefined;
var loadHistory = 0;
var loadEvents = 0;
var defaultBackground = "";
var currentOpenDeck = null;
var lastSettingsSection = 1;
var serverStatus = undefined;
var loggedIn = false;

var rankOffset = 0;
var rankTitle = "";
var userName = ""

// ** FOR REMOVAL **
var goldHistory = null;
var gemsHistory = null;
var wildcardHistory = null;
//

const chartjs = require('chart.js');
const Database = require('../shared/database.js');
const cardsDb = new Database();

const sha1 = require('js-sha1');
const fs = require("fs");

var mana = {0: "", 1: "white", 2: "blue", 3: "black", 4: "red", 5: "green", 6: "colorless", 7: "", 8: "x"}

ipc_send = function (method, arg) {
    ipc.send('ipc_switch', method, arg);
};

//document.addEventListener('DOMContentLoaded', windowReady);

//function windowReady(){
//	ipc_send('renderer_state', 1);
//}

window.onerror = (err) => {
    ipc_send("ipc_log", "Error: "+err);
}

process.on('uncaughtException', (err) => {
    ipc_send("ipc_log", "Exception: "+err);
})

//
ipc.on('auth', function (event, arg) {
	if (arg.ok) {
		$('.message_center').css('display', 'flex');
		$('.authenticate').hide();
		loggedIn = true;
	}
	else {
		pop(arg.error, -1);
	}
});

//
ipc.on('set_db', function (event, arg) {
	setsList = arg.sets;
	eventsList = arg.events;
	delete arg.sets;
	delete arg.events;
	cardsDb.set(arg);
});

//
ipc.on('set_username', function (event, arg) {
	userName = arg;
	if (sidebarActive != -1) {
		$('.top_username').html(userName.slice(0, -6));
		$('.top_username_id').html(userName.slice(-6));
	}
});

//
ipc.on('set_rank', function (event, offset, rank) {
	rankOffset = offset;
	rankTitle = rank;
	if (sidebarActive != -1) {
		$(".top_rank").css("background-position", (rankOffset*-48)+"px 0px").attr("title", rankTitle);
	}
});

//
ipc.on('set_decks', function (event, arg) {
    try {
        arg = JSON.parse(arg)
    } catch(e) {
        console.log("Error parsing JSON:", arg);
        return false;
    }
	setDecks(arg);
});

//
ipc.on('set_deck_updated', function (event, str) {
    try {
        deck = JSON.parse(str);
    } catch(e) {
        console.log("Error parsing JSON:", str);
        return false;
    }
	
});

//
ipc.on('set_history', function (event, arg) {
	if (arg != null) {
	    try {
	        matchesHistory = JSON.parse(arg);
	    } catch(e) {
	        console.log("Error parsing JSON:", str);
	        return false;
	    }
	}
	
	setHistory(0);
});

//
ipc.on('set_history_data', function (event, arg) {
	if (arg != null) {
		matchesHistory = JSON.parse(arg);
	}
});

//
ipc.on('set_events', function (event, arg) {
	if (arg != null) {
	    try {
	        eventsHistory = JSON.parse(arg);
	    } catch(e) {
	        console.log("Error parsing JSON:", str);
	        return false;
	    }
	}

	setEvents(0);
});


ipc.on('set_economy', function (event, arg) {
	if (arg != null) {
	    try {
	        economyHistory = JSON.parse(arg);
	    } catch(e) {
	        console.log("Error parsing JSON:", str);
	        return false;
	    }
	}

	setEconomy(0);
});

//
ipc.on('set_deck_changes', function (event, arg) {
	if (arg != null) {
	    try {
	        changes = JSON.parse(arg);
	        console.log(changes);
	    } catch(e) {
	        console.log("Error parsing JSON:", str);
	        return false;
	    }
	}

	if (changes != null) {
		setChangesTimeline();
	}
});

//
ipc.on('set_cards', function (event, _cards, _cardsnew) {
	cards = _cards;
	cardsNew = _cardsnew;
});

//
ipc.on('set_status', function (event, arg) {
	var mainStatus = 0;
	var sp = $('<span>'+arg.status.description+'</span>');
	sp.css('text-align', 'center');
	sp.css('margin-bottom', '4px');
	$('.top_status_pop').append(sp);
	arg.components.forEach(function(comp) {
		var div = $('<div class="status_item"></div>');
		var st = $('<div class="top_status"></div>');
		div.append('<span>'+comp.name+':</span>');
		var sp = $('<span></span>');
		if (comp.status == 'operational') {
			st.addClass('status_green');
			sp.html('Operational');
		}
		else if (comp.status == 'degraded_performance') {
			st.addClass('status_yellow');
			if (mainStatus > 1) mainStatus = 1;
			sp.html('Degraded performance');
		}
		else if (comp.status == 'major_outage') {
			st.addClass('status_red');
			if (mainStatus > 2) mainStatus = 2;
			sp.html('Major outage');
		}
		else if (comp.status == 'partial_outage') {
			st.addClass('status_yellow');
			if (mainStatus > 1) mainStatus = 1;
			sp.html('Partial outage');
		}
		else if (comp.status == 'under_maintenance') {
			st.addClass('status_yellow');
			if (mainStatus > 1) mainStatus = 1;
			sp.html('Under maintenance');
		}
		else {
			st.addClass('status_yellow');
			if (mainStatus > 1) mainStatus = 1;
			sp.html(comp.status);
		}
		sp.css('margin-left', 'auto');
		sp.appendTo(div);
		st.appendTo(div);
		div.appendTo($('.top_status_pop'));
	});

	if (mainStatus == 0) {
		$('.top_status').addClass('status_green');
	}
	if (mainStatus == 1) {
		$('.top_status').addClass('status_yellow');
	}
	if (mainStatus == 2) {
		$('.top_status').addClass('status_red');
	}

	$('.top_status').on('mouseenter', function(e) {
		$('.top_status_pop').css("opacity", 1);
	});
	$('.top_status').on('mouseleave', function(e) {
		$('.top_status_pop').css("opacity", 0);
	});
});

//
ipc.on('set_explore', function (event, arg) {
	if (sidebarActive == 3) {
		arg.sort(compare_explore);
		setExplore(arg, 0);
	}
});

//
ipc.on('open_course_deck', function (event, arg) {
	$('.moving_ux').animate({'left': '-100%'}, 250, 'easeInOutCubic');
	arg = arg.CourseDeck;
	arg.colors = get_deck_colors(arg);
	arg.mainDeck.sort(compare_cards);
	arg.sideboard.sort(compare_cards);
	console.log(arg);
	open_deck(arg, 1);
});

//
ipc.on('set_settings', function (event, arg) {
	console.log(arg);
	settings = arg;
	cardSizePos = settings.cards_size;
	overlayAlpha = settings.overlay_alpha;
    if (settings.cards_quality != undefined) {
        cardQuality = settings.cards_quality;
    }
    if (settings.back_color == undefined) {
        settings.back_color = 'rgba(0,0,0,0.3)';
    }
    if (settings.back_url == undefined) {
        back_url = "";
    }
    else {
        defaultBackground = settings.back_url;
    }
    $('.main_wrapper').css('background-color', settings.back_color);
    change_background("default");
	cardSize = 100+(cardSizePos*10);
});

//
ipc.on('set_update', function (event, arg) {
	updateState = arg;

	if (sidebarActive == 9) {
		open_settings(5);
	}
});

//
ipc.on('show_notification', function (event, arg) {
    $('.notification').show();
    $('.notification').attr("title", arg);

    if (arg == "Update available" || arg == "Update downloaded") {
	    $('.notification').click(function() {
	        force_open_about();
	    });
	}
});

//
ipc.on('hide_notification', function (event, arg) {
    $('.notification').hide();
    $('.notification').attr("title", "");
});

//
ipc.on('force_open_settings', function (event, arg) {
	force_open_settings();
});

//
ipc.on('force_open_about', function (event, arg) {
	force_open_about();
});

// ** FOR REMOVAL **
/*
ipc.on('set_economy', function (event, arg) {
	goldHistory = arg.gold;
	gemsHistory = arg.gems;
	wildcardHistory = arg.wildcards;
	open = arg.open;
	if (open) {
		open_economy();
	}
});
*/

//
ipc.on('init_login', function (event, arg) {
	$('.authenticate').show();
	$('.message_center').css('display', 'none');
	$('.init_loading').hide();
});

//
ipc.on('set_remember', function (event, arg) {
	if (arg != "") {
        document.getElementById("rememberme").checked = true;
		document.getElementById("signin_user").value = arg;
		document.getElementById("signin_pass").value = "********";
	}
	else {
        document.getElementById("rememberme").checked = false;
	}
});

//
function rememberMe() {
	ipc_send("remember", document.getElementById("rememberme").checked);
}

//
ipc.on('initialize', function (event, arg) {
	$('.top_username').html(userName.slice(0, -6));
	$('.top_username_id').html(userName.slice(-6));

	$(".top_rank").css("background-position", (rankOffset*-48)+"px 0px").attr("title", rankTitle);
	sidebarActive = 0;
	setDecks(null);
	$('.top_nav').removeClass('hidden');
	$('.overflow_ux').removeClass('hidden');
	$('.message_center').css('display', 'none');
	$('.init_loading').hide();
});

//
ipc.on('no_log', function (event, arg) {
	if (loggedIn) {
		$('.top_nav').addClass('hidden');
		$('.overflow_ux').addClass('hidden');
		$('.message_center').css('display', 'flex');
		$('.message_center').html('<div class="message_big red">No Log Found</div><div class="message_sub_16 white">check if it exists at '+arg+'</div><div class="message_sub_16 white">if it does, try closing MTG Arena and deleting it.</div>');
	}
});

//
ipc.on('offline', function (event, arg) {
	document.body.style.cursor = "auto";
	$('#ux_0').html('<div class="message_center" style="display: flex; position: fixed;"><div class="message_unlink"></div><div class="message_big red">Oops, you are offline!</div><div class="message_sub_16 white">You can <a class="signup_link">sign up</a> to access online features.</div></div>');
	$(".signup_link").click(function() {
		shell.openExternal('https://mtgatool.com/signup/');
	});
});

//
ipc.on('log_read', function (event, arg) {
	if ($('.top_nav').hasClass('hidden')) {
		$('.top_nav').removeClass('hidden');
		$('.overflow_ux').removeClass('hidden');
		$('.message_center').css('display', 'none');
	}
});


$(".list_deck").on('mouseenter mouseleave', function(e) {
    $(".deck_tile").trigger(e.type);
});


//
ipc.on('popup', function (event, arg, time) {
	pop(arg, time);
});

var popTimeout = null;
function pop(str, timeout) {
    $('.popup').css("opacity", 1);
    $('.popup').html(str);
    if (popTimeout != null) {
	    clearTimeout(popTimeout);
    }
    if (timeout < 1) {
    	popTimeout = null;
    }
    else {
	    popTimeout = setTimeout(function() {
	    	$('.popup').css("opacity", 0);
	    	popTimeout = null;
	    }, timeout);
    }
}

//
function installUpdate() {
	ipc_send('renderer_update_install', 1);
}

function force_open_settings() {
	sidebarActive = 6;
	$(".top_nav_item").each(function(index) {
		$(this).removeClass("item_selected");
		if ($(this).hasClass("it6")) {
			$(this).addClass("item_selected");
		}
	});
	$('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 
	open_settings(lastSettingsSection);
}

function force_open_about() {
	sidebarActive = 9;
	$(".top_nav_item").each(function(index) {
		$(this).removeClass("item_selected");
		if ($(this).hasClass("it7")) {
			$(this).addClass("item_selected");
		}
	});
	$('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 
	open_settings(5);
}

function arenaCheckLoop() {
	if (!arenaRunning) {
		console.log("Arena is NOT running")
		$('.top_nav').addClass('hidden');
		$('.overflow_ux').addClass('hidden');
		$('.message_center').css('display', 'flex');
		$('.message_center').html('<div class="message_big red">Open MTG Arena</div><div class="message_sub white">...</div>');
	}
	else {
		console.log("Arena is running")
		$('.top_nav').removeClass('hidden');
		$('.overflow_ux').removeClass('hidden');
		$('.message_center').css('display', 'none');
	}

	isArenaRunning();
	setTimeout( function() {
		arenaCheckLoop();
	}, 100);
}

function isArenaRunning() {
	// This is not quite working as expected
    desktopCapturer.getSources({
        types: ['window', 'screen']
    }, (error, sources) => {
        if (error) throw error
		arenaRunning = false;
        for (let i = 0; i < sources.length; ++i) {
        	// sometimes arena does not show up here
        	console.log(sources[i].name);
            if (sources[i].name.indexOf('MTGA') !== -1) {
            	arenaRunning = true;
            }
        }
    });
}

$(document).ready(function() {
	//document.getElementById("rememberme").checked = false;

	$(".signup_link").click(function() {
		shell.openExternal('https://mtgatool.com/signup/');
	});

	$(".offline_link").click(function() {
		ipc_send("login", {username: '', password: ''});
	    $('.unlink').show();
	});

	$(".login_link").click(function() {
		var user = document.getElementById("signin_user").value;
		var pass = document.getElementById("signin_pass").value;
		if (pass != "********") {
			pass = sha1(pass);
		}
		ipc_send("login", {username: user, password: pass});
	});

	//
	$(".close").click(function () {
	    ipc_send('renderer_window_close', 1);
	});

	//
	$(".minimize").click(function () {
	    ipc_send('renderer_window_minimize', 1);
	});

	//
	$(".settings").click(function () {
		force_open_settings();
	});

	//
	$(".top_nav_item").click(function () {
		$("#ux_0").off();
		$("#history_column").off();
        change_background("default");
		if (!$(this).hasClass("item_selected")) {
			$('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 

			$(".top_nav_item").each(function(index) {
				$(this).removeClass("item_selected");
			});

			$(this).addClass("item_selected");

			if ($(this).hasClass("it0")) {
				sidebarActive = 0;
				setDecks(null);
			}
			if ($(this).hasClass("it1")) {
				sidebarActive = 1;
				$("#ux_0").html('');
				ipc_send('renderer_request_history', 1);
			}
			if ($(this).hasClass("it2")) {
				sidebarActive = 2;
				$("#ux_0").html('');
				ipc_send('request_events', 1);
			}
			if ($(this).hasClass("it3")) {
				sidebarActive = 3;
				$("#ux_0").html('<div class="loading_bar ux_loading"><div class="loading_color loading_w"></div><div class="loading_color loading_u"></div><div class="loading_color loading_b"></div><div class="loading_color loading_r"></div><div class="loading_color loading_g"></div></div>');
				document.body.style.cursor = "progress";
				ipc_send('renderer_request_explore', filterEvent);
			}
			if ($(this).hasClass("it4")) {
				sidebarActive = 4;
				ipc_send('request_economy', 1);
				//open_economy_ipc();
			}
			if ($(this).hasClass("it5")) {
				sidebarActive = 5;
				open_cards();
			}
			if ($(this).hasClass("it6")) {
				sidebarActive = 6;
				open_settings(lastSettingsSection);
			}
		}
		else {
			$('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 
		}
	});
});

// ** FOR REMOVAL **
function open_economy_ipc() {
	ipc_send('renderer_get_economy', 1);
}

var daysago = 0;
var dayList = [];

class economyDay {
	constructor(goldEarned = 0, gemsEarned = 0, goldSpent = 0, gemsSpent = 0) {
		this.goldEarned = goldEarned;
		this.gemsEarned = gemsEarned;
		this.goldSpent = goldSpent;
		this.gemsSpent = gemsSpent;
	}
}

//
function setEconomy(loadMore) {
	var mainDiv = document.getElementById("ux_0");
	if (loadMore > 0) {
	}
	else {
		loadMore = 25;
		daysago = 0;
		dayList = [];
		dayList[0] = new economyDay();
		economyHistory.changes.sort(compare_economy); 
		
		for (var n = 0; n < economyHistory.changes.length; n++) {
			var economy_id = economyHistory.changes[n];
			var change = economyHistory[economy_id];
			if (change == undefined) continue;

			if (change.delta.gemsDelta != undefined) {
				if (change.delta.gemsDelta > 0)
					dayList[daysago].gemsEarned += change.delta.gemsDelta;
				else 
					dayList[daysago].gemsSpent  += Math.abs(change.delta.gemsDelta);
			}
			if (change.delta.goldDelta != undefined) {
				if (change.delta.goldDelta > 0)
					dayList[daysago].goldEarned += change.delta.goldDelta;
				else 
					dayList[daysago].goldSpent  += Math.abs(change.delta.goldDelta);
			}
			
			if (daysago != daysPast(change.date)) {
				daysago = daysPast(change.date);
				dayList[daysago] = new economyDay();
			}
		}
		
		mainDiv.classList.remove("flex_item");
		mainDiv.innerHTML = "";

		var d = document.createElement("div");
		d.classList.add("list_fill");
		mainDiv.appendChild(d);

		loadEconomy = 0;
		daysago = -1;
	}

	console.log("Load more: ", loadEconomy, loadMore, loadEconomy+loadMore);
	for (var loadEnd = loadEconomy + loadMore; loadEconomy < loadEnd; loadEconomy++) {
		var economy_id = economyHistory.changes[loadEconomy];
		var change = economyHistory[economy_id];

		if (change == undefined) continue;

		if (daysago != daysPast(change.date)) {
			daysago = daysPast(change.date);
			let dd = new Date(change.date);
			let div = document.createElement("div");
			div.classList.add("economy_title");
			div.classList.add("flex_item");

			let fll = document.createElement("div");
			fll.classList.add("economy_sub");
			div.classList.add("flex_item");
			fll.style.lineHeight = "64px";
			if (daysago == 0) 	fll.innerHTML =  "Today";
			if (daysago == 1) 	fll.innerHTML =  "Yesterday";
			if (daysago > 1) 	fll.innerHTML =  daysago+" Days ago. ("+dd.toDateString()+")";

			let flr = document.createElement("div");
			flr.classList.add("economy_day_stats");
			flr.classList.add("flex_item");

			let icgo = document.createElement("div");
			icgo.classList.add("economy_gold_med");
			icgo.title = "Gold";

			let icge = document.createElement("div");
			icge.classList.add("economy_gems_med");
			icge.style.marginLeft = "24px";
			icge.title = "Gems";

			let up = document.createElement("div");
			up.classList.add("economy_up");

			let down = document.createElement("div");
			down.classList.add("economy_down");

			let tx = document.createElement("div");
			tx.style.lineHeight = "64px";
			tx.classList.add("economy_sub");

			flr.appendChild(icgo);
			flr.appendChild(up);
			tx.innerHTML = dayList[daysago].goldEarned;
			flr.appendChild(tx);
			
			flr.appendChild(down);
			let ntx = tx.cloneNode(true);
			ntx.innerHTML = dayList[daysago].goldSpent;
			flr.appendChild(ntx);
			
			flr.appendChild(icge);
			flr.appendChild(up.cloneNode(true));
			ntx = tx.cloneNode(true);
			ntx.innerHTML = dayList[daysago].gemsEarned;
			flr.appendChild(ntx);
			
			flr.appendChild(down.cloneNode(true));
			ntx = tx.cloneNode(true);
			ntx.innerHTML = dayList[daysago].gemsSpent;
			flr.appendChild(ntx);
			
			div.appendChild(fll);
			div.appendChild(flr);
			mainDiv.appendChild(div);
		}

		var div = document.createElement("div");
		div.classList.add(economy_id);
		div.classList.add("list_economy");

		var fll = document.createElement("div");
		fll.classList.add("flex_item");
		fll.style.flexDirection = "column";

		var flt = document.createElement("div");
		flt.classList.add("flex_top");
		flt.classList.add("economy_sub");
		flt.style.lineHeight = "32px";
		flt.innerHTML = change.context;

		var flb = document.createElement("div");
		flb.classList.add("flex_bottom");

		var flr = document.createElement("div");
		flr.classList.add("flex_item");
		flr.style.marginRight = "24px";

		checkGemsPaid = false;
		checkGoldPaid = false;
		checkCardsAdded = false;
		checkBoosterAdded = false;
		checkWildcardsAdded = false;
		checkGemsEarnt = false;
		checkGoldEarnt = false;

		if (change.context == "Booster Open") {
			change.delta.boosterDelta.forEach(function(booster) {
				var set = get_colation_set(booster.collationId);

				var bos = document.createElement("div");
				bos.classList.add("set_logo");
				bos.style.backgroundImage = 'url(../images/sets/'+setsList[set].code+'.png)';
				bos.title = set;

				var bon = document.createElement("div");
				bon.style.lineHeight = "32px";
				bon.classList.add("economy_sub");

				bon.innerHTML = "x"+Math.abs(booster.count);

				flb.appendChild(bos);
				flb.appendChild(bon);
			});

			checkWildcardsAdded = true;
			checkCardsAdded = true;
			// Draw set logo below title
			// Draw small cards images on the right
		}
		else if (change.context == "Store") {
			checkGemsPaid = true;
			checkGoldPaid = true;
			checkBoosterAdded = true;
			checkCardsAdded = true;
			// Draw gold or gems + ammount spent below title
			// Draw obtained goods on the right
		}
		else if (change.context == "Redeem Wilcard") {
			var imgUri = "";
			if (change.delta.wcCommonDelta != undefined)	imgUri = "wc_common";
			if (change.delta.wcUncommonDelta != undefined)	imgUri = "wc_uncommon";
			if (change.delta.wcRareDelta != undefined)		imgUri = "wc_rare";
			if (change.delta.wcMythicDelta != undefined)	imgUri = "wc_mythic";
			if (imgUri != "") {
				var bos = document.createElement("div");
				bos.classList.add("economy_wc");
				bos.style.backgroundImage = 'url(../images/'+imgUri+'.png)';

				flb.appendChild(bos);
			}

			checkCardsAdded = true;
			// Draw wildcard spent below title
			// Draw card redeemed on the right
		}
		else {
			checkGemsEarnt = true;
			checkGoldEarnt = true;
			checkBoosterAdded = true;
			checkCardsAdded = true;
			checkWildcardsAdded = true;
		}

		if (checkGemsPaid && change.delta.gemsDelta != undefined) {
			var bos = document.createElement("div");
			bos.classList.add("economy_gems");
			bos.title = "Gems";

			var bon = document.createElement("div");
			bon.style.lineHeight = "32px";
			bon.classList.add("economy_sub");
			bon.innerHTML = Math.abs(change.delta.gemsDelta);

			flb.appendChild(bos);
			flb.appendChild(bon);
		}

		if (checkGoldPaid && change.delta.goldDelta != undefined) {
			var bos = document.createElement("div");
			bos.classList.add("economy_gold");
			bos.title = "Gold";

			var bon = document.createElement("div");
			bon.style.lineHeight = "32px";
			bon.classList.add("economy_sub");
			bon.innerHTML = Math.abs(change.delta.goldDelta);

			flb.appendChild(bos);
			flb.appendChild(bon);
		}

		if (checkGemsEarnt && change.delta.gemsDelta != undefined) {
			var bos = document.createElement("div");
			bos.classList.add("economy_gems_med");
			bos.title = "Gems";

			var bon = document.createElement("div");
			bon.style.lineHeight = "64px";
			bon.classList.add("economy_sub");
			bon.innerHTML = Math.abs(change.delta.gemsDelta);

			flr.appendChild(bos);
			flr.appendChild(bon);
		}

		if (checkGoldEarnt && change.delta.goldDelta != undefined) {
			var bos = document.createElement("div");
			bos.classList.add("economy_gold_med");
			bos.title = "Gold";

			var bon = document.createElement("div");
			bon.style.lineHeight = "64px";
			bon.classList.add("economy_sub");
			bon.innerHTML = Math.abs(change.delta.goldDelta);

			flr.appendChild(bos);
			flr.appendChild(bon);
		}

		if (checkBoosterAdded && change.delta.boosterDelta != undefined) {
			change.delta.boosterDelta.forEach(function(booster) {
				var set = get_colation_set(booster.collationId);

				var bos = document.createElement("div");
				bos.classList.add("set_logo_med");
				bos.style.backgroundImage = 'url(../images/sets/'+setsList[set].code+'.png)';
				bos.title = set;

				var bon = document.createElement("div");
				bon.style.lineHeight = "64px";
				bon.classList.add("economy_sub");
				bon.innerHTML = "x"+Math.abs(booster.count);

				flr.appendChild(bos);
				flr.appendChild(bon);
			});
		}

		if (checkWildcardsAdded) {
			if (change.delta.wcCommonDelta != undefined) {
				var bos = document.createElement("div");
				bos.classList.add("economy_wc");
				bos.title = 'Common Wildcard';
				bos.style.margin = 'auto 4px';
				bos.style.backgroundImage = 'url(../images/wc_common.png)';
				var bon = document.createElement("div");
				bon.style.lineHeight = "64px";
				bon.classList.add("economy_sub");
				bon.innerHTML = "x"+Math.abs(change.delta.wcCommonDelta);
				flr.appendChild(bos);
				flr.appendChild(bon);
			}

			if (change.delta.wcUncommonDelta != undefined) {
				var bos = document.createElement("div");
				bos.classList.add("economy_wc");
				bos.title = 'Uncommon Wildcard';
				bos.style.margin = 'auto 4px';
				bos.style.backgroundImage = 'url(../images/wc_uncommon.png)';
				var bon = document.createElement("div");
				bon.style.lineHeight = "64px";
				bon.classList.add("economy_sub");
				bon.innerHTML = "x"+Math.abs(change.delta.wcUncommonDelta);
				flr.appendChild(bos);
				flr.appendChild(bon);
			}

			if (change.delta.wcRareDelta != undefined) {
				var bos = document.createElement("div");
				bos.classList.add("economy_wc");
				bos.title = 'Rare Wildcard';
				bos.title = 'Common Wildcard';
				bos.style.margin = 'auto 4px';
				bos.style.backgroundImage = 'url(../images/wc_rare.png)';
				var bon = document.createElement("div");
				bon.style.lineHeight = "64px";
				bon.classList.add("economy_sub");
				bon.innerHTML = "x"+Math.abs(change.delta.wcRareDelta);
				flr.appendChild(bos);
				flr.appendChild(bon);
			}
			if (change.delta.wcMythicDelta != undefined) {
				var bos = document.createElement("div");
				bos.classList.add("economy_wc");
				bos.title = 'Mythic Wildcard';
				bos.style.margin = 'auto 4px';
				bos.style.backgroundImage = 'url(../images/wc_mythic.png)';
				var bon = document.createElement("div");
				bon.style.lineHeight = "64px";
				bon.classList.add("economy_sub");
				bon.innerHTML = "x"+Math.abs(change.delta.wcMythicDelta);
				flr.appendChild(bos);
				flr.appendChild(bon);
			}
		}

		if (checkCardsAdded && change.delta.cardsAdded != undefined) {
			change.delta.cardsAdded.forEach(function(grpId) {
				var card = cardsDb.get(grpId);

				var d = document.createElement("div");
				d.classList.add("inventory_card");
				d.style.width = "39px";

				var img = document.createElement("img");
				img.classList.add("inventory_card_img");
				img.style.width = "39px";
				img.src = "https://img.scryfall.com/cards"+card.images[cardQuality];

				d.appendChild(img);
				flr.appendChild(d);

				var imgDom = $(img);
				addCardHover(imgDom, card);

				imgDom.on('click', function(e) {
					if (cardsDb.get(grpId).dfc == 'SplitHalf')	{
						card = cardsDb.get(card.dfcId);
					}
					let newname = card.name.split(' ').join('-');

					shell.openExternal('https://scryfall.com/card/'+get_set_scryfall(card.set)+'/'+card.cid+'/'+card.name);
				});				
			});
		}

		fll.appendChild(flt);
		fll.appendChild(flb);
		div.appendChild(fll);
		div.appendChild(flr);

		mainDiv.appendChild(div);

	}

	$(this).off();
	$("#ux_0").on('scroll', function() {
		if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
			setEconomy(20);
		}
	})

	loadEconomy = loadEnd;
}

//
function setEvents(loadMore) {
	var mainDiv = document.getElementById("ux_0");
	if (loadMore > 0) {
	}
	else {
		loadMore = 25;
		eventsHistory.courses.sort(compare_courses); 

		mainDiv.classList.remove("flex_item");
		mainDiv.innerHTML = '';

		var d = document.createElement("div");
		d.classList.add("list_fill");
		mainDiv.appendChild(d);

		loadEvents = 0;
	}

	console.log("Load more: ", loadEvents, loadMore, loadEvents+loadMore);
	for (var loadEnd = loadEvents + loadMore; loadEvents < loadEnd; loadEvents++) {
		var course_id = eventsHistory.courses[loadEvents];
		var course = eventsHistory[course_id];

		if (course == undefined) continue;

		var div = document.createElement("div");
		div.classList.add(course.id);
		div.classList.add("list_match");

		var fltl = document.createElement("div");
		fltl.classList.add("flex_item");

		var fll = document.createElement("div");
		fll.classList.add("flex_item");
		fll.style.flexDirection = "column";

		var flt = document.createElement("div");
		flt.classList.add("flex_top");
		fll.appendChild(flt);

		var flb = document.createElement("div");
		flb.classList.add("flex_bottom");
		fll.appendChild(flb);

		var flc = document.createElement("div");
		flc.classList.add("flex_item");
		flc.style.flexDirection = "column";
		flc.style.flexGrow = 2;

		var fct = document.createElement("div");
		fct.classList.add("flex_top");
		flc.appendChild(fct);

		var fcb = document.createElement("div");
		fcb.classList.add("flex_bottom");
		fcb.style.marginRight = "14px";
		flc.appendChild(fcb);

		var flr = document.createElement("div");
		flr.classList.add("flex_item");

		var tileGrpid = course.CourseDeck.deckTileId;
		if (!cardsDb.get(tileGrpid)) {
			tileGrpid = 67003;
		}

		var tile = document.createElement("div");
		tile.classList.add(course.id+"t");
		tile.classList.add("deck_tile");

		tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";
		fltl.appendChild(tile);

		var d = document.createElement("div");
		d.classList.add("list_deck_name");
		d.innerHTML = getReadableEvent(course.InternalEventName);
		flt.appendChild(d);

		course.CourseDeck.colors.forEach(function(color) {
			var m = document.createElement("div");
			m.classList.add("mana_s20");
			m.classList.add("mana_"+mana[color]);
			flb.appendChild(m);
		});

		var d = document.createElement("div");
		if (course.CurrentEventState == "DoneWithMatches") {
			d.innerHTML = "Completed";
			d.classList.add("list_event_phase");
		}
		else {
			d.innerHTML = "In progress";
			d.classList.add("list_event_phase_red");
		}
		fct.appendChild(d);

		var d = document.createElement("div");
		d.classList.add("list_match_time");
		d.innerHTML = timeSince(new Date(course.date))+' ago.';
		fcb.appendChild(d);

		var wlGate = course.ModuleInstanceData.WinLossGate;

		if (wlGate.MaxWins == wlGate.CurrentWins) {
			var d = document.createElement("div");
			d.classList.add("list_match_result_win");
			d.innerHTML = wlGate.CurrentWins +":"+wlGate.CurrentLosses;
			flr.appendChild(d);
		}
		else {
			var d = document.createElement("div");
			d.classList.add("list_match_result_loss");
			d.innerHTML = wlGate.CurrentWins +":"+wlGate.CurrentLosses;
			flr.appendChild(d);
		}

		var divExp = document.createElement("div");
		divExp.classList.add(course.id+"exp");
		divExp.classList.add("list_event_expand");

		div.appendChild(fltl);
		div.appendChild(fll);
		div.appendChild(flc);
		div.appendChild(flr);

		mainDiv.appendChild(div);
		mainDiv.appendChild(divExp);
		
		addHover(course, divExp);
	}

	$(this).off();
	$("#ux_0").on('scroll', function() {
		if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
			setEvents(20);
		}
	})

	loadEvents = loadEnd;
}

//
function expandEvent(_course, expandDiv) {
	if (expandDiv.hasAttribute("style")) {
		expandDiv.removeAttribute("style");
		setTimeout(function() {
			expandDiv.innerHTML = "";
		}, 200);
		return;
	}

	var matchesList = _course.ModuleInstanceData.WinLossGate.ProcessedMatchIds;
	expandDiv.innerHTML = "";
	console.log(matchesList);
	var newHeight = 0;
	if (matchesList != undefined) {
		matchesList.forEach(function(_mid) {
			var match = matchesHistory[_mid];

			console.log(_mid);
			console.log(match);
			if (match != undefined) {
				if (match.type == "match") {

					//	if (match.opponent == undefined) continue;
					//	if (match.opponent.userid.indexOf("Familiar") !== -1) continue;
					match.playerDeck.mainDeck.sort(compare_cards);
					match.oppDeck.mainDeck.sort(compare_cards);

					var div = document.createElement("div");
					div.classList.add(match.id);
					div.classList.add("list_match");

					var fltl = document.createElement("div");
					fltl.classList.add("flex_item");

					var fll = document.createElement("div");
					fll.classList.add("flex_item");
					fll.style.flexDirection = "column";

					var flt = document.createElement("div");
					flt.classList.add("flex_top");
					fll.appendChild(flt);

					var flb = document.createElement("div");
					flb.classList.add("flex_bottom");
					fll.appendChild(flb);

					var flc = document.createElement("div");
					flc.classList.add("flex_item");
					flc.style.flexDirection = "column";
					flc.style.flexGrow = 2;

					var fct = document.createElement("div");
					fct.classList.add("flex_top");
					flc.appendChild(fct);

					var fcb = document.createElement("div");
					fcb.classList.add("flex_bottom");
					fcb.style.marginRight = "14px";
					flc.appendChild(fcb);

					var flr = document.createElement("div");
					flr.classList.add("flex_item");

					var tileGrpid = match.playerDeck.deckTileId;
					if (!cardsDb.get(tileGrpid)) {
						tileGrpid = 67003;
					}

					var tile = document.createElement("div");
					tile.classList.add(match.id+"t");
					tile.classList.add("deck_tile");

					tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";
					fltl.appendChild(tile);

					var d = document.createElement("div");
					d.classList.add("list_deck_name");
					d.innerHTML = match.playerDeck.name;
					flt.appendChild(d);

					match.playerDeck.colors.forEach(function(color) {
						var m = document.createElement("div");
						m.classList.add("mana_s20");
						m.classList.add("mana_"+mana[color]);
						flb.appendChild(m);
					});

					var d = document.createElement("div");
					d.classList.add("list_match_title");
					if (match.opponent.name == null) {
						match.opponent.name = "-";
					}
					d.innerHTML = "vs "+match.opponent.name.slice(0, -6);
					fct.appendChild(d);

					var or = document.createElement("div");
					or.classList.add("ranks_16");
					or.style.backgroundPosition = (get_rank_index_16(match.opponent.rank)*-16)+"px 0px";
					or.title = match.opponent.rank+" "+match.opponent.tier;
					fct.appendChild(or);

					var d = document.createElement("div");
					d.classList.add("list_match_time");
					d.innerHTML = timeSince(new Date(match.date))+' ago.';
					fcb.appendChild(d);

					var cc = get_deck_colors(match.oppDeck);
					cc.forEach(function(color) {
						var m = document.createElement("div");
						m.classList.add("mana_s20");
						m.classList.add("mana_"+mana[color]);
						fcb.appendChild(m);
					});

					if (match.player.win > match.opponent.win) {
						var d = document.createElement("div");
						d.classList.add("list_match_result_win");
						//d.innerHTML = "Win";
						d.innerHTML = match.player.win +":"+match.opponent.win;
						flr.appendChild(d);
					}
					else {
						var d = document.createElement("div");
						d.classList.add("list_match_result_loss");
						//d.innerHTML = "Loss";
						d.innerHTML = match.player.win +":"+match.opponent.win;
						flr.appendChild(d);
					}

					div.appendChild(fltl);
					div.appendChild(fll);
					div.appendChild(flc);
					div.appendChild(flr);

					expandDiv.appendChild(div);
					newHeight += 64;
					addHover(match, expandDiv);
				}
			}
		});
	}
	expandDiv.style.height = newHeight+"px";
}

//
function setHistory(loadMore) {
	var mainDiv = document.getElementById("ux_0");
	mainDiv.classList.add("flex_item");
	if (loadMore > 0) {
	}
	else {
		loadMore = 25;
		sort_history();		
		mainDiv.innerHTML = '';

		loadHistory = 0;
		
		var wrap_r = document.createElement("div");
		wrap_r.classList.add("wrapper_column");
		wrap_r.classList.add("sidebar_column_l");

		var div = document.createElement("div");
		div.classList.add("ranks_history");

		var t = document.createElement("div");
		t.classList.add("ranks_history_title");
		t.innerHTML = "Stats from last 10 days:";
		div.appendChild(t);

		// Add ranks matchup history here
		for (var key in matchesHistory.rankwinrates) {
		    if (matchesHistory.rankwinrates.hasOwnProperty(key)) {
		    	var val = matchesHistory.rankwinrates[key];
		    	if (val.t > 0) {
					var fla = document.createElement("div");
					fla.classList.add("flex_item");
					//fla.style.flexDirection = "column";
					fla.style.justifyContent = "center";

					var v = document.createElement("div");
					v.classList.add("ranks_history_title");
					v.innerHTML = "Vs.";

					var r = document.createElement("div");
					r.classList.add("ranks_history_badge");
					r.style.backgroundPosition = (get_rank_index(val.r, 1)*-48)+"px 0px";
					r.title = val.r;

					var s = document.createElement("div");
					s.classList.add("ranks_history_title");
					s.innerHTML = Math.round(val.w/val.t*100)+"%";

					fla.appendChild(v);
					fla.appendChild(r);
					fla.appendChild(s);
					div.appendChild(fla);
		    	}
		    }
		}

		var wrap_l = document.createElement("div");
		wrap_l.classList.add("wrapper_column");
		wrap_l.setAttribute("id", "history_column");

		var d = document.createElement("div");
		d.classList.add("list_fill");

		wrap_r.appendChild(div);
		mainDiv.appendChild(wrap_l);
		mainDiv.appendChild(wrap_r);
		wrap_l.appendChild(d);
	}

	mainDiv = document.getElementById("history_column");
	
	console.log("Load more: ", loadHistory, loadMore, loadHistory+loadMore);
	for (var loadEnd = loadHistory + loadMore; loadHistory < loadEnd; loadHistory++) {
		var match_id = matchesHistory.matches[loadHistory];
		var match = matchesHistory[match_id];

		if (match == undefined) continue;
		if (match.type == "match") {
			if (match.opponent == undefined) continue;
			if (match.opponent.userid.indexOf("Familiar") !== -1) continue;
		}
		//console.log("Load match: ", match_id, match);
		//console.log("Match: ", loadHistory, match.type, match);

		var div = document.createElement("div");
		div.classList.add(match.id);
		div.classList.add("list_match");

		var fltl = document.createElement("div");
		fltl.classList.add("flex_item");

		var fll = document.createElement("div");
		fll.classList.add("flex_item");
		fll.style.flexDirection = "column";

		var flt = document.createElement("div");
		flt.classList.add("flex_top");
		fll.appendChild(flt);

		var flb = document.createElement("div");
		flb.classList.add("flex_bottom");
		fll.appendChild(flb);

		var flc = document.createElement("div");
		flc.classList.add("flex_item");
		flc.style.flexDirection = "column";
		flc.style.flexGrow = 2;

		var fct = document.createElement("div");
		fct.classList.add("flex_top");
		flc.appendChild(fct);

		var fcb = document.createElement("div");
		fcb.classList.add("flex_bottom");
		fcb.style.marginRight = "14px";
		flc.appendChild(fcb);

		var flr = document.createElement("div");
		flr.classList.add("flex_item");

		if (match.type == "match") {
			var tileGrpid = match.playerDeck.deckTileId;
			if (!cardsDb.get(tileGrpid)) {
				tileGrpid = 67003;
			}

			var tile = document.createElement("div");
			tile.classList.add(match.id+"t");
			tile.classList.add("deck_tile");

			tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";
			fltl.appendChild(tile);

			var d = document.createElement("div");
			d.classList.add("list_deck_name");
			d.innerHTML = match.playerDeck.name;
			flt.appendChild(d);

			match.playerDeck.colors.forEach(function(color) {
				var m = document.createElement("div");
				m.classList.add("mana_s20");
				m.classList.add("mana_"+mana[color]);
				flb.appendChild(m);
			});

			var d = document.createElement("div");
			d.classList.add("list_match_title");
			if (match.opponent.name == null) {
				match.opponent.name = "-";
			}
			d.innerHTML = "vs "+match.opponent.name.slice(0, -6);
			fct.appendChild(d);

			var or = document.createElement("div");
			or.classList.add("ranks_16");
			or.style.backgroundPosition = (get_rank_index_16(match.opponent.rank)*-16)+"px 0px";
			or.title = match.opponent.rank+" "+match.opponent.tier;
			fct.appendChild(or);

			var d = document.createElement("div");
			d.classList.add("list_match_time");
			d.innerHTML = timeSince(new Date(match.date))+' ago.';
			fcb.appendChild(d);

			var cc = get_deck_colors(match.oppDeck);
			cc.forEach(function(color) {
				var m = document.createElement("div");
				m.classList.add("mana_s20");
				m.classList.add("mana_"+mana[color]);
				fcb.appendChild(m);
			});

			if (match.player.win > match.opponent.win) {
				var d = document.createElement("div");
				d.classList.add("list_match_result_win");
				//d.innerHTML = "Win";
				d.innerHTML = match.player.win +":"+match.opponent.win;
				flr.appendChild(d);
			}
			else {
				var d = document.createElement("div");
				d.classList.add("list_match_result_loss");
				//d.innerHTML = "Loss";
				d.innerHTML = match.player.win +":"+match.opponent.win;
				flr.appendChild(d);
			}
		}
		else {
			var tileGrpid = setsList[match.set].tile;

			var tile = document.createElement("div");
			tile.classList.add(match.id+"t");
			tile.classList.add("deck_tile");

			tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";
			fltl.appendChild(tile);

			var d = document.createElement("div");
			d.classList.add("list_deck_name");
			d.innerHTML = match.set+" draft";
			flt.appendChild(d);

			var d = document.createElement("div");
			d.classList.add("list_match_time");
			d.innerHTML = timeSince(new Date(match.date))+" ago.";
			fcb.appendChild(d);

			var d = document.createElement("div");
			d.classList.add("list_match_replay");
			d.innerHTML = "See replay";
			fct.appendChild(d);

			var d = document.createElement("div");
			d.classList.add("list_draft_share");
			d.classList.add(match.id+'dr');
			flr.appendChild(d);

		}

		div.appendChild(fltl);
		div.appendChild(fll);
		div.appendChild(flc);
		div.appendChild(flr);

		mainDiv.appendChild(div);

		if (match.type == "draft") {
			addShare(match);
		}
		addHover(match, tileGrpid);
	}

	$(this).off();
	$("#history_column").on('scroll', function() {
		if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
			setHistory(20);
		}
	})

	loadHistory = loadEnd;
}

var currentId = null;
//
function addShare(_match) {
	$('.'+_match.id+'dr').on('click', function(e) {
		currentId = _match.id;
		e.stopPropagation();
		$('.share_dialog_wrapper').css('opacity', 1);
		$('.share_dialog_wrapper').css('pointer-events', 'all');
		$('.share_dialog_wrapper').show();
		$('.share_dialog').css('width', '500px');
		$('.share_dialog').css('height', '200px');
		$('.share_dialog').css('top', 'calc(50% - 100px)');

		$('.share_dialog_wrapper').on('click', function(e) {
			console.log('.share_dialog_wrapper on click')
			//e.stopPropagation();
			$('.share_dialog_wrapper').css('opacity', 0);
			$('.share_dialog_wrapper').css('pointer-events', 'none');
			setTimeout(function() {
				$('.share_dialog_wrapper').hide();
				$('.share_dialog').css('width', '400px');
				$('.share_dialog').css('height', '160px');
				$('.share_dialog').css('top', 'calc(50% - 80px)');
			}, 250);
		});

		$('.share_dialog').on('click', function(e) {
			e.stopPropagation();
			console.log('.share_dialog on click')
		});

		var dialog = $('.share_dialog');
		dialog.html('');
		var cont = $('<div class="share_dialog_container"></div>');

		cont.append('<div class="share_title">Link For sharing:</div>');
		var icd = $('<div class="share_input_container"></div>');
		var but = $('<div class="button_simple">Copy</div>');
		var sin = $('<input id="share_input" onClick="this.setSelectionRange(0, this.value.length)" autofocus autocomplete="off" value="" />');

		sin.appendTo(icd);
		but.appendTo(icd);
		icd.appendTo(cont);

		cont.append('<div class="share_subtitle"><i>Expires in: </i></div>');
		cont.appendTo(dialog);

		var select = $('<select id="expire_select">'+sortingAlgorithm+'</select>');
		var sortby = ['One day', 'One week', 'One month', 'Never'];
		for (var i=0; i < sortby.length; i++) {
			select.append('<option value="'+sortby[i]+'">'+sortby[i]+'</option>');
		}
		select.appendTo(cont);
		selectAdd(select, draftShareLink);

		but.click(function () {
		    ipc_send('set_clipboard', document.getElementById("share_input").value);
		});
	});
}

//
function draftShareLink() {
	var shareExpire = document.getElementById("expire_select").value;
	var expire = 0;
	switch (shareExpire) {
		case 'One day': 	expire = 0; break;
		case 'One week': 	expire = 1; break;
		case 'One month': 	expire = 2; break;
		case 'Never': 		expire = -1; break;
		default: 			expire = 0; break;

	}
	obj = {
		expire: expire,
		id: currentId
	}
	ipc_send('request_draft_link', obj);
}

//
ipc.on('set_draft_link', function (event, arg) {
	document.getElementById("share_input").value = arg;
});


//
function addHover(_match, tileGrpid) {
	$('.'+_match.id).on('mouseenter', function(e) {
	    $('.'+_match.id+'t').css('opacity', 1);
	    $('.'+_match.id+'t').css('width', '200px');
	});

	$('.'+_match.id).on('mouseleave', function(e) {
	    $('.'+_match.id+'t').css('opacity', 0.66);
	    $('.'+_match.id+'t').css('width', '128px');
	});

	$('.'+_match.id).on('click', function(e) {
		if (_match.type == "match") {
			open_match(_match.id);
		    $('.moving_ux').animate({'left': '-100%'}, 250, 'easeInOutCubic'); 
		}
		else if (_match.type == "draft") {
			draftPosition = 1;
			open_draft(_match.id, tileGrpid, _match.set);
		    $('.moving_ux').animate({'left': '-100%'}, 250, 'easeInOutCubic'); 
		}
		else if (_match.type == "Event") {
			expandEvent(_match, tileGrpid);
		}
	});
}

//
function setDecks(arg) {
	if (arg != null) {
		decks = arg;//JSON.parse(arg);
	}
	if (sidebarActive == 0 && decks != null) {
		sort_decks();
		var mainDiv = document.getElementById("ux_0");
		mainDiv.classList.remove("flex_item");
		mainDiv.innerHTML = '';
		var d = document.createElement("div");
		d.classList.add("list_fill");
		mainDiv.appendChild(d);

		decks.forEach(function(deck, index) {
			var tileGrpid = deck.deckTileId;

			if (cardsDb.get(tileGrpid).set == undefined) {
				tileGrpid = 67003;
			}

			var tile = document.createElement("div");
			tile.classList.add(deck.id+'t');
			tile.classList.add('deck_tile');

			tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";

			var div = document.createElement("div");
			div.classList.add(deck.id);
			div.classList.add('list_deck');

			var fll = document.createElement("div");
			fll.classList.add('flex_item');

			var flc = document.createElement("div");
			flc.classList.add('flex_item');
			flc.style.flexDirection = "column";

			var flcf = document.createElement("div");
			flcf.classList.add('flex_item');
			flcf.style.flexGrow = 2;

			var flr = document.createElement("div");
			flr.classList.add('flex_item');
			flr.style.flexDirection = "column";

			var flt = document.createElement("div");
			flt.classList.add('flex_top');

			var flb = document.createElement("div");
			flb.classList.add('flex_bottom');

			if (deck.name.indexOf('?=?Loc/Decks/Precon/') != -1) {
				deck.name = deck.name.replace('?=?Loc/Decks/Precon/', '');
			}

			var d = document.createElement("div");
			d.classList.add('list_deck_name');
			d.innerHTML = deck.name;
			flt.appendChild(d);

			var missingCards = false;
			deck.mainDeck.forEach(function(card) {
				var grpId = card.id;
				var type = cardsDb.get(grpId).type;
				if (cardsDb.get(grpId).type.indexOf("Basic Land") == -1) {
					var quantity = card.quantity;
					if (grpId == 67306 && quantity > 4) {
						quantity = 4;
					}
					if (cards[grpId] == undefined) {
						missingCards = true
					}
					else if (quantity > cards[grpId]) {
						missingCards = true;
					}
				}
			});
			deck.sideboard.forEach(function(card) {
				var grpId = card.id;
				var type = cardsDb.get(grpId).type;
				if (cardsDb.get(grpId).type.indexOf("Basic Land") == -1) {
					var quantity = card.quantity;
					if (grpId == 67306 && quantity > 4) {
						quantity = 4;
					}
					if (cards[grpId] == undefined) {
						missingCards = true
					}
					else if (quantity > cards[grpId]) {
						missingCards = true;
					}
				}
			});

			if (missingCards) {
				var d = document.createElement("div");
				d.classList.add('decklist_not_owned');
				flt.appendChild(d);
			}


			deck.colors.forEach(function(color) {
				var d = document.createElement("div");
				d.classList.add('mana_s20');
				d.classList.add('mana_'+mana[color]);
				flb.appendChild(d);
			});

			var wr = getDeckWinrate(deck.id, deck.lastUpdated);
			if (wr != 0) {
				var d = document.createElement("div");
				d.classList.add('list_deck_winrate');
				d.innerHTML = 'Winrate: '+(wr.total*100).toFixed(2)+'%';
				flr.appendChild(d);

				var d = document.createElement("div");
				d.classList.add('list_deck_winrate');
				d.style.opacity = 0.6;
				d.innerHTML = 'Since last edit: '+(wr.lastEdit*100).toFixed(2)+'%';
				flr.appendChild(d);
			}

			div.appendChild(fll);
			fll.appendChild(tile);
			div.appendChild(flc);
			div.appendChild(flcf);
			flc.appendChild(flt);
			flc.appendChild(flb);
			div.appendChild(flr);
			mainDiv.appendChild(div);

			$('.'+deck.id).on('mouseenter', function(e) {
			    $('.'+deck.id+'t').css('opacity', 1);
			    $('.'+deck.id+'t').css('width', '200px');
			});

			$('.'+deck.id).on('mouseleave', function(e) {
			    $('.'+deck.id+'t').css('opacity', 0.66);
			    $('.'+deck.id+'t').css('width', '128px');
			});

			$('.'+deck.id).on('click', function(e) {
				open_deck(index, 0);
			    $('.moving_ux').animate({'left': '-100%'}, 250, 'easeInOutCubic'); 
			});

		});
		$("#ux_0").append('<div class="list_fill"></div>');
	}
}

//
function updateExplore() {
	filterEvent = getEventId(document.getElementById("query_select").value);
	ipc_send('request_explore', filterEvent.toLowerCase());
}

//
function setExplore(arg, loadMore) {
	document.body.style.cursor = "auto";
	if (arg != null) {
		explore = arg;
	}

	var mainDiv = document.getElementById("ux_0");
	mainDiv.classList.remove("flex_item");

	if (loadMore > 0) {
	}
	else {
		loadMore = 25;

		mainDiv.innerHTML = '';

		var d = document.createElement("div");
		d.classList.add("list_fill");
		mainDiv.appendChild(d);// goes down

		// Search box
		var icd = $('<div class="input_container"></div>');
		var label = $('<label style="display: table; margin-top: 6px !important;">Filter by event</label>');
		label.appendTo(icd);
		
		var input = $('<div class="query_explore" style="margin-left: 16px;"></div>');
		var select = $('<select id="query_select"></select>');

		if (eventFilters == null) {
			eventFilters = [];
			eventFilters.push('All');

			var dateNow = new Date();
			dateNow = dateNow.getTime()/1000;

			for (var i = 0; i < explore.length; i++) {
				var _deck = explore[i];

				var ss = Math.floor(dateNow - _deck.date);
				if (Math.floor(ss / 86400) > 10) {
					explore.splice(i, 1);
					i--;
				}
				else {
					let evId = getReadableEvent(_deck.event)//.replace(/[0-9]/g, ''); 
					if (!eventFilters.includes(evId)) {
						eventFilters.push(evId);
					}
				}
			}
		}
		eventFilters.sort(function(a, b){
			if(a < b) return -1;
			if(a > b) return 1;
			return 0;
		})
		for (var i=0; i < eventFilters.length; i++) {
			if (eventFilters[i] !== getReadableEvent(filterEvent)) {
				select.append('<option value="'+eventFilters[i]+'">'+eventFilters[i]+'</option>');
			}
		}
		select.appendTo(input);
		selectAdd(select, updateExplore);
		select.next('div.select-styled').text(getReadableEvent(filterEvent));

		input.appendTo(icd);
		icd.appendTo($("#ux_0"));

		var d = document.createElement("div");
		d.classList.add("list_fill");
		mainDiv.appendChild(d);
		var d = document.createElement("div");
		d.classList.add("list_fill");
		mainDiv.appendChild(d);

		loadExplore = 0;
	}


	//explore.forEach(function(_deck, index) {
	for (var loadEnd = loadExplore + loadMore; loadExplore < loadEnd; loadExplore++) {
		let _deck = explore[loadExplore];
		if (_deck == undefined) {
			continue;
		}
		let index = loadExplore;

		var dateNow = new Date();
		dateNow = dateNow.getTime()/1000;
		var ss = Math.floor(dateNow - _deck.date);
		if (Math.floor(ss / 86400) > 10) {
			continue;
		}

		if (_deck.deck_colors == undefined) {
			_deck.deck_colors = [];
		}
		if (_deck.wins == undefined) {
			_deck.wins = 0;
			_deck.losses = 0;
		}

		var tileGrpid = _deck.deck_tile;
		if (cardsDb.get(tileGrpid).set == undefined) {
			tileGrpid = 67003;
		}

		var tile = document.createElement("div");
		tile.classList.add(index+"t");
		tile.classList.add("deck_tile");

		tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";

		var div = document.createElement("div");
		div.classList.add(index);
		div.classList.add("list_deck");

		var fll = document.createElement("div");
		fll.classList.add("flex_item");

		var flc = document.createElement("div");
		flc.classList.add("flex_item");
		flc.style.flexDirection = "column";

		var flcf = document.createElement("div");
		flcf.classList.add("flex_item");
		flcf.style.flexGrow = 2;

		var flr = document.createElement("div");
		flr.classList.add("flex_item");
		flr.style.flexDirection = "column";

		var flt = document.createElement("div");
		flt.classList.add("flex_top");

		var flb = document.createElement("div");
		flb.classList.add("flex_bottom");

		var d = document.createElement("div");
		d.classList.add("list_deck_name");
		d.innerHTML = _deck.deck_name;
		flt.appendChild(d);

		var d = document.createElement("div");
		d.classList.add("list_deck_name_it");
		d.innerHTML = "by "+_deck.player_name;
		flt.appendChild(d);
		
		_deck.deck_colors.forEach(function(color) {
			var d = document.createElement("div");
			d.classList.add("mana_s20");
			d.classList.add("mana_"+mana[color]);
			flb.appendChild(d);
		});

		var d = document.createElement("div");
		d.classList.add("list_deck_record");
		d.innerHTML = _deck.wins+' - '+_deck.losses;
		flr.appendChild(d);

		var d = document.createElement("div");
		d.classList.add("list_deck_name_it");
		let ee = _deck.event.replace(/[0-9]/g, ''); 
		d.innerHTML = getReadableEvent(ee)+" - "+timeSince(_deck.date*1000)+" ago";
		flr.appendChild(d);

		div.appendChild(fll);
		fll.appendChild(tile);
		div.appendChild(flc);
		div.appendChild(flcf);
		flc.appendChild(flt);
		flc.appendChild(flb);
		div.appendChild(flr);

		mainDiv.appendChild(div);

		$('.'+index).on('mouseenter', function(e) {
		    $('.'+index+'t').css('opacity', 1);
		    $('.'+index+'t').css('width', '200px');
		});

		$('.'+index).on('mouseleave', function(e) {
		    $('.'+index+'t').css('opacity', 0.66);
		    $('.'+index+'t').css('width', '128px');
		});

		$('.'+index).on('click', function(e) {
			open_course_request(_deck.id);
		});

	}
	//$("#ux_0").append('<div class="list_fill"></div>');

	$(this).off();
	$("#ux_0").on('scroll', function() {
		if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
			setExplore(null, 20);
		}
	})

	loadExplore += 20;
}

//
function open_course_request(courseId) {
	ipc_send('renderer_request_course', courseId);
}

// 
function open_deck(i, type) {
	if (type == 0) {
		_deck = decks[i];
	}
	if (type == 1) {
		_deck = i;
	}
	currentOpenDeck = _deck;

	$("#ux_1").html('');

	var top = $('<div class="decklist_top"><div class="button back"></div><div class="deck_name">'+_deck.name+'</div></div>');
	flr = $('<div class="flex_item" style="align-self: center;"></div>');

	_deck.colors.forEach(function(color) {
		var m = $('<div class="mana_s20 mana_'+mana[color]+'"></div>');
		flr.append(m);
	});
	top.append(flr);

	var tileGrpid = _deck.deckTileId;
	if (cardsDb.get(tileGrpid)) {
		change_background("https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]);
	}
	var fld = $('<div class="flex_item"></div>');

	var dl = $('<div class="decklist"></div>');
	drawDeck(dl, _deck);
	var stats = $('<div class="stats"></div>');


	$('<div class="button_simple visualView">Visual View</div>').appendTo(stats);
	$('<div class="button_simple openHistory">History of changes</div>').appendTo(stats);
	$('<div class="button_simple exportDeck">Export to Arena</div>').appendTo(stats);
	$('<div class="button_simple exportDeckStandard">Export to .txt</div>').appendTo(stats);

	var curvediv = $('<div class="mana_curve"></div>');
	var curve = get_deck_curve(_deck);

	var curveMax = 0;
	for (let i=0; i<curve.length; i++) {
		if (curve[i] == undefined) {
			curve[i] = 0;
		}
		if (curve[i] > curveMax) {
			curveMax = curve[i];
		}
	}

	for (let i=0; i<curve.length; i++) {
		curvediv.append($('<div class="mana_curve_column" style="height: '+(curve[i]/curveMax*100)+'%"></div>'))
	}
	curvediv.appendTo(stats);
	var curvediv = $('<div class="mana_curve_numbers"></div>');
	for (let i=0; i<curve.length; i++) {
		curvediv.append($('<div class="mana_curve_column_number"><div style="margin: 0 auto !important" class="mana_s16 mana_'+i+'"></div></div>'))
	}
	curvediv.appendTo(stats);

	//var missing = get_deck_missing(_deck);

	var cont = $('<div class="pie_container_outer"></div>');

	// Deck colors
	var colorspie = get_deck_colors_ammount(_deck);
	var wp = colorspie.w / colorspie.total * 100;
	var up = wp+colorspie.u / colorspie.total * 100;
	var bp = up+colorspie.b / colorspie.total * 100;
	var rp = bp+colorspie.r / colorspie.total * 100;
	var gp = rp+colorspie.g / colorspie.total * 100;
	var cp = gp+colorspie.c / colorspie.total * 100;

	var gradient = new ConicGradient({
	    stops: '#E7CA8E '+wp+'%, #AABEDF 0 '+up+'%, #A18E87 0 '+bp+'%, #DD8263 0 '+rp+'%, #B7C89E 0 '+gp+'%, #E3E3E3 0 '+cp+'%', // required
	    size: 400 // Default: Math.max(innerWidth, innerHeight)
	});
	var piechart = $('<div class="pie_container"><span>Mana Symbols</span><svg class="pie">'+gradient.svg+'</svg></div>');
	piechart.appendTo(cont);

	// Lands colors
	colorspie = get_deck_lands_ammount(_deck);
	wp = colorspie.w / colorspie.total * 100;
	up = wp+colorspie.u / colorspie.total * 100;
	bp = up+colorspie.b / colorspie.total * 100;
	rp = bp+colorspie.r / colorspie.total * 100;
	gp = rp+colorspie.g / colorspie.total * 100;
	cp = gp+colorspie.c / colorspie.total * 100;

	gradient = new ConicGradient({
	    stops: '#E7CA8E '+wp+'%, #AABEDF 0 '+up+'%, #A18E87 0 '+bp+'%, #DD8263 0 '+rp+'%, #B7C89E 0 '+gp+'%, #E3E3E3 0 '+cp+'%', // required
	    size: 400 // Default: Math.max(innerWidth, innerHeight)
	});
	piechart = $('<div class="pie_container"><span>Mana Sources</span><svg class="pie">'+gradient.svg+'</svg></div>');
	piechart.appendTo(cont);

	cont.appendTo(stats);

	if (type == 0) {
		var cont = $('<div class="pie_container_outer"></div>');
		var wr = getDeckWinrate(_deck.id, _deck.lastUpdated);
		if (wr != 0) {
			wr.winColors.total = wr.winColors.w+wr.winColors.u+wr.winColors.b+wr.winColors.r+wr.winColors.g;
			wp = wr.winColors.w / wr.winColors.total * 100;
			up = wp+wr.winColors.u / wr.winColors.total * 100;
			bp = up+wr.winColors.b / wr.winColors.total * 100;
			rp = bp+wr.winColors.r / wr.winColors.total * 100;
			gp = rp+wr.winColors.g / wr.winColors.total * 100;
			cp = gp+wr.winColors.c / wr.winColors.total * 100;

			gradient = new ConicGradient({
			    stops: '#E7CA8E '+wp+'%, #AABEDF 0 '+up+'%, #A18E87 0 '+bp+'%, #DD8263 0 '+rp+'%, #B7C89E 0 '+gp+'%, #E3E3E3 0 '+cp+'%', // required
			    size: 400 // Default: Math.max(innerWidth, innerHeight)
			});
			piechart = $('<div class="pie_container"><span>Wins vs colors</span><svg class="pie">'+gradient.svg+'</svg></div>');
			piechart.appendTo(cont);


			wr.lossColors.total = wr.lossColors.w+wr.lossColors.u+wr.lossColors.b+wr.lossColors.r+wr.lossColors.g;
			wp = wr.lossColors.w / wr.lossColors.total * 100;
			up = wp+wr.lossColors.u / wr.lossColors.total * 100;
			bp = up+wr.lossColors.b / wr.lossColors.total * 100;
			rp = bp+wr.lossColors.r / wr.lossColors.total * 100;
			gp = rp+wr.lossColors.g / wr.lossColors.total * 100;
			cp = gp+wr.lossColors.c / wr.lossColors.total * 100;

			gradient = new ConicGradient({
			    stops: '#E7CA8E '+wp+'%, #AABEDF 0 '+up+'%, #A18E87 0 '+bp+'%, #DD8263 0 '+rp+'%, #B7C89E 0 '+gp+'%, #E3E3E3 0 '+cp+'%', // required
			    size: 400 // Default: Math.max(innerWidth, innerHeight)
			});
			piechart = $('<div class="pie_container"><span>Losses vs colors</span><svg class="pie">'+gradient.svg+'</svg></div>');
			piechart.appendTo(cont);
		}
		cont.appendTo(stats);
	}

	var missingWildcards = get_deck_missing(_deck);

	var cost = $('<div class="wildcards_cost"><span>Wildcards Needed</span></div>');

	var _c = $('<div class="wc_cost wc_common">'+missingWildcards.common+'</div>');
	_c.attr("title", "Common");
	_c.appendTo(cost);
	var _u = $('<div class="wc_cost wc_uncommon">'+missingWildcards.uncommon+'</div>');
	_u.appendTo(cost);
	_u.attr("title", "Uncommon");
	var _r = $('<div class="wc_cost wc_rare">'+missingWildcards.rare+'</div>');
	_r.appendTo(cost);
	_r.attr("title", "Rare");
	var _m = $('<div class="wc_cost wc_mythic">'+missingWildcards.mythic+'</div>');
	_m.appendTo(cost);
	_m.attr("title", "Mythic Rare");

	cost.appendTo(stats);

	dl.appendTo(fld);
	stats.appendTo(fld);
	$("#ux_1").append(top);
	$("#ux_1").append(fld);

	//
	$(".visualView").click(function () {
	    drawDeckVisual(dl, stats, _deck);
	});

	//
	$(".openHistory").click(function () {
	    ipc_send('get_deck_changes', _deck.id);
	});

	$(".exportDeck").click(function () {
	    var list = get_deck_export(_deck);
	    ipc_send('set_clipboard', list);
	});

	$(".exportDeckStandard").click(function () {
	    var list = get_deck_export_txt(_deck);
	    ipc_send('export_txt', {str: list, name: _deck.name});
	});

	$(".back").click(function () {
        change_background("default");
	    $('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 
	});
}

//
function drawDeck(div, deck) {
	var unique = makeId(4);
	div.html('');
	var prevIndex = 0;
	deck.mainDeck.forEach(function(card) {
		var grpId = card.id;
		var type = cardsDb.get(grpId).type;
		if (prevIndex == 0) {
			addCardSeparator(get_card_type_sort(type), div);
		}
		else if (prevIndex != 0) {
			if (get_card_type_sort(type) != get_card_type_sort(cardsDb.get(prevIndex).type)) {
				addCardSeparator(get_card_type_sort(type), div);
			}
		}

		if (card.quantity > 0) {
			addCardTile(grpId, unique+"a", card.quantity, div);
		}
		
		prevIndex = grpId;
	});

	if (deck.sideboard != undefined) {
		if (deck.sideboard.length > 0) {
			addCardSeparator(99, div);
			var prevIndex = 0;
			deck.sideboard.forEach(function(card) {
				var grpId = card.id;
				var type = cardsDb.get(grpId).type;
				if (card.quantity > 0) {
					addCardTile(grpId, unique+"b", card.quantity, div);
				}
			});
		}
	}
}

//
function drawDeckVisual(_div, _stats, deck) {
	// attempt at sorting visually.. 
	var newMainDeck = [];

	for (var cmc = 0; cmc < 21; cmc++) {
		for (var qq = 4; qq > -1; qq--) {
			deck.mainDeck.forEach(function(c) {
				var grpId = c.id;
				var card = cardsDb.get(grpId);
				if (card.type.indexOf("Land") == -1 && grpId != 67306) {
					if (card.cmc == cmc) {
						var quantity = c.quantity;

						if (quantity == qq) {
							newMainDeck.push(c);
						}
					}
				}
				else if (cmc == 20) {
					var quantity = c.quantity;
					if (qq == 0 && quantity > 4) {
						newMainDeck.push(c);
					}
					if (quantity == qq) {
						newMainDeck.push(c);
					}
				}
			});
		}
	}

	_stats.hide();
	_div.css("display", "flex");
	_div.css("width", "auto");
	_div.css("margin", "0 auto");
	_div.html('');

	_div.parent().css("flex-direction", "column");

	$('<div class="button_simple openDeck">Normal view</div>').appendTo(_div.parent());

	$(".openDeck").click(function () {
		open_deck(currentOpenDeck);
	});

	var sz = cardSize;
	div = $('<div class="visual_mainboard"></div>');
	div.css("display", "flex");
	div.css("flex-wrap", "wrap");
	div.css("align-content", "start");
	div.css("max-width", (sz+6)*5+"px");
	div.appendTo(_div);

	var unique = makeId(4);
	var prevIndex = 0;

	var tileNow;
	var _n = 0;
	newMainDeck.forEach(function(c) {
		var grpId = c.id;
		var card = cardsDb.get(grpId);

		if (c.quantity > 0) {
			let dfc = '';
			if (card.dfc == 'DFC_Back')	 dfc = 'a';
			if (card.dfc == 'DFC_Front') dfc = 'b';
			if (card.dfc == 'SplitHalf') dfc = 'a';
			if (dfc != 'b') {
				for (i=0; i<c.quantity; i++) {
					if (_n % 4 == 0) {
						tileNow = $('<div class="deck_visual_tile"></div>');
						tileNow.appendTo(div);
					}

			        let d = $('<div style="width: '+sz+'px !important;" class="deck_visual_card"></div>');
			        let img = $('<img style="width: '+sz+'px !important;" class="deck_visual_card_img"></img>');

			        img.attr("src", "https://img.scryfall.com/cards"+card.images[cardQuality]);
					img.appendTo(d);
					d.appendTo(tileNow);

					addCardHover(img, card);
					_n++;
				}
			}
		}
	});

	div = $('<div class="visual_sideboard"></div>');
	div.css("display", "flex");
	div.css("flex-wrap", "wrap");
	div.css("margin-left", "32px");
	div.css("align-content", "start");
	div.css("max-width", (sz+6)*1.5+"px");
	div.appendTo(_div);
	
	if (deck.sideboard != undefined) {
		tileNow = $('<div class="deck_visual_tile_side"></div>');
		tileNow.css("width", (sz+6)*5+"px");
		tileNow.appendTo(div);

		var _n = 0;
		deck.sideboard.forEach(function(c) {
			var grpId = c.id;
			var card = cardsDb.get(grpId);
			if (c.quantity > 0) {
				let dfc = '';
				if (card.dfc == 'DFC_Back')	 dfc = 'a';
				if (card.dfc == 'DFC_Front') dfc = 'b';
				if (card.dfc == 'SplitHalf') dfc = 'a';
				if (dfc != 'b') {
					for (i=0; i<c.quantity; i++) {
						if (_n % 2 == 1) {
					        var d = $('<div style="width: '+sz+'px !important;" class="deck_visual_card_side"></div>');
						}
						else {
					        var d = $('<div style="margin-left: 60px; width: '+sz+'px !important;" class="deck_visual_card_side"></div>');
						}
				        let img = $('<img style="width: '+sz+'px !important;" class="deck_visual_card_img"></img>');
				        img.attr("src", "https://img.scryfall.com/cards"+card.images[cardQuality]);
						//img.attr("src", "https://img.scryfall.com/cards/"+cardQuality+"/en/"+get_set_scryfall(card.set)+"/"+card.cid+dfc+".jpg");
						img.appendTo(d);
						d.appendTo(tileNow);

						addCardHover(img, card);
						_n++;
					}
				}
			}
		});
	}
}

//
function setChangesTimeline() {
	var cont = $(".stats");
	cont.html('');


	var time = $('<div class="changes_timeline"></div>')

	changes.sort(compare_changes);

	// CURRENT DECK
	let div = $('<div class="change"></div>');
	var butbox = $('<div class="change_button_cont" style="transform: scaleY(-1);"></div>');
	var button = $('<div class="change_button"></div>');
	button.appendTo(butbox);
	let datbox = $('<div class="change_data"></div>');

	// title
	let title = $('<div class="change_data_box"></div>');
	title.html('Current Deck');

	butbox.appendTo(div);
	datbox.appendTo(div);
	title.appendTo(datbox);
	div.appendTo(time);

	butbox.on('mouseenter', function(e) {
		button.css('width', '32px');
		button.css('height', '32px');
		button.css('top', 'calc(50% - 16px)');
	});

	butbox.on('mouseleave', function(e) {
		button.css('width', '24px');
		button.css('height', '24px');
		button.css('top', 'calc(50% - 12px)');
	});

	butbox.on('click', function(e) {
		var hasc = button.hasClass('change_button_active');

		$(".change_data_box_inside").each(function(index) {
			$(this).css('height', '0px');
		});

		$(".change_button").each(function(index) {
			$(this).removeClass('change_button_active');
		});

		if (!hasc) {
			button.addClass('change_button_active');
		}
	});
	//

	cn = 0;
	changes.forEach(function(change) {
		change.changesMain.sort(compare_changes_inner);
		change.changesSide.sort(compare_changes_inner);

		let div = $('<div class="change"></div>');
		if (cn < changes.length-1) {
			var butbox = $('<div style="background-size: 100% 100% !important;" class="change_button_cont"></div>');
		}
		else {
			var butbox = $('<div class="change_button_cont"></div>');
		}
		var button = $('<div class="change_button"></div>');
		button.appendTo(butbox);
		let datbox = $('<div class="change_data"></div>');

		// title
		let title = $('<div class="change_data_box"></div>');
		// inside
		let data  = $('<div class="change_data_box_inside"></div>');
		var innherH = 54;
		let nc = 0;
		if (change.changesMain.length > 0) {
			let dd = $('<div class="change_item_box"></div>');
			addCardSeparator(98, dd);
			dd.appendTo(data);
		}

		change.changesMain.forEach(function(c) {
			innherH += 30;
			if (c.quantity > 0)	nc += c.quantity;
			let dd = $('<div class="change_item_box"></div>');
			if (c.quantity > 0)	{
				let ic  = $('<div class="change_add"></div>');
				ic.appendTo(dd);
			}
			else {
				let ic  = $('<div class="change_remove"></div>');
				ic.appendTo(dd);
			}

			addCardTile(c.id, 'chm'+cn, Math.abs(c.quantity), dd);
			dd.appendTo(data);
		});

		if (change.changesSide.length > 0) {
			let dd = $('<div class="change_item_box"></div>');
			addCardSeparator(99, dd);
			innherH += 30;
			dd.appendTo(data);
		}

		change.changesSide.forEach(function(c) {
			innherH += 30;
			if (c.quantity > 0)	nc += c.quantity;
			let dd = $('<div class="change_item_box"></div>');
			if (c.quantity > 0)	{
				let ic  = $('<div class="change_add"></div>');
				ic.appendTo(dd);
			}
			else {
				let ic  = $('<div class="change_remove"></div>');
				ic.appendTo(dd);
			}

			addCardTile(c.id, 'chs'+cn, Math.abs(c.quantity), dd);
			dd.appendTo(data);
		});

		title.html(nc+' changes, '+timeSince(Date.parse(change.date))+' ago.');

		butbox.appendTo(div);
		datbox.appendTo(div);
		title.appendTo(datbox);
		data.appendTo(datbox);
		div.appendTo(time);

		butbox.on('mouseenter', function(e) {
			button.css('width', '32px');
			button.css('height', '32px');
			button.css('top', 'calc(50% - 16px)');
		});

		butbox.on('mouseleave', function(e) {
			button.css('width', '24px');
			button.css('height', '24px');
			button.css('top', 'calc(50% - 12px)');
		});

		butbox.on('click', function(e) {
			// This requires some UX indicators
			//drawDeck($('.decklist'), {mainDeck: change.previousMain, sideboard: change.previousSide});
			var hasc = button.hasClass('change_button_active');

			$(".change_data_box_inside").each(function(index) {
				$(this).css('height', '0px');
			});

			$(".change_button").each(function(index) {
				$(this).removeClass('change_button_active');
			});

			if (!hasc) {
				button.addClass('change_button_active');
				data.css('height', innherH+'px');
			}
		});

		cn++;
	})

	$('<div class="button_simple openDeck">View stats</div>').appendTo(cont);

	$(".openDeck").click(function () {
		open_deck(currentOpenDeck);
	});
	time.appendTo(cont);
}

//
function open_draft(id, tileGrpid, set) {
	console.log("OPEN DRAFT", draftPosition)
	$("#ux_1").html('');
	if (draftPosition < 1)	draftPosition = 1; 
	if (draftPosition > 84)	draftPosition = 84; 
	var draft = matchesHistory[id];

	var pa = Math.floor( (draftPosition-1)/2 / 14);
	var pi = Math.floor( ((draftPosition-1)/2) % 14);
	var key = 'pack_'+pa+'pick_'+pi;

	var pack = draft[key].pack;
	var pick = draft[key].pick;

	var top = $('<div class="decklist_top"><div class="button back"></div><div class="deck_name">'+set+' Draft</div></div>');
	flr = $('<div class="flex_item" style="align-self: center;"></div>');
	top.append(flr);

	if (cardsDb.get(tileGrpid)) {
		change_background("https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]);
	}

	var cont = $('<div class="flex_item" style="flex-direction: column;"></div>');
    cont.append('<div class="draft_nav_container"><div class="draft_nav_prev"></div><div class="draft_nav_next"></div></div>');

	$('<div class="draft_title">Pack '+(pa+1)+', Pick '+(pi+1)+'</div>').appendTo(cont);

	var slider = $('<div class="slidecontainer"></div>');
	slider.appendTo(cont);
	var sliderInput = $('<input type="range" min="1" max="84" value="'+draftPosition+'" class="slider" id="myRange">');
	sliderInput.appendTo(slider);


	var pd = $('<div class="draft_pack_container"></div>');
	pd.appendTo(cont);

	
	pack.forEach(function(grpId) {
        var d = $('<div style="width: '+cardSize+'px !important;" class="draft_card"></div>');
        var img = $('<img style="width: '+cardSize+'px !important;" class="draft_card_img"></img>');
        if (grpId == pick && draftPosition % 2 == 0) {
        	img.addClass('draft_card_picked');
        }
        var card = cardsDb.get(grpId);
        img.attr("src", "https://img.scryfall.com/cards"+card.images[cardQuality]);

		img.appendTo(d);
		addCardHover(img, card);
		d.appendTo(pd);
	});


	$("#ux_1").append(top);
	$("#ux_1").append(cont);
	
	var qSel = document.querySelector("input");

	$(".draft_nav_prev").off();
	$(".draft_nav_next").off();
	$(".slider").off();

	$(".slider").on('click mousemove', function() {
		console.log("SLIDER MOVE", draftPosition)
		var pa = Math.floor( (qSel.value-1)/2 / 14) ;
		var pi = Math.floor( ((qSel.value-1)/2) % 14) ;
		$('.draft_title').html('Pack '+(pa+1)+', Pick '+(pi+1));
	});

	$(".slider").on('click mouseup', function() {
		console.log("SLIDER UP")
		draftPosition = parseInt(qSel.value);
		open_draft(id, tileGrpid, set);
	});
	
	$(".draft_nav_prev").on('click mouseup', function() {
		console.log("NAV PREV UP")
	    draftPosition -= 1;
	    open_draft(id, tileGrpid, set);
	});

	$(".draft_nav_next").on('click mouseup', function() {
		console.log("NAV NEXT UP")
	    draftPosition += 1;
	    open_draft(id, tileGrpid, set);
	});
	//
	$(".back").click(function () {
		change_background("default");
	    $('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 
	});
}

// ** FOR REMOVAL ** 
function open_match(id) {
	$("#ux_1").html('');
	var match = matchesHistory[id];

	var top = $('<div class="decklist_top"><div class="button back"></div><div class="deck_name">'+match.playerDeck.name+'</div></div>');
	flr = $('<div class="flex_item" style="align-self: center;"></div>');

	if (match.playerDeck.colors != undefined) {		
		match.playerDeck.colors.forEach(function(color) {
			var m = $('<div class="mana_s20 mana_'+mana[color]+'"></div>');
			flr.append(m);
		});
	}
	top.append(flr);


	var tileGrpid = match.playerDeck.deckTileId;
	if (cardsDb.get(tileGrpid)) {
		change_background("https://img.scryfall.com/cards/art_crop/en/"+get_set_scryfall(cardsDb.get(tileGrpid).set)+"/"+cardsDb.get(tileGrpid).cid+".jpg");
	}
	var fld = $('<div class="flex_item"></div>');

	// this is a mess
	var flt = $('<div class="flex_item"></div>')
	var fltl = $('<div class="flex_item"></div>')
	var r = $('<div class="rank"></div>'); r.appendTo(fltl);

	var fltr = $('<div class="flex_item"></div>'); fltr.css("flex-direction","column");
	var fltrt = $('<div class="flex_top"></div>');
	var fltrb = $('<div class="flex_bottom"></div>');
	fltrt.appendTo(fltr); fltrb.appendTo(fltr);

	fltl.appendTo(flt); fltr.appendTo(flt);

	var rank = match.player.rank;
	var tier = match.player.tier;
	r.css("background-position", (get_rank_index(rank, tier)*-48)+"px 0px").attr("title", rank+" "+tier);

	var name = $('<div class="list_match_player_left">'+match.player.name.slice(0, -6)+' ('+match.player.win+')</div>');
	name.appendTo(fltrt);

	if (match.player.win > match.opponent.win) {
		var w = $('<div class="list_match_player_left green">Winner</div>');
		w.appendTo(fltrb);
	}

	var dl = $('<div class="decklist"></div>');
	flt.appendTo(dl);

	drawDeck(dl, match.playerDeck);

	var flt = $('<div class="flex_item" style="flex-direction: row-reverse;"></div>')
	var fltl = $('<div class="flex_item"></div>')
	var r = $('<div class="rank"></div>'); r.appendTo(fltl);

	var fltr = $('<div class="flex_item"></div>'); fltr.css("flex-direction","column"); fltr.css("align-items","flex-end");
	var fltrt = $('<div class="flex_top"></div>');
	var fltrb = $('<div class="flex_bottom"></div>');
	fltrt.appendTo(fltr); fltrb.appendTo(fltr);

	fltl.appendTo(flt);fltr.appendTo(flt);

	var rank = match.opponent.rank;
	var tier = match.opponent.tier;
	r.css("background-position", (get_rank_index(rank, tier)*-48)+"px 0px").attr("title", rank+" "+tier);

	var name = $('<div class="list_match_player_right">'+match.opponent.name.slice(0, -6)+' ('+match.opponent.win+')</div>');
	name.appendTo(fltrt);

	if (match.player.win < match.opponent.win) {
		var w = $('<div class="list_match_player_right green">Winner</div>');
		w.appendTo(fltrb);
	}

	var odl = $('<div class="decklist"></div>');
	flt.appendTo(odl);

	match.oppDeck.mainDeck.sort(compare_cards);
	match.oppDeck.sideboard.sort(compare_cards);
	drawDeck(odl, match.oppDeck);

	$('<div class="button_simple exportDeck">Export to Arena</div>').appendTo(odl);
	$('<div class="button_simple exportDeckStandard">Export to .txt</div>').appendTo(odl);

	dl.appendTo(fld);
	odl.appendTo(fld);
	$("#ux_1").append(top);
	$("#ux_1").append(fld);
	
	$(".exportDeck").click(function () {
	    var list = get_deck_export(match.oppDeck);
	    ipc_send('set_clipboard', list);
	});
	$(".exportDeckStandard").click(function () {
	    var list = get_deck_export_txt(match.oppDeck);
	    ipc_send('export_txt', {str: list, name: match.opponent.name.slice(0, -6)+"'s deck"});
	});

	$(".back").click(function () {
		change_background("default");
	    $('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 
	});
}

//
function open_economy() {
	$("#ux_0").html('');
	$("#ux_1").html('');
	var div = $('<div class="economy"></div>');
	$('<div class="chart_container"><canvas id="goldChart"></canvas></div>').appendTo(div);
	$('<div class="chart_container"><canvas id="wildcardsChart"></canvas></div>').appendTo(div);
	$('<div class="chart_container"><canvas id="gemsChart"></canvas></div>').appendTo(div);

	$("#ux_0").append(div);
	$("#ux_0").removeClass("flex_item");

	// Set gold chart
	var labels = [];
	var data = [];

	goldHistory.forEach(function(item) {
		var date = new Date(item.date);
		labels.push(date);
		data.push(item.value);
	});

	Chart.defaults.global.defaultFontColor="rgb(250, 229, 210)";

 	var ctx = document.getElementById("goldChart").getContext('2d');
	var myChart = new Chart(ctx, {
	    type: 'bar',
	    data: {
	        labels: labels,
	        datasets: [{
	            label: 'Gold',
				data: data,
				type: 'line',
				fill: true,
	            backgroundColor: [
	                'rgba(221, 130, 99, 0.5)',
	            ],
	            borderColor: [
	                'rgba(221, 130, 99, 0.5)',
	            ]
	        }]
	    },
	    options: {
	    	responsive: true,
			elements: {
				line: {
					tension: 0.000001
				}
			},
			scales: {
				xAxes: [{
					type: 'time',
					distribution: 'series',
					display: true,
	                time: {
	                    unit: 'day'
	                },
					ticks: {
						source: 'labels'
					}
				}],
				yAxes: [{
					display: true
				}]
			}
	    }
	});

	// Set wildcards chart
	wcCommon = [];
	wcUncommon = [];
	wcRare = [];
	wcMythic = [];
	labels = [];
	wildcardHistory.forEach(function(item) {
		var date = new Date(item.date);
		labels.push(date);
		wcCommon.push(item.value.wcCommon);
		wcUncommon.push(item.value.wcUncommon);
		wcRare.push(item.value.wcRare);
		wcMythic.push(item.value.wcMythic);
	});

	var ctx = document.getElementById("wildcardsChart").getContext('2d');
	var myChart = new Chart(ctx, {
	    type: 'bar',
	    data: {
	        labels: labels,
	        datasets: [{
	            label: 'Common',
				data: wcCommon,
				type: 'line',
	            borderColor: [
	                'rgba(255, 255, 255, 0.5)',
	            ]
	        },{
	            label: 'Uncommon',
				data: wcUncommon,
				type: 'line',
	            borderColor: [
	                'rgba(166, 206, 255, 0.5)',
	            ]
	        },{
	            label: 'Rare',
				data: wcRare,
				type: 'line',
				fill: true,
	            borderColor: [
	                'rgba(255, 186, 0, 0.5)',
	            ]
	        },{
	            label: 'Mythic Rare',
				data: wcMythic,
				type: 'line',
				fill: true,
	            borderColor: [
	                'rgba(255, 27, 0, 0.5)',
	            ]
	        }]
	    },
	    options: {
	    	responsive: true,
			elements: {
				line: {
					tension: 0.000001
				}
			},
			scales: {
				xAxes: [{
					type: 'time',
					distribution: 'series',
	                time: {
	                    unit: 'day'
	                },
					ticks: {
						source: 'labels'
					}
				}],
				yAxes: [{
					display: true
				}]
			}
	    }
	});

	// Set gems chart
	labels = [];
	data = [];
	gemsHistory.forEach(function(item) {
		var date = new Date(item.date);
		labels.push(date);
		data.push(item.value);
	});

	var ctx = document.getElementById("gemsChart").getContext('2d');
	var myChart = new Chart(ctx, {
	    type: 'bar',
	    data: {
	        labels: labels,
	        datasets: [{
	            label: 'gems',
				data: data,
				type: 'line',
				fill: true,
	            backgroundColor: [
	                'rgba(183, 200, 158, 0.5)',
	            ],
	            borderColor: [
	                'rgba(183, 200, 158, 0.5)',
	            ]
	        }]
	    },
	    options: {
	    	responsive: true,
			elements: {
				line: {
					tension: 0.000001
				}
			},
			scales: {
				xAxes: [{
					type: 'time',
					distribution: 'series',
	                time: {
	                    unit: 'day'
	                },
					ticks: {
						source: 'labels'
					}
				}],
				yAxes: [{
					display: true
				}]
			}
	    }
	});
}

//
function open_cards() {
	$("#ux_0").html('');
	$("#ux_1").html('');
	$("#ux_0").removeClass("flex_item");
	var div = $('<div class="inventory"></div>');
	
	var basicFilters = $('<div class="inventory_filters_basic"></div>');
	var flex = $('<div class="inventory_flex"></div>');

	var icd = $('<div class="input_container"></div>');
	var label = $('<label style="display: table">Search</label>');
	label.appendTo(icd);
	var input = $('<input type="search" id="query_name" autocomplete="off" />');
	input.appendTo(icd);
	icd.appendTo(flex);

	input.keypress(function(e) {
		if (e.which == 13) {
			printCards();
		}
	});

	var searchButton = $('<div class="button_simple button_thin" onClick="printCards()">Search</div>');	
	searchButton.appendTo(flex);
	var advancedButton = $('<div class="button_simple button_thin" onClick="expandFilters()">Advanced filters</div>');
	advancedButton.appendTo(flex);

	flex.appendTo(basicFilters);
	var flex = $('<div class="inventory_flex"></div>');


	var select = $('<select id="query_select">'+sortingAlgorithm+'</select>');
	var sortby = ['Set', 'Name', 'Rarity', 'CMC'];
	for (var i=0; i < sortby.length; i++) {
		select.append('<option value="'+sortby[i]+'">'+sortby[i]+'</option>');
	}
	select.appendTo(flex);
	selectAdd(select, sortCollection);

	var exp   = $('<div class="button_simple button_thin" onClick="exportCollection()">Export Collection</div>');
	exp.appendTo(flex);
	var reset = $('<div class="button_simple button_thin" onClick="resetFilters()">Reset</div>');
	reset.appendTo(flex);
	var stats = $('<div class="button_simple button_thin stats_button" onClick="printStats()">Collection Stats</div>');
	stats.appendTo(flex);

	flex.appendTo(basicFilters);


	// "ADVANCED" FILTERS
	var filters = $('<div class="inventory_filters"></div>');

	var flex = $('<div class="inventory_flex"></div>');

	var icd = $('<div style="padding-bottom: 8px;" class="input_container"></div>');
	var label = $('<label style="display: table">Type line</label>');
	label.appendTo(icd);
	var typeInput = $('<input type="search" id="query_type" autocomplete="off" />');
	typeInput.appendTo(icd);
	icd.appendTo(flex);
	flex.appendTo(filters);

	var sets = $('<div class="sets_container"><label>Filter by set:</label></div>');
	for (let set in setsList) {
		let setbutton = $('<div class="set_filter set_filter_on" style="background-image: url(../images/sets/'+setsList[set].code+'.png)" title="'+set+'"></div>');
		setbutton.appendTo(sets);
		setbutton.click(function() {
			if (setbutton.hasClass('set_filter_on')) {
				setbutton.removeClass('set_filter_on');
				filteredSets.push(set);
			}
			else {
				setbutton.addClass('set_filter_on');
				let n = filteredSets.indexOf(set);
				if (n > -1) {
					filteredSets.splice(n, 1);
				}
			}
		});
	}
	sets.appendTo(filters);

	var manas = $('<div class="sets_container"><label>Filter by color:</label></div>');
	var ms = ["w", "u", "b", "r", "g"];
	ms.forEach(function(s, i) {
		var mi = [1, 2, 3, 4, 5];
		var manabutton = $('<div class="mana_filter mana_filter_on" style="background-image: url(../images/'+s+'20.png)"></div>');
		manabutton.appendTo(manas);
		manabutton.click(function() {
			if (manabutton.hasClass('mana_filter_on')) {
				manabutton.removeClass('mana_filter_on');
				filteredMana.push(mi[i]);
			}
			else {
				manabutton.addClass('mana_filter_on');
				let n = filteredMana.indexOf(mi[i]);
				if (n > -1) {
					filteredMana.splice(n, 1);
				}
			}
		});
	});
	manas.appendTo(filters);

	var cont = $('<div class="buttons_container"></div>');
	add_checkbox_search(cont, 'Show unowned', 'query_unown', false);
	add_checkbox_search(cont, 'Newly acquired only', 'query_new', false);
	add_checkbox_search(cont, 'Require multicolored', 'query_multicolor', false);
	add_checkbox_search(cont, 'Exclude unselected colors', 'query_exclude', false);
	cont.appendTo(filters);

	var cont = $('<div class="buttons_container"></div>');
	add_checkbox_search(cont, 'Common', 'query_common', true);
	add_checkbox_search(cont, 'Uncommon', 'query_uncommon', true);
	add_checkbox_search(cont, 'Rare', 'query_rare', true);
	add_checkbox_search(cont, 'Mythic Rare', 'query_mythic', true);
	cont.appendTo(filters);
	
	var cont = $('<div class="buttons_container"></div>');

	var icd = $('<div class="input_container auto_width"></div>');
	var label = $('<label style="display: table">CMC:</label>');
	label.appendTo(icd);
	var input = $('<input type="number" id="query_cmc" autocomplete="off" />');
	input.appendTo(icd);
	icd.appendTo(cont);

	add_checkbox_search(cont, 'Lower than', 'query_cmclower', false);
	add_checkbox_search(cont, 'Equal to', 'query_cmcequal', true);
	add_checkbox_search(cont, 'Higher than', 'query_cmchigher', false);
	
	cont.appendTo(filters);
	
	$("#ux_0").append(basicFilters);
	$("#ux_0").append(filters);
	$("#ux_0").append(div);


    $('#query_cmclower').change(function() {
        if (document.getElementById("query_cmclower").checked == true) {
            document.getElementById("query_cmchigher").checked = false;
        }
    });

    $('#query_cmchigher').change(function() {
        if (document.getElementById("query_cmchigher").checked == true) {
            document.getElementById("query_cmclower").checked = false;
        }
    });

	filterCmcLower 	= document.getElementById("query_cmclower");
	filterCmcEqual 	= document.getElementById("query_cmcequal");
	filterCmcHigher = document.getElementById("query_cmchigher");

	printCards();
}

//
function add_checkbox_search(div, label, iid, def) {
	var label = $('<label class="check_container hover_label">'+label+'</label>');
	var check_new = $('<input type="checkbox" id="'+iid+'" />');
	check_new.appendTo(label);
	check_new.prop('checked', def);

	var span = $('<span class="checkmark"></span>');
	span.appendTo(label);
	label.appendTo(div);
}

function expandFilters() {
	var div = $('.inventory_filters');
	if (div.css('opacity') == 1) {
		div.css('height', '0px');
		div.css('opacity', 0);
		$('.inventory').show();

	}
	else {
		div.css('height', 'calc(100% - 122px)');
		div.css('opacity', 1);
		setTimeout(function() {
			$('.inventory').hide();
		}, 200);
	}
}

function resetFilters() {
	filteredSets = [];
	filteredMana = [];
	
	$(".set_filter").each(function( index ) {
		$( this ).removeClass('set_filter_on');
		$( this ).addClass('set_filter_on');
	});
	$(".mana_filter").each(function( index ) {
		$( this ).removeClass('mana_filter_on');
		$( this ).addClass('mana_filter_on');
	});

	document.getElementById("query_name").value = "";
	document.getElementById("query_type").value = "";
	document.getElementById("query_unown").checked = false;
	document.getElementById("query_new").checked = false;
	document.getElementById("query_multicolor").checked = false;
	document.getElementById("query_exclude").checked = false;

	document.getElementById("query_common").checked = true;
	document.getElementById("query_uncommon").checked = true;
	document.getElementById("query_rare").checked = true;
	document.getElementById("query_mythic").checked = true;

	document.getElementById("query_cmc").value = "";
	document.getElementById("query_cmclower").checked = false;
	document.getElementById("query_cmcequal").checked = true;
	document.getElementById("query_cmchigher").checked = false;

	printCards();
}

//
function exportCollection() {
	var list = get_collection_export();
	ipc_send('export_csvtxt', {str: list, name: "collection"});
}

//
function printStats() {
	$('.moving_ux').animate({ 'left': '-100%' }, 250, 'easeInOutCubic');
	$("#ux_1").html('');
	const stats = get_collection_stats();

	const top = $('<div class="decklist_top"><div class="button back"></div><div class="deck_name">Collection Statistics</div></div>');
	change_background("http://www.artofmtg.com/wp-content/uploads/2018/04/Urzas-Tome-Dominaria-MtG-Art.jpg");

	const flex = $('<div class="flex_item"></div>');
	const mainstats = $('<div class="main_stats"></div>');

	$('<label>Sets Completion</label>').appendTo(mainstats);

	// each set stats
	for (let set in setsList) {
		renderSetStats(stats[set], setsList[set].code, set).appendTo(mainstats);
	}

	// Complete collection sats
	renderSetStats(stats.complete, "pw", "Complete collection").appendTo(mainstats);

	// Singleton collection sats
	renderSetStats(stats.singles, "pw", "Singles").appendTo(mainstats);

	const substats = $('<div class="main_stats sub_stats"></div>');

	flex.append(mainstats);
	flex.append(substats);

	$("#ux_1").append(top);
	$("#ux_1").append(flex);
	//
	$(".back").click(function () {
		change_background("default");
		$('.moving_ux').animate({ 'left': '0px' }, 250, 'easeInOutCubic');
	});
}

//
function renderSetStats(setStats, setIconCode, setName) {
	const setDiv = renderCompletionDiv(setStats.all, 'sets/' + setIconCode + '.png', setName);

	setDiv.click(function () {
		const substats = $(".sub_stats");
		substats.html('');
		$('<label>' + setName + ' completion</label>').appendTo(substats);
		["common", "uncommon", "rare", "mythic"].forEach(rarity => {
			const countStats = setStats[rarity];
			if (countStats.total > 0) {
				const capitalizedRarity = rarity[0].toUpperCase() + rarity.slice(1) + 's';
				renderCompletionDiv(countStats, 'wc_' + rarity + '.png', capitalizedRarity).appendTo(substats);
			}
		});
	});

	return setDiv;
}

//
function renderCompletionDiv(countStats, image, title) {
	const completionDiv = $('<div class="stats_set_completion"></div>');
	$('<div class="stats_set_icon" style="background-image: url(../images/' + image + ')"><span>' + title + ' <i>(' + countStats.owned + '/' + countStats.total + ', ' + Math.round(countStats.percentage) + '%)</i></span></div>')
		.appendTo(completionDiv);
	$('<div class="stats_set_bar" style="width: ' + countStats.percentage + '%"></div>')
		.appendTo(completionDiv);
	return completionDiv;
}

function sortCollection(alg) {
	sortingAlgorithm = alg;
	printCards();
}

//
function printCards() {
	var div = $('.inventory_filters');
	div.css('height', '0px');
	div.css('opacity', 0);
	$('.inventory').show();

	div = $(".inventory");
	div.html('');

	var paging = $('<div class="paging_container"></div>');
	div.append(paging);

	filterName  	= document.getElementById("query_name").value.toLowerCase();
	filterType  	= document.getElementById("query_type").value.toLowerCase();
	filterUnown		= document.getElementById("query_unown").checked;
	filterNew   	= document.getElementById("query_new");
	filterMulti 	= document.getElementById("query_multicolor");
	filterExclude 	= document.getElementById("query_exclude");

	filterCommon 	= document.getElementById("query_common");
	filterUncommon 	= document.getElementById("query_uncommon");
	filterRare 		= document.getElementById("query_rare");
	filterMythic 	= document.getElementById("query_mythic");

	filterCMC  		= document.getElementById("query_cmc").value;
	filterCmcLower 	= document.getElementById("query_cmclower").checked;
	filterCmcEqual 	= document.getElementById("query_cmcequal").checked;
	filterCmcHigher = document.getElementById("query_cmchigher").checked;

	var totalCards = 0;
	if (filterUnown) {
		var list = cardsDb.getAll();
	}
	else {
		var list = cards;
	}
	
	if (sortingAlgorithm == 'Set')
		var keysSorted = Object.keys(list).sort( collectionSortSet );
	if (sortingAlgorithm == 'Name')
		var keysSorted = Object.keys(list).sort( collectionSortName );
	if (sortingAlgorithm == 'Rarity')
		var keysSorted = Object.keys(list).sort( collectionSortRarity );
	if (sortingAlgorithm == 'CMC')
		var keysSorted = Object.keys(list).sort( collectionSortCmc );

    for (n=0; n<keysSorted.length; n++) {
		let key = keysSorted[n];
	
		let grpId = key;
		let card = cardsDb.get(grpId);
    	let doDraw = true;

    	let name = card.name.toLowerCase();
    	let type = card.type.toLowerCase();
    	let rarity = card.rarity;
    	let cost = card.cost;
    	let cmc = card.cmc;
    	let set  = card.set;

    	// Filter name
    	var arr;
    	arr = filterName.split(" ");
    	arr.forEach(function(s) {
			if (name.indexOf(s) == -1) {
				doDraw = false;
			}
    	})

    	// filter type
    	arr = filterType.split(" ");
    	arr.forEach(function(s) {
			if (type.indexOf(s) == -1) {
				doDraw = false;
			}
    	})

    	if (filterNew.checked && cardsNew[key] == undefined) {
    		doDraw = false;
    	}

    	if (filteredSets.length > 0) {
	    	if (!filteredSets.includes(set)) {
	    		doDraw = false;
	    	}
    	}

    	if (filterCMC && doDraw) {
    		if (filterCmcLower && filterCmcEqual) {
    			if (cmc > filterCMC) {
    				doDraw = false;
    			}
    		}
    		else if (filterCmcHigher && filterCmcEqual) {
    			if (cmc < filterCMC) {
    				doDraw = false;
    			}
    		}
    		else if (filterCmcLower && !filterCmcEqual) {
    			if (cmc >= filterCMC) {
    				doDraw = false;
    			}
    		}
    		else if (filterCmcHigher && !filterCmcEqual) {
    			if (cmc <= filterCMC) {
    				doDraw = false;
    			}
    		}
    		else if (!filterCmcHigher && !filterCmcLower && filterCmcEqual) {
    			if (cmc != filterCMC) {
    				doDraw = false;
    			}
    		}
    	}

    	switch (rarity) {
    		case 'land':
    			if (!filterCommon.checked) 		doDraw = false; break;
    		case 'common':
    			if (!filterCommon.checked) 		doDraw = false; break;
    		case 'uncommon':
    			if (!filterUncommon.checked) 	doDraw = false; break;
    		case 'rare':
    			if (!filterRare.checked) 		doDraw = false; break;
    		case 'mythic':
    			if (!filterMythic.checked) 		doDraw = false; break;
			default:
				doDraw = false;
    			break;
		}

		if (filterExclude.checked && cost.length == 0) {
			doDraw = false;
		}
		else {
			let s = [];
			let generic = false;
			cost.forEach(function(m) {
				if (m.indexOf('w') !== -1) {
					if (filterExclude.checked && !filteredMana.includes(1)) {
						doDraw = false;
					}
					s[1] = 1;
				}
				if (m.indexOf('u') !== -1) {
					if (filterExclude.checked && !filteredMana.includes(2)) {
						doDraw = false;
					}
					s[2] = 1;
				}
				if (m.indexOf('b') !== -1) {
					if (filterExclude.checked && !filteredMana.includes(3)) {
						doDraw = false;
					}
					s[3] = 1;
				}
				if (m.indexOf('r') !== -1) {
					if (filterExclude.checked && !filteredMana.includes(4)) {
						doDraw = false;
					}
					s[4] = 1;
				}
				if (m.indexOf('g') !== -1) {
					if (filterExclude.checked && !filteredMana.includes(5)) {
						doDraw = false;
					}
					s[5] = 1;
				}
				if (parseInt(m) > 0) {
					generic = true;
				}
				/*
				if (m.color < 6 && m.color > 0) {
					s[m.color] = 1;
					if (filterExclude.checked && !filteredMana.includes(m.color)) {
						doDraw = false;
					}
				}
				if (m.color > 6) {
					generic = true;
				}
				*/
			});
			let ms = s.reduce((a, b) => a + b, 0);
			if ((generic && ms == 0) && filterExclude.checked) {
				doDraw = false;
			}
			if (filteredMana.length > 0) {
				let su = 0;
				filteredMana.forEach( function(m) {
					if (s[m] == 1) {
						su ++;
					}
				});
				if (su == 0) {
					doDraw = false;
				}
			}
			if (filterMulti.checked && ms < 2) {
				doDraw = false;
			}
		}

    	if (doDraw) {
    		totalCards++;
    	}

    	if (totalCards < collectionPage*100 || totalCards > collectionPage*100+99) {
    		doDraw = false;
    	}

		let dfc = '';
		if (card.dfc == 'DFC_Back')	 dfc = 'a';
		if (card.dfc == 'DFC_Front') dfc = 'b';
		if (card.dfc == 'SplitHalf') dfc = 'a';
		if (dfc == 'b') {
			doDraw = false;
		}

    	if (doDraw) {
	        var d = $('<div style="width: '+cardSize+'px !important;" class="inventory_card"></div>');

	        for (let i=0; i<4; i++) {
	        	if (cardsNew[key] != undefined && i < cardsNew[key]) {
				    $('<div style="width: '+cardSize/4+'px;" class="inventory_card_quantity_orange"></div>').appendTo(d);
	        	}
	        	else if (i < cards[key]) {
			        $('<div style="width: '+cardSize/4+'px;" class="inventory_card_quantity_green"></div>').appendTo(d);
	        	}
	        	else {
			        $('<div style="width: '+cardSize/4+'px;" class="inventory_card_quantity_gray"></div>').appendTo(d);
	        	}
	        }

	        var img = $('<img style="width: '+cardSize+'px !important;" class="inventory_card_img"></img>');
	        img.attr("src", "https://img.scryfall.com/cards"+card.images[cardQuality]);
			img.appendTo(d);

			addCardHover(img, card);

			img.on('click', function(e) {
				if (cardsDb.get(grpId).dfc == 'SplitHalf')	{
					card = cardsDb.get(card.dfcId);
				}
				let newname = card.name.split(' ').join('-');

				shell.openExternal('https://scryfall.com/card/'+get_set_scryfall(card.set)+'/'+card.cid+'/'+card.name);
			});

			d.appendTo(div);
		}
    }

	var paging_bottom = $('<div class="paging_container"></div>');
	div.append(paging_bottom);

	if (collectionPage <= 0) {
		but = $('<div class="paging_button_disabled"> \< </div>');
	}
	else {
		but = $('<div class="paging_button" onClick="setCollectionPage('+(collectionPage-1)+')"> \< </div>');
	}

	paging.append(but);
	paging_bottom.append(but.clone());

	var totalPages = Math.ceil(totalCards / 100);
	for (var n=0; n<totalPages; n++) {
		but = $('<div class="paging_button" onClick="setCollectionPage('+(n)+')">'+n+'</div>');
		if (collectionPage == n) {
			but.addClass("paging_active");
		}
		paging.append(but);
		paging_bottom.append(but.clone());
	}
	if (collectionPage >= totalPages-1) {
		but = $('<div class="paging_button_disabled"> \> </div>');
	}
	else {
		but = $('<div class="paging_button" onClick="setCollectionPage('+(collectionPage+1)+')"> \> </div>');
	}
	paging.append(but);
	paging_bottom.append(but.clone());
}


//
function setCollectionPage(page) {
	collectionPage = page;
	printCards();
}

//
function add_checkbox(div, label, iid, def) {
	var label = $('<label class="check_container hover_label">'+label+'</label>');
	label.appendTo(div);
	var check_new = $('<input type="checkbox" id="'+iid+'" onclick="updateSettings()" />');
	check_new.appendTo(label);
	check_new.prop('checked', def);

	var span = $('<span class="checkmark"></span>');
	span.appendTo(label);
}

//
function open_settings(openSection) {
	lastSettingsSection = openSection;
    change_background("default");
	$("#ux_0").off();
	$("#history_column").off();
	$("#ux_0").html('');
	$("#ux_0").addClass('flex_item');

	var wrap_l = $('<div class="wrapper_column sidebar_column_r"></div>');
	$('<div class="settings_nav sn1" style="margin-top: 28px;" >Behaviour</div>').appendTo(wrap_l);
	$('<div class="settings_nav sn2">Overlay</div>').appendTo(wrap_l);
	$('<div class="settings_nav sn3">Visual</div>').appendTo(wrap_l);
	$('<div class="settings_nav sn4">Privacy</div>').appendTo(wrap_l);
	$('<div class="settings_nav sn5">About</div>').appendTo(wrap_l);
	var wrap_r = $('<div class="wrapper_column"></div>');
	var div = $('<div class="settings_page"></div>');
	var section;

	//
	section = $('<div class="settings_section ss1"></div>');
	section.appendTo(div);
	section.append('<div class="settings_title">Behaviour</div>');
	
	add_checkbox(section, 'Launch on startup', 'settings_startup', settings.startup);
	add_checkbox(section, 'Close main window on match found', 'settings_closeonmatch', settings.close_on_match);
	add_checkbox(section, 'Close to tray', 'settings_closetotray', settings.close_to_tray);
	add_checkbox(section, 'Sound when priority changes', 'settings_soundpriority', settings.sound_priority);


    var label = $('<label class="but_container_label">Export Format:</label>');
    label.appendTo(section);
    var icd = $('<div class="input_container"></div>');
    var export_input = $('<input type="search" id="settings_export_format" autocomplete="off" value="'+settings.export_format+'" />');
    export_input.appendTo(icd);
    icd.appendTo(label);

    section.append('<label style="color: rgba(250, 229, 210, 0.75); font-size: 14px; margin-left: 16px;"><i>Possible variables: $Name, $Count, $SetName, $SetCode, $Collector, $Rarity, $Type, $Cmc</i></label>');
    

	section = $('<div class="settings_section ss2"></div>');
	section.appendTo(div);
	section.append('<div class="settings_title">Overlay</div>');
	
	add_checkbox(section, 'Always on top', 'settings_overlay_ontop', settings.overlay_ontop);
	add_checkbox(section, 'Show overlay', 'settings_showoverlay', settings.show_overlay);
	add_checkbox(section, 'Persistent overlay <i>(useful for OBS setup)</i>', 'settings_showoverlayalways', settings.show_overlay_always);

	add_checkbox(section, 'Show top bar', 'settings_overlay_top', settings.overlay_top);
	add_checkbox(section, 'Show title', 'settings_overlay_title', settings.overlay_title);
	add_checkbox(section, 'Show deck/lists', 'settings_overlay_deck', settings.overlay_deck);
	add_checkbox(section, 'Show clock', 'settings_overlay_clock', settings.overlay_clock);
	add_checkbox(section, 'Show sideboard', 'settings_overlay_sideboard', settings.overlay_sideboard);

	//
	section = $('<div class="settings_section ss3"></div>');
	section.appendTo(div);
	section.append('<div class="settings_title">Visual</div>');

    var label = $('<label class="but_container_label">Background URL:</label>');
    label.appendTo(section);

    var icd = $('<div class="input_container"></div>');
    var url_input = $('<input type="search" id="query_image" autocomplete="off" value="'+settings.back_url+'" />');
    url_input.appendTo(icd);
    icd.appendTo(label);

    var label = $('<label class="but_container_label">Background shade:</label>');
    var colorPick = $('<input type="text" id="flat" class="color_picker" />');
    colorPick.appendTo(label);
    label.appendTo(section);
    colorPick.spectrum({
        showInitial: true,
        showAlpha: true,
        showButtons: false
    });
    colorPick.spectrum("set", settings.back_color);

    colorPick.on('move.spectrum', function(e, color) {
        $('.main_wrapper').css('background-color', color.toRgbString());
        updateSettings();
    });

	var label = $('<label class="but_container_label">Cards quality:</label>');
	label.appendTo(section);
	var button = $('<div class="button_simple button_long" style="margin-left: 32px;" onclick="changeQuality(this)">'+cardQuality+'</div>');
	button.appendTo(label);

	var slider = $('<div class="slidecontainer_settings"></div>');
	slider.appendTo(section);
	var sliderlabel = $('<label style="width: 400px; !important" class="card_size_container">Cards size: '+cardSize+'px</label>');
	sliderlabel.appendTo(slider);
	var sliderInput = $('<input type="range" min="0" max="20" value="'+cardSizePos+'" class="slider sliderA" id="myRange">');
	sliderInput.appendTo(slider);

	var d = $('<div style="width: '+cardSize+'px; !important" class="inventory_card_settings"></div>');
	var img = $('<img style="width: '+cardSize+'px; !important" class="inventory_card_settings_img"></img>');
	
	img.attr("src", "https://img.scryfall.com/cards/"+cardQuality+"/en/m19/"+Math.round(Math.random()*314)+".jpg");
	img.appendTo(d);

	d.appendTo(slider);

	//
	section = $('<div class="settings_section ss4"></div>');
	section.appendTo(div);
	section.append('<div class="settings_title">Privacy</div>');
	add_checkbox(section, 'Anonymous sharing <i>(makes your username anonymous on Explore)</i>', 'settings_anon_explore', settings.anon_explore);
	add_checkbox(section, 'Online sharing <i>(when disabled, blocks any connections with our servers)</i>', 'settings_senddata', settings.send_data);

	var label = $('<label class="check_container_but"></label>');
	label.appendTo(section);
	var button = $('<div class="button_simple button_long" onclick="eraseData()">Erase my shared data</div>');
	button.appendTo(label);

	//
	section = $('<div class="settings_section ss5" style="height: 100%;"></div>');
	section.appendTo(div);
	//section.append('<div class="settings_title">About</div>');

	var about = $('<div class="about"></div>');
	about.append('<div class="top_logo_about"></div>');
	about.append('<div class="message_sub_15 white">By Manuel Etchegaray, 2018</div>');
	about.append('<div class="message_sub_15 white">Version '+window.electron.remote.app.getVersion()+'</div>');


	if (updateState.state == 0) {
		about.append('<div class="message_updates white">Checking for updates..</div>');
	}
	if (updateState.state == 1) {
		about.append('<div class="message_updates green">Update available.</div>');
		about.append('<a class="release_notes_link">Release Notes</a>');
	}
	if (updateState.state == -1) {
		about.append('<div class="message_updates green">Client is up to date.</div>');
	}
	if (updateState.state == -2) {
		about.append('<div class="message_updates red">Error updating.</div>');
	}
	if (updateState.state == 2) {
		about.append('<div class="message_updates green">Donwloading ('+updateState.progress+'%)</div>');
		about.append('<a class="release_notes_link">Release Notes</a>');
	}
	if (updateState.state == 3) {
		about.append('<div class="message_updates green">Download complete.</div>');
		about.append('<a class="release_notes_link">Release Notes</a>');
		about.append('<div class="button_simple" onClick="installUpdate()">Install</div>');
	}

	about.append('<div class="flex_item" style="width: 160px; margin: 64px auto 0px auto;"><div class="twitter_link"></div><div class="git_link"></div></div>');
	about.appendTo(section);

	$(".top_logo_about").click(function() {
		shell.openExternal('https://mtgatool.com');
	});

	$(".twitter_link").click(function() {
		shell.openExternal('https://twitter.com/MEtchegaray7');
	});

	$(".git_link").click(function() {
		shell.openExternal('https://github.com/Manuel-777/MTG-Arena-Tool');
	});

	$(".release_notes_link").click(function() {
		shell.openExternal('https://mtgatool.com/release-notes/');
	});

	div.appendTo(wrap_r);
	$("#ux_0").append(wrap_l);
	$("#ux_0").append(wrap_r);

	$(".ss"+openSection).show();
	$(".sn"+openSection).addClass("nav_selected");

	$(".settings_nav").click(function () {
		if (!$(this).hasClass("nav_selected")) {
			$(".settings_nav").each(function(index) {
				$(this).removeClass("nav_selected");
			});
			$(".settings_section").each(function(index) {
				$(this).hide();
			});

			$(this).addClass("nav_selected");

			if ($(this).hasClass("sn1")) {
				sidebarActive = 8;
				lastSettingsSection = 1;
				$(".ss1").show();
			}
			if ($(this).hasClass("sn2")) {
				sidebarActive = 8;
				lastSettingsSection = 2;
				$(".ss2").show();
			}
			if ($(this).hasClass("sn3")) {
				sidebarActive = 8;
				lastSettingsSection = 3;
				$(".ss3").show();
			}
			if ($(this).hasClass("sn4")) {
				sidebarActive = 8;
				lastSettingsSection = 4;
				$(".ss4").show();
			}
			if ($(this).hasClass("sn5")) {
				sidebarActive = 9;
				lastSettingsSection = 5;
				$(".ss5").show();
			}
		}
	});


    url_input.on('keyup', function (e) {
        if (e.keyCode == 13) {
            updateSettings();
        }
    });

    export_input.on('keyup', function (e) {
        if (e.keyCode == 13) {
            updateSettings();
        }
    });

	$(".sliderA").off();

	$(".sliderA").on('click mousemove', function() {
		cardSizePos = Math.round(parseInt(this.value));
		cardSize = 100+(cardSizePos*10);
		sliderlabel.html('Cards size: '+cardSize+'px');

		$('.inventory_card_settings').css('width', '');
		var styles = $('.inventory_card_settings').attr('style');
		styles += 'width: '+cardSize+'px !important;'
		$('.inventory_card_settings').attr('style', styles);

		$('.inventory_card_settings_img').css('width', '');
		var styles = $('.inventory_card_settings_img').attr('style');
		styles += 'width: '+cardSize+'px !important;'
		$('.inventory_card_settings_img').attr('style', styles);
	});

	$(".sliderA").on('click mouseup', function() {
		cardSizePos = Math.round(parseInt(this.value));
		updateSettings();
	});

	$(".sliderB").off();

	$(".sliderB").on('click mousemove', function() {
		overlayAlpha = parseInt(this.value)/10;
		alphasliderlabel.html('Overlay transparency: '+overlayAlpha);
	});

	$(".sliderB").on('click mouseup', function() {
		overlayAlpha = parseInt(this.value)/10;
		updateSettings();
	});

}

//
function change_background(arg) {
    if (arg == "default") {
        arg = defaultBackground;
    }
    if (arg == "") {
        $('.main_wrapper').css("background-image", "");
    }
    else if (fs.existsSync(arg)) {
        $('.main_wrapper').css("background-image", "url("+arg+")");
    }
    else {
        $.ajax({
            url: arg,
            type:'HEAD',
            error: function()
            {
                $('.main_wrapper').css("background-image", "");
            },
            success: function()
            {
                $('.main_wrapper').css("background-image", "url("+arg+")");
            }
        });
    }
}

//
function changeQuality(dom) {
	if (cardQuality == "normal") {
		cardQuality = "large";
	}
	else if (cardQuality == "large") {
		cardQuality = "small";
	}
	else if (cardQuality == "small") {
		cardQuality = "normal";
	}
	dom.innerHTML = cardQuality;
	updateSettings();
	open_settings(lastSettingsSection);
}

//
function eraseData() {
	if (confirm('This will erase all of your decks and events shared online, are you sure?')) {
		ipc_send('renderer_erase_data', true);
	} else {
		return;
	}
}

//
function updateSettings() {
	var startup = document.getElementById("settings_startup").checked;
	var showOverlay = document.getElementById("settings_showoverlay").checked;
	var showOverlayAlways = document.getElementById("settings_showoverlayalways").checked;
	var soundPriority = document.getElementById("settings_soundpriority").checked;

    var backColor = $(".color_picker").spectrum("get").toRgbString();
    var backUrl = document.getElementById("query_image").value;
    defaultBackground = backUrl;
    change_background(backUrl);

	var overlayOnTop = document.getElementById("settings_overlay_ontop").checked;
	var closeToTray = document.getElementById("settings_closetotray").checked;
	var sendData = document.getElementById("settings_senddata").checked;
	var anonExplore = document.getElementById("settings_anon_explore").checked;

	var closeOnMatch = document.getElementById("settings_closeonmatch").checked;

	var overlayTop = document.getElementById("settings_overlay_top").checked;
	var overlayTitle = document.getElementById("settings_overlay_title").checked;
	var overlayDeck = document.getElementById("settings_overlay_deck").checked;
	var overlayClock = document.getElementById("settings_overlay_clock").checked;
	var overlaySideboard = document.getElementById("settings_overlay_sideboard").checked;

    var exportFormat = document.getElementById("settings_export_format").value;

	settings = {
		sound_priority: soundPriority,
		show_overlay: showOverlay,
		show_overlay_always: showOverlayAlways,
		startup: startup,
		close_to_tray: closeToTray,
		send_data: sendData,
		close_on_match: closeOnMatch,
		cards_size: cardSizePos,
		cards_quality: cardQuality,
		overlay_alpha: overlayAlpha,
		overlay_top: overlayTop,
		overlay_title: overlayTitle,
		overlay_deck: overlayDeck,
		overlay_clock: overlayClock,
		overlay_sideboard: overlaySideboard,
		overlay_ontop: overlayOnTop,
        anon_explore: anonExplore,
        back_color: backColor,
        back_url: backUrl,
        export_format: exportFormat
	};
	cardSize = 100+(cardSizePos*10);
	ipc_send('save_settings', settings);
}

//
function getDeckWinrate(deckid, lastEdit) {
	var wins = 0;
	var loss = 0;
	var winsLastEdit = 0;
	var lossLastEdit = 0;
	var winColors = {w: 0, u: 0, b: 0, r: 0, g:0};
	var lossColors = {w: 0, u: 0, b: 0, r: 0, g:0};
	if (matchesHistory == undefined) {
		return 0;
	}
	matchesHistory.matches.forEach(function(matchid, index) {
		match = matchesHistory[matchid];
		if (matchid != null && match != undefined) {
			if (match.type == "match") {
				if (match.playerDeck.id == deckid) {
					if (match.player.win > match.opponent.win) {
						winColors = add_deck_colors(winColors, match.oppDeck.mainDeck);
						wins++;
					}
					else {
						lossColors = add_deck_colors(lossColors, match.oppDeck.mainDeck);
						loss++;
					}
					if (match.date > lastEdit) {
						if (match.player.win > match.opponent.win) {
							winsLastEdit++;
						}
						else {
							lossLastEdit++;
						}
					}
				}
			}
		}
	});

	if (wins == 0) {
		return 0;
	}

	var winrate = Math.round((1/(wins+loss)*wins) * 100) / 100;
	var winrateLastEdit = Math.round((1/(winsLastEdit+lossLastEdit)*winsLastEdit) * 100) / 100;
	if (winsLastEdit == 0)	winrateLastEdit = 0;
	return {total: winrate, lastEdit: winrateLastEdit, winColors: winColors, lossColors: lossColors};
}

//
function sort_decks() {
	decks.sort(compare_decks); 
	decks.forEach(function(deck) {
		deck.colors = [];
		deck.colors = get_deck_colors(deck);
		deck.mainDeck.sort(compare_cards); 
	});
}

//
function compare_decks(a, b) {
	a = Date.parse(a.lastUpdated);
	b = Date.parse(b.lastUpdated);
	if (a < b)	return 1;
	if (a > b)	return -1;
	return 0;
}

//
function compare_changes(a, b) {
	a = Date.parse(a.date);
	b = Date.parse(b.date);
	if (a < b)	return 1;
	if (a > b)	return -1;
	return 0;
}

//
function compare_changes_inner(a, b) {
	a = a.quantity;
	b = b.quantity;
	if (a > 0 && b > 0) {
		if (a < b)	return -1;
		if (a > b)	return 1;
	}
	if (a < 0 && b < 0) {
		if (a < b)	return 1;
		if (a > b)	return -1;
	}
	if (a < 0 && b > 0) {
		return -1;
	}
	if (a > 0 && b < 0) {
		return 1;
	}
	return 0;
}

//
function sort_history() {
	matchesHistory.matches.sort(compare_matches); 

	matchesHistory.matches.forEach(function(mid) {
		var match = matchesHistory[mid];

		if (mid != null && match != undefined) {
			if (match.type != "draft") {
				if (match.playerDeck.mainDeck == undefined) {
					match.playerDeck = JSON.parse('{"deckTileId":67003,"description":null,"format":"Standard","colors":[],"id":"00000000-0000-0000-0000-000000000000","isValid":false,"lastUpdated":"2018-05-31T00:06:29.7456958","lockedForEdit":false,"lockedForUse":false,"mainDeck":[],"name":"Undefined","resourceId":"00000000-0000-0000-0000-000000000000","sideboard":[]}');
				}
				else {
					match.playerDeck.colors = get_deck_colors(match.playerDeck);
				}

				match.playerDeck.mainDeck.sort(compare_cards);

				match.oppDeck.colors = get_deck_colors(match.oppDeck);
				match.oppDeck.mainDeck.sort(compare_cards);
			}
		}
	});
}

//
function compare_matches(a, b) {
	if (a == undefined)
		return -1;
	if (b == undefined)
		return 1;

	a = matchesHistory[a];
	b = matchesHistory[b];

	if (a == undefined)
		return -1;
	if (b == undefined)
		return 1;

	a = Date.parse(a.date);
	b = Date.parse(b.date);
	if (a < b)	return 1;
	if (a > b)	return -1;
	return 0;
}

//
function compare_courses(a, b) {
	if (a == undefined)
		return -1;
	if (b == undefined)
		return 1;

	a = eventsHistory[a];
	b = eventsHistory[b];

	if (a == undefined)
		return -1;
	if (b == undefined)
		return 1;

	a = Date.parse(a.date);
	b = Date.parse(b.date);
	if (a < b)	return 1;
	if (a > b)	return -1;
	return 0;
}

//
function compare_economy(a, b) {
	if (a == undefined)
		return -1;
	if (b == undefined)
		return 1;

	a = economyHistory[a];
	b = economyHistory[b];

	if (a == undefined)
		return -1;
	if (b == undefined)
		return 1;

	a = Date.parse(a.date);
	b = Date.parse(b.date);
	if (a < b)	return 1;
	if (a > b)	return -1;
	return 0;
}



function compare_explore(a, b) {
	var awlrate = a.wins-a.losses;
	var bwlrate = b.wins-b.losses;

	if (awlrate > bwlrate)	return -1;
	if (awlrate < bwlrate)	return 1;
	return 0;
}
