import React, { useState, useRef, useEffect } from 'react';
import { Menu, Info, ExternalLink, Package } from 'lucide-react';

interface MenuButtonProps {
  onInfoClick: () => void;
  onPresetsClick: () => void;
}

const MenuButton: React.FC<MenuButtonProps> = ({ onInfoClick, onPresetsClick }) => {
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


  return (
    <div className="menu-container">
      <button
        ref={buttonRef}
        className={`menu-button ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
      >
        <Menu className="menu-icon" />
      </button>
      
      {isOpen && (
        <div ref={menuRef} className="menu-dropdown">
          <div className="menu-dropdown-items">
            <button
              className="menu-dropdown-item"
              onClick={() => {
                onPresetsClick();
                setIsOpen(false);
              }}
            >
              <div className="menu-item-content">
                <div className="menu-item-icon">
                  <Package size={16} />
                </div>
                <span>Presets</span>
              </div>
            </button>
            <button
              className="menu-dropdown-item"
              onClick={() => {
                onInfoClick();
                setIsOpen(false);
              }}
            >
              <div className="menu-item-content">
                <div className="menu-item-icon">
                  <Info size={16} />
                </div>
                <span>Info</span>
              </div>
            </button>
            <button
              className="menu-dropdown-item"
              onClick={() => {
                window.open('https://github.com/jumang4423/patchrome-ext/blob/main/README.md', '_blank');
                setIsOpen(false);
              }}
            >
              <div className="menu-item-content">
                <div className="menu-item-icon">
                  <ExternalLink size={16} />
                </div>
                <span>Docs</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuButton;
