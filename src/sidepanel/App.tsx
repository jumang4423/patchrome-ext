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
        setSettings(response);
      }
    });
  }, []);

  const saveSettings = (newSettings: Settings) => {
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
      <FlowDiagram 
        speed={settings.speed} 
        reverb={settings.reverb}
        onSpeedChange={handleSpeedChange}
        onReverbChange={handleReverbChange}
      />
    </div>
  );
};

export default App;