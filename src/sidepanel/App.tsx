import React, { useState, useEffect, useCallback } from 'react';
import Slider from './components/Slider';
import FlowDiagram from './components/FlowDiagram';
import { Settings, AudioGraphData } from '../shared/types';

const App: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error loading settings:', chrome.runtime.lastError);
        // Only use default settings if there's an error loading
        setSettings({
          enabled: false,
          audioGraph: {
            nodes: [
              { id: '1', type: 'input', params: { speed: 1.0 } },
              { id: '2', type: 'reverb', params: { mix: 0, decay: 1000, size: 50 } },
              { id: '3', type: 'output', params: {} }
            ],
            edges: [
              { id: 'e1-2', source: '1', target: '2' },
              { id: 'e2-3', source: '2', target: '3' }
            ]
          }
        });
      } else if (response) {
        console.log('Loaded settings from background:', response);
        setSettings(response);
      }
      setIsLoading(false);
    });
  }, []);

  const handleGraphChange = useCallback((audioGraph: AudioGraphData) => {
    console.log(`[App] handleGraphChange called with audioGraph:`, audioGraph);
    
    setSettings(prevSettings => {
      const newSettings = {
        ...prevSettings,
        audioGraph
      };
      
      console.log(`[App] Sending UPDATE_SETTINGS to background with settings:`, newSettings);
      
      // Save settings after state update
      chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: newSettings
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error saving settings:', chrome.runtime.lastError.message);
        } else {
          console.log(`[App] UPDATE_SETTINGS response:`, response);
        }
      });
      
      return newSettings;
    });
  }, []);

  const handleEnabledChange = useCallback((enabled: boolean) => {
    setSettings(prevSettings => {
      const newSettings = {
        ...prevSettings,
        enabled
      };
      
      chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: newSettings
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error saving settings:', chrome.runtime.lastError.message);
        }
      });
      
      return newSettings;
    });
  }, []);

  if (isLoading || !settings) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <FlowDiagram 
        audioGraph={settings.audioGraph}
        onGraphChange={handleGraphChange}
        isEnabled={settings.enabled}
        onEnabledChange={handleEnabledChange}
      />
    </div>
  );
};

export default App;