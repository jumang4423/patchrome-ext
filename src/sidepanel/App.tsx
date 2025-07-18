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
        setSettings(response);
      }
      setIsLoading(false);
    });
  }, []);
  const handleGraphChange = useCallback((audioGraph: AudioGraphData) => {
    setSettings(prevSettings => {
      const newSettings = {
        ...prevSettings,
        audioGraph
      };
      chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: newSettings
      }, (response) => {
        if (chrome.runtime.lastError) {
        } else {
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