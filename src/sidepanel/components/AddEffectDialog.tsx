import React from 'react';
import { 
  Dialog, 
  DialogContent
} from '../../components/ui/dialog';
import { ChevronRight } from 'lucide-react';

interface AddEffectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddEffect: (effectType: string) => void;
}

const AddEffectDialog: React.FC<AddEffectDialogProps> = ({ 
  open, 
  onOpenChange, 
  onAddEffect 
}) => {
  const handleAddEffect = (effectType: string) => {
    onAddEffect(effectType);
    onOpenChange(false);
  };

  const generators = [
    {
      type: 'tonegenerator',
      name: 'Tone Generator',
      description: 'Generate pure tones and waveforms',
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 8C2 8 3 4 4 8C5 12 6 4 7 8C8 12 9 4 10 8C11 12 12 4 13 8C14 12 14 8 14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  ];

  const normalEffects = [
    {
      type: 'bitcrusher',
      name: 'Bit Crusher',
      description: 'Lo-fi digital distortion',
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="6" width="3" height="4" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="6.5" y="4" width="3" height="8" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="11" y="7" width="3" height="2" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      )
    },
    {
      type: 'delay',
      name: 'Delay',
      description: 'Echo and time-based effects',
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      type: 'distortion',
      name: 'Distortion',
      description: 'Add harmonic saturation',
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 1L1 8L8 15L15 8L8 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 8L11 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 5L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      type: 'equalizer',
      name: 'Equalizer',
      description: 'Shape frequency response',
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 12V10M3 6V4M8 12V7M8 4V2M13 12V9M13 5V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="8" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="13" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      )
    },
    {
      type: 'flanger',
      name: 'Flanger',
      description: 'Jet-like sweeping effect',
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 8C3 8 4 5 5 8C6 11 7 5 8 8C9 11 10 5 11 8C12 11 13 8 13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4 8C4 8 5 6 6 8C7 10 8 6 9 8C10 10 11 6 12 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" strokeDasharray="2 2"/>
        </svg>
      )
    },
    {
      type: 'limiter',
      name: 'Limiter',
      description: 'Prevent audio clipping',
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 8H14M2 4H14M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="6" y="6" width="4" height="4" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      )
    },
    {
      type: 'phaser',
      name: 'Phaser',
      description: 'Sweeping comb filter effect',
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 8C2 8 3 6 4 8C5 10 6 6 7 8C8 10 9 6 10 8C11 10 12 6 13 8C14 10 14 8 14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 8C2 8 3 10 4 8C5 6 6 10 7 8C8 6 9 10 10 8C11 6 12 10 13 8C14 6 14 8 14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
        </svg>
      )
    },
    {
      type: 'reverb',
      name: 'Reverb',
      description: 'Add spatial depth and ambience',
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 8C2 8 4 4 8 4C12 4 14 8 14 8C14 8 12 12 8 12C4 12 2 8 2 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      )
    },
    {
      type: 'utility',
      name: 'Utility',
      description: 'Basic gain and pan controls',
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 12V4M2 8H6M10 12V4M10 8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  ];

  const spectralEffects = [
    {
      type: 'spectralcompressor',
      name: 'Spectral Comp',
      description: 'Frequency-domain compression',
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 14V10M4 14V8M6 14V9M8 14V6M10 14V8M12 14V7M14 14V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 6V2M4 4V2M6 5V2M8 2V2M10 4V2M12 3V2M14 7V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
          <path d="M1 8H15" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeDasharray="1 2"/>
        </svg>
      )
    },
    {
      type: 'spectralgate',
      name: 'Spectral Gate',
      description: 'Frequency-selective gating',
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 14V8M4 14V6M6 14V10M8 14V4M10 14V7M12 14V5M14 14V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 2H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2"/>
        </svg>
      )
    },
    {
      type: 'spectralpitch',
      name: 'Spectral Pitch',
      description: 'Frequency-domain pitch shifting',
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 12L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 8L14 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2" opacity="0.5"/>
          <path d="M12 2L14 4L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4 10L2 12L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[600px]">
        <div className="effect-dialog-content">
          {/* Generators Section */}
          <div className="effect-category">
            <div className="effect-category-header">
              <h3 className="effect-category-title">Generators</h3>
            </div>
            <div className="effect-grid">
              {generators.map((effect) => (
                <button
                  key={effect.type}
                  className="effect-dialog-item"
                  onClick={() => handleAddEffect(effect.type)}
                >
                  <div className={`effect-dialog-icon ${effect.type}`}>
                    {effect.icon}
                  </div>
                  <div className="effect-dialog-info">
                    <span className="effect-dialog-name">{effect.name}</span>
                    <span className="effect-dialog-description">{effect.description}</span>
                  </div>
                  <ChevronRight className="effect-dialog-chevron" />
                </button>
              ))}
            </div>
          </div>

          {/* Normal Effects Section */}
          <div className="effect-category">
            <div className="effect-category-header">
              <h3 className="effect-category-title">Effects</h3>
            </div>
            <div className="effect-grid">
              {normalEffects.map((effect) => (
                <button
                  key={effect.type}
                  className="effect-dialog-item"
                  onClick={() => handleAddEffect(effect.type)}
                >
                  <div className={`effect-dialog-icon ${effect.type}`}>
                    {effect.icon}
                  </div>
                  <div className="effect-dialog-info">
                    <span className="effect-dialog-name">{effect.name}</span>
                    <span className="effect-dialog-description">{effect.description}</span>
                  </div>
                  <ChevronRight className="effect-dialog-chevron" />
                </button>
              ))}
            </div>
          </div>

          {/* Spectral Effects Section */}
          <div className="effect-category">
            <div className="effect-category-header">
              <h3 className="effect-category-title">Spectral Effects</h3>
            </div>
            <div className="effect-grid">
              {spectralEffects.map((effect) => (
                <button
                  key={effect.type}
                  className="effect-dialog-item"
                  onClick={() => handleAddEffect(effect.type)}
                >
                  <div className={`effect-dialog-icon ${effect.type}`}>
                    {effect.icon}
                  </div>
                  <div className="effect-dialog-info">
                    <span className="effect-dialog-name">{effect.name}</span>
                    <span className="effect-dialog-description">{effect.description}</span>
                  </div>
                  <ChevronRight className="effect-dialog-chevron" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEffectDialog;