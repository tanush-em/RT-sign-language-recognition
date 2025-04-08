import React from 'react';
import "./ProgressBar.css";

const ProgressBar = ({ progress }) => {
  // Determine the color based on the progress value
  const getColor = () => {
    if (progress >= 80) return "#28a745"; // Green for high confidence
    if (progress >= 60) return "#17a2b8"; // Teal for good confidence
    if (progress >= 40) return "#ffc107"; // Yellow for medium confidence
    return "#dc3545"; // Red for low confidence
  };

  return (
    <div className="progress-bar-container">
      <div
        className="progress-bar-filled"
        style={{ 
          width: `${progress}%`,
          backgroundColor: getColor()
        }}
      >
        <span className="progress-text">{progress}%</span>
      </div>
    </div>
  );
};

export default ProgressBar;