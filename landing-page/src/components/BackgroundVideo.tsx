import React from 'react';
import { VIDEO_SRC } from '../data/landingData.ts';

export const BackgroundVideo: React.FC = () => {
  return (
    <video
      className="absolute inset-0 w-full h-full object-cover"
      autoPlay
      loop
      muted
      playsInline
      src={VIDEO_SRC}
    />
  );
};
