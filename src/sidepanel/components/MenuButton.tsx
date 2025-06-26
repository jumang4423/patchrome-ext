import React, { useState, useRef, useEffect } from 'react';
import { Menu, Download, Upload } from 'lucide-react';

interface MenuButtonProps {
  onAction: (action: 'import' | 'export') => void;
}

const MenuButton: React.FC<MenuButtonProps> = ({ onAction }) => {
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

  const handleAction = (action: 'import' | 'export') => {
    onAction(action);
    setIsOpen(false);
  };

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
          <div className="menu-dropdown-header">
            <span className="menu-dropdown-title">Menu</span>
          </div>
          <div className="menu-dropdown-separator" />
          <div className="menu-dropdown-items">
            <button
              className="menu-dropdown-item"
              onClick={() => handleAction('import')}
            >
              <div className="menu-item-content">
                <div className="menu-item-icon">
                  <Upload size={16} />
                </div>
                <span>Import</span>
              </div>
            </button>
            <button
              className="menu-dropdown-item"
              onClick={() => handleAction('export')}
            >
              <div className="menu-item-content">
                <div className="menu-item-icon">
                  <Download size={16} />
                </div>
                <span>Export</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuButton;
