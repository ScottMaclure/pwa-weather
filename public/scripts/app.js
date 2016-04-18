(function (undefined) {
	// standard browser globals: window, document, navigator

	var app = {
		isLoading: true,
		hasRequestPending: false,
		selectedCities: {},
		visibleCards: {},
		daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
		keys: {
			ESCAPE: 27
		}
	};

	// Toggles the visibility of the add new city dialog.
	app.toggleAddDialog = function(visible) {
		if (visible) {
			app.addDialog.classList.add('dialog-container--visible');
		} else {
			app.addDialog.classList.remove('dialog-container--visible');
		}
	};

	// Updates a weather card with the latest weather forecast. If the card
	// doesn't already exist, it's cloned from the template.
	app.renderForecastCard = function(data) {

		var card = app.visibleCards[data.key];

		if (!card) {
			card = app.cardTemplate.content.cloneNode(true).children[0];
			card.querySelector('.location').textContent = data.label;
			// card.querySelector('.location').textContent = data.timezone;
			card.removeAttribute('hidden');
			app.container.appendChild(card);
			app.visibleCards[data.key] = card;
		}

		card.querySelector('.description').textContent = data.currently.summary;
		card.querySelector('.date').textContent =
		new Date(data.currently.time * 1000);
		card.querySelector('.current .icon').classList.add(data.currently.icon);
		card.querySelector('.current .temperature .value').textContent =
		Math.round(data.currently.temperature);
		card.querySelector('.current .feels-like .value').textContent =
		Math.round(data.currently.apparentTemperature);
		card.querySelector('.current .precip').textContent =
		Math.round(data.currently.precipProbability * 100) + '%';
		card.querySelector('.current .humidity').textContent =
		Math.round(data.currently.humidity * 100) + '%';
		card.querySelector('.current .wind .value').textContent =
		Math.round(data.currently.windSpeed);
		card.querySelector('.current .wind .direction').textContent =
		data.currently.windBearing;

		var nextDays = card.querySelectorAll('.future .oneday');
		var today = new Date();
		today = today.getDay();
		for (var i = 0; i < 7; i++) {
			var nextDay = nextDays[i];
			var daily = data.daily.data[i];
			if (daily && nextDay) {
				nextDay.querySelector('.date').textContent =
				app.daysOfWeek[(i + today) % 7];
				nextDay.querySelector('.icon').classList.add(daily.icon);
				nextDay.querySelector('.temp-high .value').textContent =
				Math.round(daily.temperatureMax);
				nextDay.querySelector('.temp-low .value').textContent =
				Math.round(daily.temperatureMin);
			}
		}

		if (app.isLoading) {
			app.spinner.setAttribute('hidden', true);
			app.container.removeAttribute('hidden');
			app.isLoading = false;
		}

	};

	/**
	 * Gets a forecast for a specific city and update the card with the data.
	 */
	app.getForecast = function(key, label) {

		var url = 'https://publicdata-weather.firebaseio.com/' + key + '.json';
		var hasRequestPending = true;

		// 1) Render from cache, if supported and present.
		if ('caches' in window) {
			caches.match(url).then(function (response) {
				return response.json();
			}).then(function (json) {
				// Check to avoid cache update after network.
				if (hasRequestPending) {
					console.log('app.getForecast cache key:', key);
					json.key = key;
					json.label = label;
					app.renderForecastCard(json);
				}
			});
		}

		// 2) Make a network request (and cache).
		// Network ALWAYS replaces cache, to keep UI up-to-date.
		fetch(url).then(function (response) {
			return response.json();
		}).then(function (json) {
			console.log('app.getForecast network key:', key);
			hasRequestPending = false;
			json.key = key;
			json.label = label;
			app.renderForecastCard(json);
		}).catch(function (error) {
			// TODO Update UI with error?
			console.error('Failed to load url, error:', error);
		});

	};

	// Iterate all of the cards and attempt to get the latest forecast data
	app.updateForecasts = function() {
		Object.keys(app.selectedCities).forEach(function(key) {
			app.getForecast(key, app.selectedCities[key]);
		});
	};

	app.addCity = function () {
		// Add the newly selected city
		var selected = app.select.options[app.select.selectedIndex];
		var key = selected.value;
		var label = selected.textContent;
		app.getForecast(key, label);
		app.selectedCities[key] = label;
		app.toggleAddDialog(false);
		// Put into local storage.
		app.saveSelectedCities();
	}

	app.saveSelectedCities = function () {
		localStorage.selectedCities = JSON.stringify(app.selectedCities);
	}

	app.loadSelectedCities = function () {
		if (localStorage.selectedCities) {
			app.selectedCities = JSON.parse(localStorage.selectedCities);
		}
	}

	function isEmptyObject(obj) {
		if (Object.getOwnPropertyNames(obj).length > 0) { return false; }
		return true;
	}

	function bindDomElements() {
		// Assign DOM elements to app object.
		app.spinner = document.querySelector('.loader');
		app.container = document.querySelector('.main');
		app.cardTemplate = document.querySelector('#cardTemplate');
		app.addDialog = document.querySelector('.dialog-container');
		app.select = document.getElementById('selectCityToAdd');
	}

	function bindEventHandlers() {

		// Open/show the add new city dialog
		document.getElementById('butAdd').addEventListener('click', function() {
			app.toggleAddDialog(true);
		});

		// Close the add new city dialog
		document.getElementById('butAddCancel').addEventListener('click', function() {
			app.toggleAddDialog(false);
		});

		// Handle escape key for modal.
		document.onkeydown = function(event) {
			if (event.keyCode === app.keys.ESCAPE) {
				app.toggleAddDialog(false);
			}
		};

		document.getElementById('butRefresh').addEventListener('click', app.updateForecasts);

		document.getElementById('butAddCity').addEventListener('click', app.addCity);

	}

	function initApp() {

		bindDomElements();
		bindEventHandlers();

		// Restore user selections from localStorage.
		// Actual data is in window.caches
		app.loadSelectedCities();

		// If no previously saved data, render using default data from server.
		if (isEmptyObject(app.selectedCities)) {

			app.renderForecastCard(initialWeatherForecast);
			app.selectedCities[initialWeatherForecast.key] = initialWeatherForecast.label;
			app.saveSelectedCities();

		} else {

			// Render directly from cached/default JSON data - no XHR!
			Object.keys(app.selectedCities).forEach(function (key) {
				app.getForecast(key, app.selectedCities[key]);
			});

		}

		// Present initial UI after loading.
		app.spinner.hidden = true;
		app.container.hidden = false;

		// For debugging only.
		window.app = app;

	}

	// Wait for document to be loaded.
	document.addEventListener('DOMContentLoaded', initApp);

	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('/service-worker.js')
			.then(function () {
				console.log('Service Worker registered.');
			})
			.catch(function (err) {
				console.error('Failed to load service worker, err:', err);
			});
	}

}());