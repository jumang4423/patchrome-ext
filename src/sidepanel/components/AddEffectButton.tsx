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
          <div className="effect-dropdown-header">
            <span className="effect-dropdown-title">Add Effect</span>
          </div>
          <div className="effect-dropdown-separator" />
          <div className="effect-dropdown-items">
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
          </div>
        </div>
      )}
    </div>
  );
};

export default AddEffectButton;