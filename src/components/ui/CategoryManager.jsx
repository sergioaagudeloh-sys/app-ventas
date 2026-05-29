import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

// Compact SVG Icons dictionary to replace lucide-react and keep the component 100% portable
const SVG_ICONS = {
  Plus: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Trash2: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
  Edit2: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  ),
  Search: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Tag: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  Shirt: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20.38 3.46L16 2a4 4 0 0 0-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a2 2 0 0 0 .99 1.42L7 12v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7l3.15-1.42a2 2 0 0 0 .99-1.42l.58-3.47a2 2 0 0 0-1.34-2.23z" />
    </svg>
  ),
  Footprints: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 16v-2.38C4 11.5 5.88 9.85 6 7.07l.09-2.13A1.91 1.91 0 0 1 8.18 3.2c1 .09 1.91 1.62 2 1.62l.6 5.1c.14 1.2-.3 2.45-1.2 3.32L8 15" />
      <path d="M12 11.5V9.12c0-2.13 1.88-3.78 2-6.56l.09-2.13A1.91 1.91 0 0 1 16.18-1.3c1 .09 1.91 1.62 2 1.62l.6 5.1c.14 1.2-.3 2.45-1.2 3.32L16 10.5" />
    </svg>
  ),
  Gem: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 3h12l4 6-10 12L2 9z" />
      <path d="M11 3 8 9l4 12 4-12-3-6" />
      <path d="M2 9h20" />
    </svg>
  ),
  Glasses: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="6" cy="15" r="3" />
      <circle cx="18" cy="15" r="3" />
      <path d="M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
      <path d="M2.5 13 5 7c.7-1.3 1.4-2 3-2" />
      <path d="M21.5 13 19 7c-.7-1.3-1.4-2-3-2" />
    </svg>
  ),
  Watch: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="7" />
      <polyline points="12 9 12 12 13.5 13.5" />
      <path d="M16.51 7.16 18 2h-12l1.49 5.16" />
      <path d="M7.49 16.84 6 22h12l-1.49-5.16" />
    </svg>
  ),
  Sparkles: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707m0-12.728.707.707m11.314 11.314.707.707M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" />
    </svg>
  ),
  Coffee: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  ),
  Pizza: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 11h.01M11 15h.01M16 16h.01M12 11h.01" />
      <path d="M2 20h18a2 2 0 0 0 2-2V3.13a1 1 0 0 0-1.65-.77L2.13 18.5A1 1 0 0 0 2 20z" />
    </svg>
  ),
  Utensils: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <line x1="7" y1="2" x2="7" y2="8" />
      <line x1="21" y1="15" x2="21" y2="2" />
      <path d="M21 2c-3 0-5 2-5 5v8c0 1.1.9 2 2 2h3" />
      <line x1="12" y1="15" x2="12" y2="22" />
      <line x1="18" y1="17" x2="18" y2="22" />
    </svg>
  ),
  Cake: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
      <path d="M4 16h16" />
      <path d="M10 9h4" />
      <path d="M12 5v4" />
      <path d="M12 2v1" />
    </svg>
  ),
  Apple: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M12 6c-2 0-3 1-3 3" />
      <path d="M12 2v2" />
    </svg>
  ),
  ChefHat: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 18h12a2 2 0 0 0 2-2v-3a6 6 0 0 0-12 0v3a2 2 0 0 0 2 2z" />
      <path d="M18 18H6a3 3 0 0 0-3 3h18a3 3 0 0 0-3-3z" />
    </svg>
  ),
  Wine: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 22h8" />
      <path d="M7 10h10" />
      <path d="M12 15v7" />
      <path d="M12 15a5 5 0 0 0 5-5V2H7v8a5 5 0 0 0 5 5z" />
    </svg>
  ),
  Beer: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 11h1a3 3 0 0 1 0 6h-1" />
      <path d="M9 12v6" />
      <path d="M13 12v6" />
      <path d="M14 7.5a2.5 2.5 0 0 1-5 0" />
      <path d="M5 21h12a2 2 0 0 0 2-2V8H3v11a2 2 0 0 0 2 2z" />
    </svg>
  ),
  Laptop: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="2" y1="20" x2="22" y2="20" />
      <line x1="12" y1="20" x2="12" y2="17" />
    </svg>
  ),
  Smartphone: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  Headphones: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  ),
  Tv: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
      <polyline points="17 2 12 7 7 2" />
    </svg>
  ),
  Gamepad2: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="15" y1="13" x2="15.01" y2="13" />
      <line x1="18" y1="11" x2="18.01" y2="11" />
      <rect x="2" y="6" width="20" height="12" rx="3" />
    </svg>
  ),
  Camera: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  Speaker: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <circle cx="12" cy="14" r="4" />
      <line x1="12" y1="6" x2="12.01" y2="6" />
    </svg>
  ),
  Cpu: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="15" x2="23" y2="15" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="15" x2="4" y2="15" />
    </svg>
  ),
  Home: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Bed: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
    </svg>
  ),
  Lamp: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 2h8l2 10H6L8 2zM12 12v6M9 22h6" />
    </svg>
  ),
  Sofa: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" />
      <path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <path d="M4 18v2M20 18v2" />
    </svg>
  ),
  Bath: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 6V2M15 6V2M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6H4zM2 8h20v4H2z" />
    </svg>
  ),
  Baby: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8z" />
    </svg>
  ),
  Gift: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  ),
  PartyPopper: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5.8 11.3 2 22l10.7-3.8M4 14h.01M7 17h.01M11 5.5a2.5 2.5 0 1 0 5 0M16 9.5a2.5 2.5 0 1 0 5 0M12 11h.01M19 4h.01M14 14h.01" />
    </svg>
  ),
  Smile: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  Activity: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Dumbbell: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6.5 6.5h11M6.5 17.5h11M18 4h3v16h-3zM3 4h3v16H3zM6.5 12h11" />
    </svg>
  ),
  Heart: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  ),
  Bike: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="5.5" cy="17.5" r="2.5" />
      <circle cx="18.5" cy="17.5" r="2.5" />
      <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4" />
    </svg>
  ),
  Wrench: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  Hammer: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m15 5 6 6M18 2l4 4M14 6l6 6-12 12-4-4L14 6z" />
    </svg>
  ),
  Car: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  ),
  Scissors: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  ),
  ShoppingBag: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  Book: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5v-15z" />
    </svg>
  ),
  Flower: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2a4 4 0 0 0-4 4 4 4 0 0 0 4 4 4 4 0 0 0 4-4 4 4 0 0 0-4-4zm0 12a4 4 0 0 0-4 4 4 4 0 0 0 4 4 4 4 0 0 0 4-4 4 4 0 0 0-4-4zm-6-4a4 4 0 0 0-4 4 4 4 0 0 0 4 4 4 4 0 0 0 4-4 4 4 0 0 0-4-4zm12 0a4 4 0 0 0-4 4 4 4 0 0 0 4 4 4 4 0 0 0 4-4 4 4 0 0 0-4-4z" />
    </svg>
  ),
  Dog: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-4 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm8 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
    </svg>
  ),
  Crown: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 4 5 12h14l3-8-7 4-3-6-3 6-7-4z" />
      <path d="M5 20h14a1 1 0 0 0 1-1v-3H4v3a1 1 0 0 0 1 1z" />
    </svg>
  ),
  Compass: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
};

export const CATEGORY_ICONS = [
  { name: 'Shirt', label: 'Moda y Ropa', tags: ['ropa', 'camisa', 'moda', 'vestir', 'pantalon', 'abrigo', 'camiseta', 'vestido', 'jeans', 'boutique', 'prenda'] },
  { name: 'Footprints', label: 'Calzado', tags: ['zapatos', 'tenis', 'botas', 'huellas', 'calzado', 'zapateria', 'tacones', 'chanclas'] },
  { name: 'Gem', label: 'Joyas y Accesorios', tags: ['joyas', 'accesorios', 'oro', 'plata', 'gema', 'anillo', 'collar', 'aretes', 'lujo', 'joyeria'] },
  { name: 'Glasses', label: 'Gafas y Lentes', tags: ['gafas', 'lentes', 'sol', 'accesorios', 'anteojos', 'optica'] },
  { name: 'Watch', label: 'Relojes', tags: ['reloj', 'hora', 'accesorios', 'tiempo', 'cronometro'] },
  { name: 'Sparkles', label: 'Belleza y Cosmética', tags: ['belleza', 'cosmeticos', 'maquillaje', 'brillo', 'skincare', 'spa', 'estetica', 'perfume'] },
  { name: 'Coffee', label: 'Cafetería', tags: ['cafe', 'cafeteria', 'bebida', 'desayuno', 'taza', 'te', 'panaderia'] },
  { name: 'Pizza', label: 'Comida Rápida', tags: ['pizza', 'comida', 'rapida', 'restaurante', 'cena', 'queso'] },
  { name: 'Utensils', label: 'Restaurante y Cocina', tags: ['restaurante', 'comida', 'cubiertos', 'almuerzo', 'cena', 'plato', 'tenedor', 'cuchillo'] },
  { name: 'Cake', label: 'Repostería y Pasteles', tags: ['pastel', 'postre', 'dulce', 'panaderia', 'torta', 'ponque', 'pan', 'reposteria'] },
  { name: 'Apple', label: 'Frutas y Verduras', tags: ['frutas', 'verduras', 'saludable', 'manzana', 'comida', 'mercado', 'tienda', 'sano'] },
  { name: 'ChefHat', label: 'Gastronomía', tags: ['cocina', 'chef', 'restaurante', 'reposteria', 'sombrero', 'cocinar'] },
  { name: 'Wine', label: 'Vinos y Licores', tags: ['vino', 'licores', 'bebidas', 'alcohol', 'bar', 'copa', 'botella'] },
  { name: 'Beer', label: 'Cervecería', tags: ['cerveza', 'licores', 'bebidas', 'bar', 'polas', 'trago', 'fiesta'] },
  { name: 'Laptop', label: 'Computadores', tags: ['computador', 'pc', 'portatil', 'tecnologia', 'oficina', 'ordenador', 'pantalla'] },
  { name: 'Smartphone', label: 'Celulares y Móviles', tags: ['celular', 'telefono', 'movil', 'tecnologia', 'smartphone', 'iphone', 'android'] },
  { name: 'Headphones', label: 'Audio y Música', tags: ['audifonos', 'auriculares', 'musica', 'sonido', 'tecnologia', 'parlante', 'diadema'] },
  { name: 'Tv', label: 'Televisores y Pantallas', tags: ['televisor', 'pantalla', 'tv', 'tecnologia', 'hogar', 'television'] },
  { name: 'Gamepad2', label: 'Videojuegos y Consolas', tags: ['consola', 'control', 'videojuegos', 'gamer', 'tecnologia', 'juegos', 'play', 'xbox', 'nintendo'] },
  { name: 'Camera', label: 'Fotografía y Video', tags: ['camara', 'fotos', 'video', 'tecnologia', 'lente', 'cine'] },
  { name: 'Speaker', label: 'Sonido y Altavoces', tags: ['parlante', 'altavoz', 'sonido', 'musica', 'tecnologia', 'bafle'] },
  { name: 'Cpu', label: 'Componentes de PC', tags: ['procesador', 'chip', 'componentes', 'tecnologia', 'hardware', 'cpu'] },
  { name: 'Home', label: 'Hogar y Decoración', tags: ['hogar', 'casa', 'decoracion', 'muebles', 'interior', 'jardin'] },
  { name: 'Bed', label: 'Dormitorio y Cama', tags: ['cama', 'dormitorio', 'muebles', 'descanso', 'hogar', 'sabanas', 'colchon'] },
  { name: 'Lamp', label: 'Iluminación y Lámparas', tags: ['lampara', 'iluminacion', 'muebles', 'hogar', 'luz', 'bombillo'] },
  { name: 'Sofa', label: 'Muebles y Sala', tags: ['sofa', 'sala', 'muebles', 'hogar', 'silla', 'sillon'] },
  { name: 'Bath', label: 'Baño', tags: ['baño', 'tina', 'aseo', 'hogar', 'ducha'] },
  { name: 'Baby', label: 'Infantil y Bebés', tags: ['bebes', 'niños', 'pañales', 'infantil', 'ropa bebe', 'tetero'] },
  { name: 'Gift', label: 'Regalos y Detalles', tags: ['regalo', 'detalle', 'obsequio', 'sorpresa', 'fiesta', 'cumpleaños', 'navidad'] },
  { name: 'PartyPopper', label: 'Fiesta y Eventos', tags: ['fiesta', 'celebracion', 'globos', 'decoracion', 'evento', 'sorpresa'] },
  { name: 'Smile', label: 'Juguetería y Niños', tags: ['niños', 'otros', 'juguetes', 'cara', 'feliz', 'diversion', 'juegos'] },
  { name: 'Activity', label: 'Deporte y Salud', tags: ['deporte', 'fitness', 'salud', 'ejercicio', 'gimnasio', 'entrenar', 'bienestar'] },
  { name: 'Dumbbell', label: 'Pesas y Fitness', tags: ['pesas', 'gimnasio', 'fitness', 'deporte', 'ejercicio', 'entrenamiento', 'músculo'] },
  { name: 'Heart', label: 'Salud y Cuidado', tags: ['salud', 'bienestar', 'amor', 'medicina', 'doctor', 'clinica', 'corazon'] },
  { name: 'Bike', label: 'Ciclismo y Exterior', tags: ['bicicleta', 'ciclismo', 'deporte', 'exterior', 'cicla', 'ruta'] },
  { name: 'Wrench', label: 'Herramientas', tags: ['herramientas', 'ferreteria', 'construccion', 'taller', 'llave', 'reparacion'] },
  { name: 'Hammer', label: 'Ferretería', tags: ['martillo', 'ferreteria', 'construccion', 'herramientas'] },
  { name: 'Car', label: 'Vehículos y Autos', tags: ['vehiculos', 'carro', 'auto', 'repuestos', 'taller', 'mecanico'] },
  { name: 'Scissors', label: 'Papelería y Corte', tags: ['tijeras', 'papeleria', 'peluqueria', 'corte', 'utiles'] },
  { name: 'Tag', label: 'General / Oferta', tags: ['etiqueta', 'descuento', 'general', 'oferta', 'promocion', 'precio'] },
  { name: 'ShoppingBag', label: 'Bolsos y Carteras', tags: ['bolsos', 'compras', 'cartera', 'general', 'bolsa'] },
  { name: 'Book', label: 'Libros y Papelería', tags: ['libros', 'lectura', 'papeleria', 'escuela', 'educacion', 'cuaderno'] },
  { name: 'Flower', label: 'Flores y Jardinería', tags: ['flores', 'jardin', 'plantas', 'decoracion', 'regalo', 'floristeria'] },
  { name: 'Dog', label: 'Mascotas', tags: ['mascotas', 'perros', 'gatos', 'animales', 'veterinaria', 'alimento'] },
  { name: 'Crown', label: 'Exclusivo y Premium', tags: ['premium', 'exclusivo', 'rey', 'reina', 'lujo', 'corona', 'vip'] },
  { name: 'Compass', label: 'Viajes y Aventura', tags: ['viajes', 'aventura', 'turismo', 'exterior', 'brujula'] }
];

export default function CategoryManager({
  categories = [],
  isLoading = false,
  isCreating = false,
  isUpdating = false,
  onCreate = () => {},
  onUpdate = () => {},
  onDelete = () => {}
}) {
  const [nombre, setNombre] = useState('');
  const [iconName, setIconName] = useState('Tag');
  const [editingId, setEditingId] = useState(null);
  const [searchTermIcon, setSearchTermIcon] = useState('');

  const filteredIcons = useMemo(() => {
    const term = searchTermIcon.toLowerCase().trim();
    if (!term) return CATEGORY_ICONS;
    return CATEGORY_ICONS.filter(icon => 
      icon.name.toLowerCase().includes(term) ||
      icon.label.toLowerCase().includes(term) ||
      icon.tags.some(tag => tag.includes(term))
    );
  }, [searchTermIcon]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    if (editingId) {
      onUpdate(editingId, { nombre: nombre.trim(), iconName });
      setEditingId(null);
    } else {
      onCreate({ nombre: nombre.trim(), activa: true, iconName });
    }
    setNombre('');
    setIconName('Tag');
    setSearchTermIcon('');
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setNombre(cat.nombre);
    setIconName(cat.iconName || 'Tag');
  };

  const handleCancel = () => {
    setEditingId(null);
    setNombre('');
    setIconName('Tag');
    setSearchTermIcon('');
  };

  const TagIcon = SVG_ICONS.Tag;
  const SearchIcon = SVG_ICONS.Search;
  const PlusIcon = SVG_ICONS.Plus;

  if (isLoading) {
    return <div className="p-4 text-center text-muted">Cargando categorías...</div>;
  }

  return (
    <div className="bg-surface rounded-3xl p-6 border border-app shadow-sm">
      <h2 className="text-lg font-bold text-app mb-4 flex items-center gap-2">
        <TagIcon className="w-[18px] h-[18px] text-primary" /> Categorías del Catálogo
      </h2>

      {/* Formulario rápido */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Camisetas, Pantalones..."
            className="w-full sm:flex-1 h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors text-sm"
          />
          {editingId ? (
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isUpdating}
                className="flex-1 sm:flex-none h-11 px-5 bg-primary text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 text-xs sm:text-sm"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 sm:flex-none h-11 px-5 bg-surface-2 text-app rounded-xl font-bold transition-all active:scale-95 text-xs sm:text-sm"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={isCreating || !nombre.trim()}
              className="w-full sm:w-auto h-11 px-5 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-xs sm:text-sm"
            >
              <PlusIcon className="w-4 h-4" /> Agregar
            </button>
          )}
        </div>

        {/* Selector de Iconos con Buscador */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-muted uppercase tracking-widest">Icono de la Categoría</label>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              Seleccionado: {CATEGORY_ICONS.find(i => i.name === iconName)?.label || iconName}
            </span>
          </div>

          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
            <input
              type="text"
              value={searchTermIcon}
              onChange={(e) => setSearchTermIcon(e.target.value)}
              placeholder="Buscar ícono (ej: pan, ropa, computador, deporte)..."
              className="w-full h-9 pl-9 pr-4 rounded-xl bg-surface-2 border border-app text-app text-xs focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 p-2 bg-surface-2 rounded-xl border border-app/60 max-h-36 overflow-y-auto no-scrollbar">
            {filteredIcons.length === 0 ? (
              <div className="col-span-full py-4 text-center text-xs text-muted">No se encontraron íconos.</div>
            ) : (
              filteredIcons.map(({ name, label: iconLabel }) => {
                const IconComponent = SVG_ICONS[name] || SVG_ICONS.Tag;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIconName(name)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all active:scale-95 shrink-0 ${
                      iconName === name
                        ? 'bg-primary text-white border-primary shadow-sm scale-105'
                        : 'bg-surface text-app border-app/70 hover:border-primary/50'
                    }`}
                    title={iconLabel}
                  >
                    <IconComponent className="w-[15px] h-[15px]" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </form>

      {/* Lista de categorías */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
        {categories.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">No hay categorías creadas aún.</p>
        ) : (
          categories.map(cat => {
            const IconComponent = SVG_ICONS[cat.iconName] || SVG_ICONS.Tag;
            const Edit2Icon = SVG_ICONS.Edit2;
            const Trash2Icon = SVG_ICONS.Trash2;
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2 border border-app/50"
              >
                <div className="flex items-center gap-2.5 truncate mr-2">
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-primary shrink-0 border border-app/40">
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-app text-sm truncate">{cat.nombre}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(cat)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-surface transition-colors"
                  >
                    <Edit2Icon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(cat.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-error hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2Icon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
