// Load settings when popup opens
document.addEventListener('DOMContentLoaded', function() {
  // Get UI elements
  const enabledToggle = document.getElementById('enabled');
  const statusText = document.getElementById('statusText');
  const thresholdSlider = document.getElementById('threshold');
  const thresholdValue = document.getElementById('thresholdValue');
  const completelyRemoveCheckbox = document.getElementById('completelyRemove');
  const skipShortContentCheckbox = document.getElementById('skipShortContent');
  const apiEndpointInput = document.getElementById('apiEndpoint');
  const saveButton = document.getElementById('saveBtn');
  const refreshLink = document.getElementById('refreshPage');
  
  // Load current settings
  chrome.runtime.sendMessage({ type: 'getSettings' }, function(settings) {
    // Set toggle state
    enabledToggle.checked = settings.enabled;
    statusText.textContent = settings.enabled ? 'Enabled' : 'Disabled';
    
    // Set threshold value
    const thresholdPercent = Math.round(settings.aiThreshold * 100);
    thresholdSlider.value = thresholdPercent;
    thresholdValue.textContent = thresholdPercent;
    
    // Set completely remove option
    completelyRemoveCheckbox.checked = settings.completelyRemove || false;
    
    // Set skip short content option (default to true if not set)
    skipShortContentCheckbox.checked = settings.skipShortContent !== false;
    
    // Set API endpoint
    apiEndpointInput.value = settings.apiEndpoint || 'http://localhost:5000/detect';
    
    console.log('Loaded settings', settings);
  });
  
  // Update threshold display when slider moves
  thresholdSlider.addEventListener('input', function() {
    thresholdValue.textContent = this.value;
  });
  
  // Toggle status text when checkbox changes
  enabledToggle.addEventListener('change', function() {
    statusText.textContent = this.checked ? 'Enabled' : 'Disabled';
  });
  
  // Save settings when button is clicked
  saveButton.addEventListener('click', function() {
    const settings = {
      enabled: enabledToggle.checked,
      aiThreshold: thresholdSlider.value / 100,
      completelyRemove: completelyRemoveCheckbox.checked,
      skipShortContent: skipShortContentCheckbox.checked,
      apiEndpoint: apiEndpointInput.value
    };
    
    console.log('Saving settings', settings);
    
    chrome.runtime.sendMessage({ 
      type: 'updateSettings', 
      settings: settings 
    }, function(response) {
      if (response && response.success) {
        // Show success message
        saveButton.textContent = 'Saved!';
        setTimeout(() => {
          saveButton.textContent = 'Save Settings';
        }, 1500);
        
        // Apply settings immediately to current tab if it's Reddit
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (tabs.length > 0 && tabs[0].url && tabs[0].url.includes('reddit.com')) {
            // This will be caught by our listener in content.js
            chrome.tabs.sendMessage(tabs[0].id, { 
              type: 'settingsChanged', 
              settings: settings 
            }).catch(() => {
              // If sending fails, page might need a refresh
              console.log('Could not update active tab, might need refresh');
            });
          }
        });
      } else {
        saveButton.textContent = 'Error!';
        setTimeout(() => {
          saveButton.textContent = 'Save Settings';
        }, 1500);
      }
    });
  });
  
  // Refresh page link
  refreshLink.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length > 0) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
  });
}); 