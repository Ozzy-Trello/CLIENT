import React from 'react';
import './style.css';

const ListSkeleton = () => {
  return (
    <div className="board-skeleton-container">
      {/* Create three columns */}
      {[1, 2, 3].map((columnIndex) => (
        <div key={columnIndex} className="skeleton-column">
          {/* Column header */}
          <div className="skeleton-column-header">
            <div className="skeleton-title pulse"></div>
          </div>
          
          {/* Cards - different number for each column */}
          <div className="skeleton-cards">
            {Array(columnIndex + 1).fill(0).map((_, cardIndex) => (
              <div key={cardIndex} className="skeleton-card pulse">
                <div className="skeleton-card-title"></div>
                <div className="skeleton-card-content">
                  <div className="skeleton-line short"></div>
                  <div className="skeleton-line medium"></div>
                  <div className="skeleton-line long"></div>
                </div>
                <div className="skeleton-card-footer">
                  <div className="skeleton-badge"></div>
                  <div className="skeleton-badge"></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Add card button */}
          <div className="skeleton-add-card pulse"></div>
        </div>
      ))}
      
      {/* Add list column */}
      <div className="skeleton-add-column pulse"></div>
    </div>
  );
};

export default ListSkeleton;