import React from 'react';

interface LogoButtonProps {
  onClick: () => void;
}

const LogoButton: React.FC<LogoButtonProps> = ({ onClick }) => {
  return (
    <button
      className="logo-button"
      onClick={onClick}
      aria-label="Open info"
    >
      <img 
        src={chrome.runtime.getURL('logo.png')}
        alt="Patchrome Logo" 
        className="logo-button-image"
      />
    </button>
  );
};

export default LogoButton;