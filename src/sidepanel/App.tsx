import React, { useState, useEffect } from 'react';
import Slider from './components/Slider';
import FlowDiagram from './components/FlowDiagram';

interface Settings {
  enabled: boolean;
  speed: number;
  reverb: number;
}

const App: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    speed: 1.0,
    reverb: 0
  });

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error loading settings:', chrome.runtime.lastError);
        return;
      }
      if (response) {
        console.log('Loaded settings:', response);
        setSettings(response);
      }
    });
  }, []);

  const saveSettings = (newSettings: Settings) => {
    console.log('Saving settings:', newSettings);
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: newSettings
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error saving settings:', chrome.runtime.lastError.message);
      }
    });
  };

  const handleSpeedChange = (value: number) => {
    const newSettings = { ...settings, speed: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleReverbChange = (value: number) => {
    const newSettings = { ...settings, reverb: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  return (
    <div className="container">
      <Slider
        label="Speed"
        value={settings.speed}
        min={0.5}
        max={1.5}
        step={0.01}
        onChange={handleSpeedChange}
        formatValue={(value) => `${value.toFixed(2)}x`}
      />
      
      <Slider
        label="Reverb"
        value={settings.reverb}
        min={0}
        max={100}
        step={1}
        onChange={handleReverbChange}
        formatValue={(value) => `${value}%`}
      />
      
      <FlowDiagram speed={settings.speed} reverb={settings.reverb} />
    </div>
  );
};

export default App;