import React from 'react';
import { ItemType } from '../types';
import { AppleIcon, BananaIcon, CherryIcon, OrangeIcon } from './Icons';

interface GameItemProps {
  type: ItemType;
  x: number;
  y: number;
}

export const GameItem: React.FC<GameItemProps> = ({ type, x, y }) => {
  const getIcon = () => {
    switch (type) {
      case 'apple': return <AppleIcon className="w-8 h-8 text-red-500 fill-red-100" />;
      case 'banana': return <BananaIcon className="w-8 h-8 text-yellow-500 fill-yellow-100" />;
      case 'cherry': return <CherryIcon className="w-8 h-8 text-rose-600 fill-rose-100" />;
      case 'orange': return <OrangeIcon className="w-8 h-8 text-orange-500 fill-orange-100" />;
    }
  };

  return (
    <div 
      className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-linear will-change-transform"
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
      }}
    >
      <div className="animate-spin-slow">
        {getIcon()}
      </div>
    </div>
  );
};