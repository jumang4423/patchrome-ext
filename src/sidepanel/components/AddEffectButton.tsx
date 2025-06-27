import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';

interface AddEffectButtonProps {
  onAddEffect: (effectType: string) => void;
}

const AddEffectButton: React.FC<AddEffectButtonProps> = ({ onAddEffect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close menu if clicking anywhere outside both menu and button
      if (isOpen && menuRef.current && buttonRef.current) {
        const target = event.target as Node;
        const isClickInsideMenu = menuRef.current.contains(target);
        const isClickInsideButton = buttonRef.current.contains(target);
        
        if (!isClickInsideMenu && !isClickInsideButton) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      // Use capture phase to catch events before ReactFlow handles them
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('click', handleClickOutside, true);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
        document.removeEventListener('click', handleClickOutside, true);
      };
    }
  }, [isOpen]);

  const handleAddEffect = (effectType: string) => {
    onAddEffect(effectType);
    setIsOpen(false);
  };

  return (
    <div className="add-effect-container">
      <button
        ref={buttonRef}
        className={`add-effect-button ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Add effect"
      >
        <Plus className="add-effect-icon" />
      </button>
      
      {isOpen && (
        <div ref={menuRef} className="effect-dropdown">
          <div className="effect-dropdown-items">
            <div className="effect-section-label">Generators</div>
            <button
              className="effect-dropdown-item"
              onClick={() => handleAddEffect('tonegenerator')}
            >
              <div className="effect-item-content">
                <div className="effect-item-icon tonegenerator">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 8C2 8 3 4 4 8C5 12 6 4 7 8C8 12 9 4 10 8C11 12 12 4 13 8C14 12 14 8 14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span>Tone Generator</span>
              </div>
            </button>
            
            <div className="effect-section-label">Effects</div>
            <button
              className="effect-dropdown-item"
              onClick={() => handleAddEffect('utility')}
            >
              <div className="effect-item-content">
                <div className="effect-item-icon utility">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 12V4M2 8H6M10 12V4M10 8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span>Utility</span>
              </div>
            </button>
            <button
              className="effect-dropdown-item"
              onClick={() => handleAddEffect('equalizer')}
            >
              <div className="effect-item-content">
                <div className="effect-item-icon equalizer">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 12V10M3 6V4M8 12V7M8 4V2M13 12V9M13 5V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="8" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="13" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <span>Equalizer</span>
              </div>
            </button>
            <button
              className="effect-dropdown-item"
              onClick={() => handleAddEffect('reverb')}
            >
              <div className="effect-item-content">
                <div className="effect-item-icon reverb">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 8C2 8 4 4 8 4C12 4 14 8 14 8C14 8 12 12 8 12C4 12 2 8 2 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <span>Reverb</span>
              </div>
            </button>
            <button
              className="effect-dropdown-item"
              onClick={() => handleAddEffect('distortion')}
            >
              <div className="effect-item-content">
                <div className="effect-item-icon distortion">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 1L1 8L8 15L15 8L8 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 8L11 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 5L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span>Distortion</span>
              </div>
            </button>
            <button
              className="effect-dropdown-item"
              onClick={() => handleAddEffect('delay')}
            >
              <div className="effect-item-content">
                <div className="effect-item-icon delay">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span>Delay</span>
              </div>
            </button>
            <button
              className="effect-dropdown-item"
              onClick={() => handleAddEffect('phaser')}
            >
              <div className="effect-item-content">
                <div className="effect-item-icon phaser">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 8C2 8 3 6 4 8C5 10 6 6 7 8C8 10 9 6 10 8C11 10 12 6 13 8C14 10 14 8 14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 8C2 8 3 10 4 8C5 6 6 10 7 8C8 6 9 10 10 8C11 6 12 10 13 8C14 6 14 8 14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
                  </svg>
                </div>
                <span>Phaser</span>
              </div>
            </button>
            <button
              className="effect-dropdown-item"
              onClick={() => handleAddEffect('flanger')}
            >
              <div className="effect-item-content">
                <div className="effect-item-icon flanger">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 8C3 8 4 5 5 8C6 11 7 5 8 8C9 11 10 5 11 8C12 11 13 8 13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 8C4 8 5 6 6 8C7 10 8 6 9 8C10 10 11 6 12 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" strokeDasharray="2 2"/>
                  </svg>
                </div>
                <span>Flanger</span>
              </div>
            </button>
            <button
              className="effect-dropdown-item"
              onClick={() => handleAddEffect('limiter')}
            >
              <div className="effect-item-content">
                <div className="effect-item-icon limiter">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 8H14M2 4H14M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="6" y="6" width="4" height="4" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <span>Limiter</span>
              </div>
            </button>
            <button
              className="effect-dropdown-item"
              onClick={() => handleAddEffect('spectralgate')}
            >
              <div className="effect-item-content">
                <div className="effect-item-icon spectralgate">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 14V8M4 14V6M6 14V10M8 14V4M10 14V7M12 14V5M14 14V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 2H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2"/>
                  </svg>
                </div>
                <span>Spectral Gate</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddEffectButton;