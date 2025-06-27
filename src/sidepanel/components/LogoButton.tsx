import React from 'react';

interface LogoButtonProps {
  onClick: () => void;
  isActive: boolean;
}

const LogoButton: React.FC<LogoButtonProps> = ({ onClick, isActive }) => {
  return (
    <button
      className="logo-button"
      onClick={onClick}
      aria-label={isActive ? "Disable audio flow" : "Enable audio flow"}
    >
      <img 
        src={chrome.runtime.getURL('logo.png')}
        alt="Patchrome Logo" 
        className="logo-button-image"
      />
      {!isActive && (
        <div className="logo-button-overlay">
          <svg className="logo-button-x" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M 25 25 L 75 75" stroke="#ff0040" strokeWidth="12" strokeLinecap="round" />
            <path d="M 75 25 L 25 75" stroke="#ff0040" strokeWidth="12" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </button>
  );
};

export default LogoButton;