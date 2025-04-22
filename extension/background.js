// Background script for the extension
let apiEndpoint = 'http://localhost:5000/detect';

// Initialize settings
chrome.runtime.onInstalled.addListener(() => {
  const defaultSettings = {
    enabled: true,  // Extension enabled by default
    aiThreshold: 0.7,  // Threshold to mark content as AI-generated
    apiEndpoint: apiEndpoint,  // API endpoint for detection
    completelyRemove: false,  // Default to showing banner instead of completely removing posts
    skipShortContent: true  // Default to skipping API checks for short content
  };
  
  chrome.storage.sync.set(defaultSettings, () => {
    console.log('Default settings initialized', defaultSettings);
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getSettings') {
    chrome.storage.sync.get(['enabled', 'aiThreshold', 'apiEndpoint', 'completelyRemove', 'skipShortContent'], (data) => {
      sendResponse(data);
    });
    return true;  // Required to use sendResponse asynchronously
  }
  
  if (message.type === 'updateSettings') {
    chrome.storage.sync.set(message.settings, () => {
      // Notify all tabs about the settings change
      notifyAllTabs(message.settings);
      sendResponse({ success: true });
    });
    return true;  // Required to use sendResponse asynchronously
  }
});

// Function to notify all tabs about settings changes
function notifyAllTabs(settings) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      // Only send to Reddit tabs
      if (tab.url && tab.url.includes('reddit.com')) {
        chrome.tabs.sendMessage(tab.id, { 
          type: 'settingsChanged', 
          settings: settings 
        }).catch(err => {
          // Ignore errors from tabs that don't have the content script running
          console.log('Could not notify tab', tab.id, err.message);
        });
      }
    });
  });
} 