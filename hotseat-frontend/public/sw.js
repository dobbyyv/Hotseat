// public/sw.js

// 1. Listen for incoming push events from the server
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      // You can drop a small icon-192.png in your public folder later for the logo
      icon: '/icon-192.png', 
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };

    // Keep the service worker alive until the notification is shown
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 2. Handle what happens when the user taps the notification
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Close the popup
  
  // Open the app or focus the existing open tab
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // If the app is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        if (client.url.includes(event.notification.data.url) && 'focus' in client) {
          return client.focus();
        }
      }
      // If the app is closed, open it to the specific URL
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});