import React, { useState, useEffect, useCallback } from 'react';
import Slider from './components/Slider';
import FlowDiagram from './components/FlowDiagram';
import { Settings, AudioGraphData } from '../shared/types';

const App: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    audioGraph: {
      nodes: [
        { id: '1', type: 'input', params: { speed: 1.0 } },
        { id: '2', type: 'reverb', params: { mix: 0 } },
        { id: '3', type: 'output', params: {} }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' }
      ]
    }
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

  const handleGraphChange = useCallback((audioGraph: AudioGraphData) => {
    setSettings(prevSettings => {
      const newSettings = {
        ...prevSettings,
        audioGraph
      };
      
      // Save settings after state update
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

  return (
    <div className="container">
      <FlowDiagram 
        audioGraph={settings.audioGraph}
        onGraphChange={handleGraphChange}
      />
    </div>
  );
};

export default App;