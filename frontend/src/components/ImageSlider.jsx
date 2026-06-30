import React, { useState, useRef } from 'react';

export default function ImageSlider({ before, after }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let position = (x / rect.width) * 100;
    if (position < 0) position = 0;
    if (position > 100) position = 100;
    setSliderPosition(position);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-lg select-none border border-slate-200 dark:border-slate-800"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onTouchEnd={() => setIsDragging(false)}
    >
      {/* Before Image (Background) */}
      <img 
        src={before} 
        alt="Before" 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      <div className="absolute top-4 left-4 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shadow">
        Before (Issue)
      </div>

      {/* After Image (Overlay, sliced) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
      >
        <img 
          src={after} 
          alt="After" 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ width: containerRef.current?.getBoundingClientRect().width }}
        />
        <div className="absolute top-4 right-4 bg-green-600/95 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shadow">
          After (Resolved)
        </div>
      </div>

      {/* Slider Bar Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center z-10 shadow"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onTouchStart={() => setIsDragging(true)}
      >
        <div className="w-8 h-8 rounded-full bg-white text-slate-800 border border-slate-200 shadow-lg flex items-center justify-center font-bold text-lg hover:scale-110 active:scale-95 transition-transform duration-100">
          ↔
        </div>
      </div>
    </div>
  );
}
