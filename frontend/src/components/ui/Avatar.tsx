'use client';

import { User } from '../../lib/api';

interface AvatarProps {
  user: User | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getColorFromName = (name: string): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function Avatar({ user, size = 'md', className = '' }: AvatarProps) {
  if (!user) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-gray-300 flex items-center justify-center ${className}`}
      />
    );
  }

  if (user.profilePhoto) {
    const imageUrl = user.profilePhoto.startsWith('http')
      ? user.profilePhoto
      : `${process.env.NEXT_PUBLIC_SOCKET_URL}${user.profilePhoto}`;
    
    return (
      <img
        src={imageUrl}
        alt={user.name}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full ${getColorFromName(user.name)} flex items-center justify-center text-white font-semibold ${className}`}
    >
      {getInitials(user.name)}
    </div>
  );
}
