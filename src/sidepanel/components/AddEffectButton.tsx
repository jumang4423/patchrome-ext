import React from 'react';
import { Plus } from 'lucide-react';

interface AddEffectButtonProps {
  onClick: () => void;
}

const AddEffectButton: React.FC<AddEffectButtonProps> = ({ onClick }) => {
  return (
    <div className="add-effect-container">
      <button
        className="add-effect-button"
        onClick={onClick}
        aria-label="Add effect"
      >
        <Plus className="add-effect-icon" />
      </button>
    </div>
  );
};

export default AddEffectButton;