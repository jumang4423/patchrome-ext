import React, { useState, useEffect, useCallback } from 'react';
import Slider from './components/Slider';
import FlowDiagram from './components/FlowDiagram';
import { Settings, AudioGraphData } from '../shared/types';

const App: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    speed: 1.0,
    reverb: 0,
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
    // Also update in the audio graph
    const inputNode = newSettings.audioGraph.nodes.find(n => n.id === '1');
    if (inputNode) {
      inputNode.params.speed = value;
    }
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleReverbChange = (value: number) => {
    const newSettings = { ...settings, reverb: value };
    // Also update in the audio graph
    const reverbNode = newSettings.audioGraph.nodes.find(n => n.id === '2');
    if (reverbNode) {
      reverbNode.params.mix = value;
    }
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleGraphChange = useCallback((audioGraph: AudioGraphData) => {
    // Update legacy settings based on graph
    const inputNode = audioGraph.nodes.find(n => n.type === 'input');
    const reverbNode = audioGraph.nodes.find(n => n.type === 'reverb');
    
    const newSettings = {
      ...settings,
      speed: inputNode?.params.speed || 1.0,
      reverb: reverbNode?.params.mix || 0,
      audioGraph
    };
    
    setSettings(newSettings);
    saveSettings(newSettings);
  }, [settings]);

  return (
    <div className="container">
      <FlowDiagram 
        speed={settings.speed} 
        reverb={settings.reverb}
        audioGraph={settings.audioGraph}
        onSpeedChange={handleSpeedChange}
        onReverbChange={handleReverbChange}
        onGraphChange={handleGraphChange}
      />
    </div>
  );
};

export default App;