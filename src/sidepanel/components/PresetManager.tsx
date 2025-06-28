import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent
} from '../../components/ui/dialog';
import { Plus, Trash2, ChevronRight, Save, FileDown } from 'lucide-react';
import { NodeGraphPreset, PresetsData, PRESETS_STORAGE_KEY, PRESETS_VERSION } from '../../types/presets';
import { Node, Edge } from 'reactflow';

interface PresetManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: (preset: NodeGraphPreset) => void;
  currentNodes: Node[];
  currentEdges: Edge[];
}

const PresetManager: React.FC<PresetManagerProps> = ({ 
  isOpen, 
  onClose, 
  onApplyPreset,
  currentNodes,
  currentEdges 
}) => {
  const [presets, setPresets] = useState<NodeGraphPreset[]>([]);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');

  // Load presets from localStorage
  useEffect(() => {
    const loadPresets = () => {
      try {
        const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
        if (stored) {
          const data: PresetsData = JSON.parse(stored);
          if (data.version === PRESETS_VERSION) {
            setPresets(data.presets);
          }
        }
      } catch (error) {
        console.error('Failed to load presets:', error);
      }
    };

    loadPresets();
  }, []);

  // Save presets to localStorage
  const savePresets = (newPresets: NodeGraphPreset[]) => {
    const data: PresetsData = {
      version: PRESETS_VERSION,
      presets: newPresets
    };
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(data));
      setPresets(newPresets);
    } catch (error) {
      console.error('Failed to save presets:', error);
    }
  };

  // Create new preset from current graph
  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;

    const newPreset: NodeGraphPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      description: newPresetDescription.trim() || undefined,
      nodes: currentNodes.map(node => ({
        id: node.id,
        type: node.type || '',
        position: node.position,
        data: node.data,
        deletable: node.data.deletable !== false
      })),
      edges: currentEdges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined
      })),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updatedPresets = [...presets, newPreset].sort((a, b) => b.createdAt - a.createdAt);
    savePresets(updatedPresets);
    
    setNewPresetName('');
    setNewPresetDescription('');
    setShowSaveInput(false);
  };

  // Delete preset
  const handleDeletePreset = (presetId: string) => {
    const updatedPresets = presets.filter(p => p.id !== presetId);
    savePresets(updatedPresets);
  };

  // Apply preset
  const handleApplyPreset = (preset: NodeGraphPreset) => {
    onApplyPreset(preset);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="preset-manager-dialog">
        <div className="dialog-header">
          <h2>Node Graph Presets</h2>
        </div>

        <div className="preset-sections">
          {/* Save Current Graph Section */}
          <div className="preset-section">
            <h3 className="preset-section-title">Save Current Graph</h3>
            <div className="preset-items">
              {!showSaveInput ? (
                <button
                  className="effect-item save-preset-button"
                  onClick={() => setShowSaveInput(true)}
                >
                  <div className="effect-icon">
                    <Plus size={20} />
                  </div>
                  <div className="effect-info">
                    <h4>Save as New Preset</h4>
                    <p>Save the current node graph configuration</p>
                  </div>
                  <ChevronRight className="effect-arrow" size={16} />
                </button>
              ) : (
                <div className="save-preset-input-container">
                  <input
                    type="text"
                    placeholder="Preset name..."
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePreset();
                      if (e.key === 'Escape') {
                        setShowSaveInput(false);
                        setNewPresetName('');
                        setNewPresetDescription('');
                      }
                    }}
                    autoFocus
                    className="preset-name-input"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)..."
                    value={newPresetDescription}
                    onChange={(e) => setNewPresetDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePreset();
                      if (e.key === 'Escape') {
                        setShowSaveInput(false);
                        setNewPresetName('');
                        setNewPresetDescription('');
                      }
                    }}
                    className="preset-description-input"
                  />
                  <div className="save-preset-actions">
                    <button
                      onClick={handleSavePreset}
                      disabled={!newPresetName.trim()}
                      className="save-preset-confirm"
                    >
                      <Save size={16} />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowSaveInput(false);
                        setNewPresetName('');
                        setNewPresetDescription('');
                      }}
                      className="save-preset-cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Saved Presets Section */}
          {presets.length > 0 && (
            <div className="preset-section">
              <h3 className="preset-section-title">Saved Presets</h3>
              <div className="preset-items">
                {presets.map((preset) => (
                  <div key={preset.id} className="effect-item preset-item">
                    <button
                      className="preset-content"
                      onClick={() => handleApplyPreset(preset)}
                    >
                      <div className="effect-icon">
                        <FileDown size={20} />
                      </div>
                      <div className="effect-info">
                        <h4>{preset.name}</h4>
                        {preset.description && <p>{preset.description}</p>}
                        <p className="preset-meta">
                          {preset.nodes.length} nodes, {preset.edges.length} connections
                        </p>
                      </div>
                      <ChevronRight className="effect-arrow" size={16} />
                    </button>
                    <button
                      className="preset-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePreset(preset.id);
                      }}
                      title="Delete preset"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PresetManager;