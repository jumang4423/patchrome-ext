import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent
} from '../../components/ui/dialog';
import { Plus, Trash2, ChevronRight, Save, FileDown, Upload, Download } from 'lucide-react';
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
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Default factory presets
  const defaultPresets: NodeGraphPreset[] = [
    {
      id: "init",
      name: "init (factory)",
      description: "Simple input to output connection",
      nodes: [
        {
          id: "1",
          type: "unifiedAudio",
          position: {
            x: -200,
            y: 200
          },
          data: {
            type: "input",
            speed: 1,
            deletable: false
          },
          deletable: false
        },
        {
          id: "2",
          type: "unifiedAudio",
          position: {
            x: 200,
            y: 200
          },
          data: {
            type: "output",
            deletable: false
          },
          deletable: false
        }
      ],
      edges: [
        {
          id: "reactflow__edge-1-2",
          source: "1",
          target: "2"
        }
      ],
      createdAt: 1751099000000,
      updatedAt: 1751099000000
    },
    {
      id: "1751099844408",
      name: "club reverb (factory)",
      nodes: [
        {
          id: "1",
          type: "unifiedAudio",
          position: {
            x: -274.3657217461448,
            y: 71.60267611781144
          },
          data: {
            type: "input",
            speed: 1,
            deletable: false
          },
          deletable: false
        },
        {
          id: "3",
          type: "unifiedAudio",
          position: {
            x: 739.7271746601863,
            y: 210.34661352004687
          },
          data: {
            type: "output",
            deletable: false
          },
          deletable: false
        },
        {
          id: "7",
          type: "unifiedAudio",
          position: {
            x: 733.0350642519463,
            y: 79.68777452334625
          },
          data: {
            type: "limiter",
            threshold: -9,
            deletable: true
          },
          deletable: true
        },
        {
          id: "9",
          type: "unifiedAudio",
          position: {
            x: 19.930716511307125,
            y: 47.19660115481145
          },
          data: {
            type: "equalizer",
            filterType: "lowpass",
            frequency: 150,
            q: 1.8,
            deletable: true
          },
          deletable: true
        },
        {
          id: "10",
          type: "unifiedAudio",
          position: {
            x: 34.07285550451317,
            y: 433.74840030244223
          },
          data: {
            type: "equalizer",
            filterType: "highpass",
            frequency: 120,
            q: 3.6,
            deletable: true
          },
          deletable: true
        },
        {
          id: "12",
          type: "unifiedAudio",
          position: {
            x: 356.01290549649,
            y: 440.9251526311826
          },
          data: {
            type: "reverb",
            mix: 100,
            decay: 261,
            size: 11,
            deletable: true
          },
          deletable: true
        },
        {
          id: "13",
          type: "unifiedAudio",
          position: {
            x: 639.6174554528411,
            y: 528.5557719997181
          },
          data: {
            type: "utility",
            volume: 5.7,
            pan: 0,
            reverse: true,
            deletable: true
          },
          deletable: true
        }
      ],
      edges: [
        {
          id: "reactflow__edge-7-3",
          source: "7",
          target: "3"
        },
        {
          id: "reactflow__edge-1-9",
          source: "1",
          target: "9"
        },
        {
          id: "reactflow__edge-1-10",
          source: "1",
          target: "10"
        },
        {
          id: "reactflow__edge-10-12",
          source: "10",
          target: "12"
        },
        {
          id: "reactflow__edge-12-13",
          source: "12",
          target: "13"
        },
        {
          id: "reactflow__edge-13-7",
          source: "13",
          target: "7"
        },
        {
          id: "reactflow__edge-9-7",
          source: "9",
          target: "7"
        }
      ],
      createdAt: 1751099844408,
      updatedAt: 1751099844408
    },
    {
      id: "1751099521583",
      name: "mp3fy (factory)",
      description: "low resolution mp3 emulation",
      nodes: [
        {
          id: "1",
          type: "unifiedAudio",
          position: {
            x: -65.37633440210053,
            y: 165.8836027391848
          },
          data: {
            type: "input",
            speed: 1,
            deletable: false
          },
          deletable: false
        },
        {
          id: "3",
          type: "unifiedAudio",
          position: {
            x: -49.49273166291572,
            y: 670.5285149032258
          },
          data: {
            type: "output",
            deletable: false
          },
          deletable: false
        },
        {
          id: "4",
          type: "unifiedAudio",
          position: {
            x: -59.770356964741175,
            y: 292.5
          },
          data: {
            type: "bitcrusher",
            mix: 100,
            rate: 13200,
            bits: 16,
            deletable: true
          },
          deletable: true
        },
        {
          id: "5",
          type: "unifiedAudio",
          position: {
            x: 199.86118455674892,
            y: 408.31185420562383
          },
          data: {
            type: "spectralgate",
            cutoff: 17.8,
            deletable: true
          },
          deletable: true
        },
        {
          id: "7",
          type: "unifiedAudio",
          position: {
            x: -59.88243670756721,
            y: 527.9060395359564
          },
          data: {
            type: "limiter",
            threshold: -6,
            deletable: true
          },
          deletable: true
        },
        {
          id: "8",
          type: "unifiedAudio",
          position: {
            x: 197.99252541096243,
            y: 236.3952127932707
          },
          data: {
            type: "distortion",
            drive: 12,
            mix: 100,
            deletable: true
          },
          deletable: true
        }
      ],
      edges: [
        {
          id: "reactflow__edge-1-4",
          source: "1",
          target: "4"
        },
        {
          id: "reactflow__edge-7-3",
          source: "7",
          target: "3"
        },
        {
          id: "reactflow__edge-4-8",
          source: "4",
          target: "8"
        },
        {
          id: "reactflow__edge-8-5",
          source: "8",
          target: "5"
        },
        {
          id: "reactflow__edge-5-7",
          source: "5",
          target: "7"
        }
      ],
      createdAt: 1751099521583,
      updatedAt: 1751099521583
    }
  ];

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
        } else {
          // No presets in localStorage, initialize with default factory presets
          savePresets(defaultPresets);
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
    setShowSaveDialog(false);
  };

  // Delete preset
  const handleDeletePreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(presetId);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (deleteConfirmId) {
      const updatedPresets = presets.filter(p => p.id !== deleteConfirmId);
      savePresets(updatedPresets);
      setDeleteConfirmId(null);
    }
  };

  // Export preset
  const handleExportPreset = (preset: NodeGraphPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    const exportData = {
      version: PRESETS_VERSION,
      preset: preset
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${preset.name.replace(/[^a-z0-9]/gi, '_')}_preset.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import preset
  const handleImportPreset = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (data.version === PRESETS_VERSION && data.preset) {
            const importedPreset = {
              ...data.preset,
              id: Date.now().toString(), // Generate new ID
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            const updatedPresets = [...presets, importedPreset].sort((a, b) => b.createdAt - a.createdAt);
            savePresets(updatedPresets);
          } else {
            alert('Invalid preset file format');
          }
        } catch (error) {
          alert('Failed to import preset file');
        }
      }
    };
    input.click();
  };

  // Apply preset
  const handleApplyPreset = (preset: NodeGraphPreset) => {
    onApplyPreset(preset);
    onClose();
  };

  const openSaveDialog = () => {
    setShowSaveDialog(true);
  };

  const closeSaveDialog = () => {
    setShowSaveDialog(false);
    setNewPresetName('');
    setNewPresetDescription('');
  };

  // Reset all states when dialog closes
  const handleDialogClose = () => {
    setShowSaveDialog(false);
    setDeleteConfirmId(null);
    setNewPresetName('');
    setNewPresetDescription('');
    onClose();
  };

  // Delete confirmation dialog
  if (isOpen && deleteConfirmId) {
    const presetToDelete = presets.find(p => p.id === deleteConfirmId);
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="w-[90vw] max-w-[400px]">
          <div className="preset-save-dialog">
            <h2 className="preset-save-title">Delete Preset?</h2>
            <p className="preset-confirm-text">
              Are you sure you want to delete "{presetToDelete?.name}"?
            </p>
            <div className="preset-save-actions">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="preset-button preset-button-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="preset-button preset-button-danger"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isOpen && showSaveDialog) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="w-[90vw] max-w-[400px]">
          <div className="preset-save-dialog">
            <h2 className="preset-save-title">Save Current Graph</h2>
            <div className="preset-save-form">
              <input
                type="text"
                placeholder="Preset name"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSavePreset();
                  }
                  if (e.key === 'Escape') {
                    closeSaveDialog();
                  }
                }}
                autoFocus
                className="preset-input preset-name-input"
              />
              <textarea
                placeholder="Description (optional)"
                value={newPresetDescription}
                onChange={(e) => setNewPresetDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.metaKey) {
                    e.preventDefault();
                    handleSavePreset();
                  }
                  if (e.key === 'Escape') {
                    closeSaveDialog();
                  }
                }}
                className="preset-input preset-description-textarea"
                rows={3}
              />
              <div className="preset-save-actions">
                <button
                  onClick={closeSaveDialog}
                  className="preset-button preset-button-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreset}
                  disabled={!newPresetName.trim()}
                  className="preset-button preset-button-primary"
                >
                  <Save size={16} />
                  Save Preset
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="w-[90vw] max-w-[600px]">
        <div className="preset-dialog-header">
          <div className="preset-header-buttons">
            <button
              onClick={openSaveDialog}
              className="preset-save-button-small"
              title="Save current graph as preset"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={handleImportPreset}
              className="preset-import-button-small"
              title="Import preset from file"
            >
              <Upload size={16} />
            </button>
          </div>
          <h2 className="preset-dialog-title">Presets</h2>
        </div>
        
        <div className="effect-dialog-content">
          {/* Saved Presets */}
          {presets.length > 0 ? (
            <div className="effect-category">
              <div className="effect-category-header">
                <h3 className="effect-category-title">Saved Presets</h3>
              </div>
              <div className="effect-grid">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    className="effect-dialog-item preset-item"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <div className="effect-dialog-info">
                      <span className="effect-dialog-name">{preset.name}</span>
                      <span className="effect-dialog-description">
                        {preset.description || `${preset.nodes.length} nodes, ${preset.edges.length} connections`}
                      </span>
                    </div>
                    <div className="preset-item-actions">
                      <button
                        className="preset-export-icon"
                        onClick={(e) => handleExportPreset(preset, e)}
                        title="Export preset"
                      >
                        <Download size={14} />
                      </button>
                      {preset.id !== "init" && (
                        <button
                          className="preset-delete-icon"
                          onClick={(e) => handleDeletePreset(preset.id, e)}
                          title="Delete preset"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <ChevronRight className="effect-dialog-chevron" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="preset-empty-state">
              <FileDown size={48} />
              <h3>No Presets Saved</h3>
              <p>Click the + button above to save your current graph as a preset</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PresetManager;