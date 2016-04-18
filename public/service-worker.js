// TODO Why does this have to be in the root of the app?
// TODO Find API for caches/cache

// Bump ths cache name every time you deploy the serviceWorker OR assets.
var cacheName = 'pwa-weather-assets-v14';
var dataCacheName = 'pwa-weather-data-v4';

var dataUrl = 'https://publicdata-weather.firebaseio.com/';

// List of URLs to cache. Curated, but this could easily be part of a build step?
// We also cache '/' vs 'index.html' because both may be valid URLs
var filesToCache = [
	'/',
	'/index.html',
	'/favicon.ico',
	'/scripts/app.js',
	'/styles/inline.css',
	'/images/ic_refresh_white_24px.svg',
	'/images/ic_add_white_24px.svg',
	'/images/partly-cloudy.png',
	'/images/rain.png',
	'/images/wind.png',
	'/images/snow.png',
	'/images/clear.png',
	'/images/sleet.png',
	'/images/fog.png'
];

// When worker is registered for the first time.
self.addEventListener('install', function (event) {
	console.log('serviceWorker/install: cacheName:', cacheName, 'dataCacheName:', dataCacheName);
	event.waitUntil(
		caches.open(cacheName).then(function (cache) {
			console.log('serviceWorker/install: Caching app shell...');
			// Atomic - any URLs fail, whole cache attempt fails.
			return cache.addAll(filesToCache);
		})
	);
});

// Get all cache keys and delete unused ones
self.addEventListener('activate', function (event) {
	console.log('serviceWorker/activate: cacheName:', cacheName, 'dataCacheName:', dataCacheName);
	event.waitUntil(
		caches.keys().then(function (keyList) {
			return Promise.all(keyList.map(function(key) {
				if (key !== cacheName) {
					console.log('serviceWorker/activate: deleting key:', key);
					return caches.delete(key);
				}
			}));
		})
	);
});

// To serve assets from cache, intercept network requests and return from cache instead.
self.addEventListener('fetch', function (event) {

	if (event.request.url.indexOf(dataUrl) === 0) {

		// Data request
		event.respondWith(
			fetch(event.request).then(function(response) {
				return caches.open(dataCacheName).then(function(cache) {
					cache.put(event.request.url, response.clone());
					console.log('serviceWorker/fetch: Data fetched and cached for url:', event.request.url);
					return response;
				});
			})
		);

	} else {

		// Asset request
		event.respondWith(
			caches.match(event.request).then(function (response) {
				// return response || fetch(event.request);
				if (response) {
					return response;
				}
				console.log('serviceWorker/fetch: Remote asset:', event.request.url);
				return fetch(event.request);
			})
		);

	}

});