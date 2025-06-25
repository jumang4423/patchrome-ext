// This runs in the page context
(function() {
  'use strict';
  
  console.log('Patchrome: Injected script loaded');
  
  let settings = {
    enabled: false,
    speed: 1.0
  };
  
  // Keep track of processed elements
  const processedElements = new WeakSet();
  
  // Update a single media element
  function updateMediaElement(element) {
    if (!element) return;
    
    // Add property descriptor to catch changes
    if (!processedElements.has(element)) {
      processedElements.add(element);
      
      // Store original descriptor
      const originalDescriptor = Object.getOwnPropertyDescriptor(element, 'playbackRate') || 
                               Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
      
      // Override playbackRate property
      Object.defineProperty(element, 'playbackRate', {
        get: function() {
          return originalDescriptor.get.call(this);
        },
        set: function(value) {
          // If we're enabled, ignore external changes and use our speed
          if (settings.enabled) {
            originalDescriptor.set.call(this, settings.speed);
          } else {
            originalDescriptor.set.call(this, value);
          }
        },
        configurable: true
      });
    }
    
    if (settings.enabled) {
      // Set playback rate
      element.playbackRate = settings.speed;
      
      // IMPORTANT: Disable pitch preservation to get pitch shift effect
      if ('preservesPitch' in element) {
        element.preservesPitch = false;
      } else if ('mozPreservesPitch' in element) {
        element.mozPreservesPitch = false;
      } else if ('webkitPreservesPitch' in element) {
        element.webkitPreservesPitch = false;
      }
      
      console.log('Patchrome: Updated element - speed:', settings.speed);
    } else {
      // Reset everything
      element.playbackRate = 1.0;
      
      // Re-enable pitch preservation
      if ('preservesPitch' in element) {
        element.preservesPitch = true;
      }
    }
  }
  
  // Find and update all media elements
  function updateAllMedia() {
    const elements = document.querySelectorAll('audio, video');
    console.log('Patchrome: Updating', elements.length, 'media elements');
    elements.forEach(updateMediaElement);
  }
  
  // Override play method to catch new elements
  const originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function() {
    console.log('Patchrome: Media element playing');
    updateMediaElement(this);
    return originalPlay.apply(this, arguments);
  };
  
  // Listen for settings from content script
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PATCHROME_SETTINGS') {
      settings = event.data.settings;
      console.log('Patchrome: Settings received', settings);
      updateAllMedia();
    }
  });
  
  // Observer for new media elements
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches && (node.matches('audio, video'))) {
              updateMediaElement(node);
            }
            // Check descendants
            const mediaElements = node.querySelectorAll && node.querySelectorAll('audio, video');
            if (mediaElements) {
              mediaElements.forEach(updateMediaElement);
            }
          }
        });
      }
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // More frequent checks for dynamic sites like SoundCloud
  let checkInterval = 500;
  const isSoundCloud = window.location.hostname.includes('soundcloud.com');
  if (isSoundCloud) {
    checkInterval = 100; // More aggressive for SoundCloud
  }
  
  // Check for media elements periodically
  setInterval(updateAllMedia, checkInterval);
  
  // Initial check
  setTimeout(updateAllMedia, 100);
  
  // Additional check after page fully loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateAllMedia);
  }
  window.addEventListener('load', () => {
    setTimeout(updateAllMedia, 1000);
  });
})();