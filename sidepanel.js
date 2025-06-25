const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const reverbSlider = document.getElementById('reverbSlider');
const reverbValue = document.getElementById('reverbValue');

let settings = {
  enabled: true,
  speed: 1.0,
  reverb: 0
};

// Load initial settings
window.addEventListener('load', () => {
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading settings:', chrome.runtime.lastError);
      return;
    }
    if (response) {
      console.log('Loaded settings:', response);
      settings = response;
      updateUI();
    }
  });
});

function updateUI() {
  // Validate speed before setting
  if (isFinite(settings.speed) && settings.speed >= 0.5 && settings.speed <= 1.5) {
    speedSlider.value = settings.speed;
    speedValue.textContent = settings.speed.toFixed(2) + 'x';
  } else {
    // Reset to default if invalid
    settings.speed = 1.0;
    speedSlider.value = 1.0;
    speedValue.textContent = '1.0x';
  }
  
  // Validate reverb before setting
  if (isFinite(settings.reverb) && settings.reverb >= 0 && settings.reverb <= 100) {
    reverbSlider.value = settings.reverb;
    reverbValue.textContent = settings.reverb + '%';
  } else {
    // Reset to default if invalid
    settings.reverb = 0;
    reverbSlider.value = 0;
    reverbValue.textContent = '0%';
  }
}

function saveSettings() {
  console.log('Saving settings:', settings);
  chrome.runtime.sendMessage({
    type: 'UPDATE_SETTINGS',
    settings: settings
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error saving settings:', chrome.runtime.lastError.message);
    }
  });
}

speedSlider.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  // Validate the value to prevent non-finite numbers
  if (isFinite(value) && value > 0 && value <= 4) {
    settings.speed = value;
    speedValue.textContent = settings.speed.toFixed(2) + 'x';
    saveSettings();
  }
});

reverbSlider.addEventListener('input', (e) => {
  const value = parseInt(e.target.value);
  // Validate the value
  if (isFinite(value) && value >= 0 && value <= 100) {
    settings.reverb = value;
    reverbValue.textContent = settings.reverb + '%';
    saveSettings();
  }
});