import React from 'react';
import { NationId } from '../types/game';

interface NationFlagProps {
  nationId: NationId;
  className?: string;
}

export const NationFlag: React.FC<NationFlagProps> = ({
  nationId,
  className = 'w-7 h-5',
}) => {
  switch (nationId) {
    case 'VN':
      return (
        <svg viewBox="0 0 36 24" className={`${className} rounded-[3px] shadow-sm shrink-0`}>
          <rect width="36" height="24" fill="#DA251D" />
          <polygon
            points="18,4.5 19.8,10 25.6,10 20.9,13.4 22.7,18.9 18,15.5 13.3,18.9 15.1,13.4 10.4,10 16.2,10"
            fill="#FFCD00"
          />
        </svg>
      );
    case 'US':
      return (
        <svg viewBox="0 0 36 24" className={`${className} rounded-[3px] shadow-sm shrink-0`}>
          <rect width="36" height="24" fill="#FFFFFF" />
          {[0, 4, 8, 12, 16, 20].map((y) => (
            <rect key={y} y={y} width="36" height="2" fill="#B91C1C" />
          ))}
          <rect width="16" height="12" fill="#1E3A8A" />
          <circle cx="4" cy="3.5" r="0.9" fill="#FFF" />
          <circle cx="8" cy="3.5" r="0.9" fill="#FFF" />
          <circle cx="12" cy="3.5" r="0.9" fill="#FFF" />
          <circle cx="6" cy="6.2" r="0.9" fill="#FFF" />
          <circle cx="10" cy="6.2" r="0.9" fill="#FFF" />
          <circle cx="4" cy="9" r="0.9" fill="#FFF" />
          <circle cx="8" cy="9" r="0.9" fill="#FFF" />
          <circle cx="12" cy="9" r="0.9" fill="#FFF" />
        </svg>
      );
    case 'JP':
      return (
        <svg viewBox="0 0 36 24" className={`${className} rounded-[3px] shadow-sm shrink-0`}>
          <rect width="36" height="24" fill="#FFFFFF" />
          <circle cx="18" cy="12" r="6.2" fill="#E11D48" />
        </svg>
      );
    case 'RU':
      return (
        <svg viewBox="0 0 36 24" className={`${className} rounded-[3px] shadow-sm shrink-0`}>
          <rect width="36" height="8" y="0" fill="#F8FAFC" />
          <rect width="36" height="8" y="8" fill="#1D4ED8" />
          <rect width="36" height="8" y="16" fill="#DC2626" />
        </svg>
      );
    case 'GB':
      return (
        <svg viewBox="0 0 36 24" className={`${className} rounded-[3px] shadow-sm shrink-0`}>
          <rect width="36" height="24" fill="#1E3A8A" />
          <path d="M0,0 L36,24 M36,0 L0,24" stroke="#FFF" strokeWidth="4.2" />
          <path d="M0,0 L36,24 M36,0 L0,24" stroke="#DC2626" strokeWidth="2.1" />
          <path d="M18,0 V24 M0,12 H36" stroke="#FFF" strokeWidth="6.2" />
          <path d="M18,0 V24 M0,12 H36" stroke="#DC2626" strokeWidth="3.5" />
        </svg>
      );
    case 'DE':
      return (
        <svg viewBox="0 0 36 24" className={`${className} rounded-[3px] shadow-sm shrink-0`}>
          <rect width="36" height="8" y="0" fill="#111827" />
          <rect width="36" height="8" y="8" fill="#DC2626" />
          <rect width="36" height="8" y="16" fill="#FACC15" />
        </svg>
      );
    case 'FR':
      return (
        <svg viewBox="0 0 36 24" className={`${className} rounded-[3px] shadow-sm shrink-0`}>
          <rect width="12" height="24" x="0" fill="#1D4ED8" />
          <rect width="12" height="24" x="12" fill="#F8FAFC" />
          <rect width="12" height="24" x="24" fill="#DC2626" />
        </svg>
      );
    case 'KR':
      return (
        <svg viewBox="0 0 36 24" className={`${className} rounded-[3px] shadow-sm shrink-0`}>
          <rect width="36" height="24" fill="#FFFFFF" />
          <circle cx="18" cy="12" r="5.5" fill="#DC2626" />
          <path d="M12.5,12 A5.5,5.5 0 0,0 23.5,12 A2.75,2.75 0 0,1 18,12 A2.75,2.75 0 0,0 12.5,12 Z" fill="#1D4ED8" />
          <path d="M7,5 L10,7 M6.2,6.2 L9.2,8.2 M26,7 L29,5 M26.8,8.2 L29.8,6.2 M7,19 L10,17 M26,17 L29,19" stroke="#111827" strokeWidth="1.3" />
        </svg>
      );
    case 'CN':
      return (
        <svg viewBox="0 0 36 24" className={`${className} rounded-[3px] shadow-sm shrink-0`}>
          <rect width="36" height="24" fill="#DE2910" />
          <polygon points="7,4 8.2,7.6 12,7.6 8.9,9.8 10.1,13.4 7,11.2 3.9,13.4 5.1,9.8 2,7.6 5.8,7.6" fill="#FFDE00" />
          <circle cx="13.5" cy="4" r="1" fill="#FFDE00" />
          <circle cx="15.5" cy="6.5" r="1" fill="#FFDE00" />
          <circle cx="15.5" cy="9.5" r="1" fill="#FFDE00" />
          <circle cx="13.5" cy="12" r="1" fill="#FFDE00" />
        </svg>
      );
    case 'IT':
      return (
        <svg viewBox="0 0 36 24" className={`${className} rounded-[3px] shadow-sm shrink-0`}>
          <rect width="12" height="24" x="0" fill="#15803D" />
          <rect width="12" height="24" x="12" fill="#FFFFFF" />
          <rect width="12" height="24" x="24" fill="#DC2626" />
        </svg>
      );
    case 'IN':
      return (
        <svg viewBox="0 0 36 24" className={`${className} rounded-[3px] shadow-sm shrink-0`}>
          <rect width="36" height="8" y="0" fill="#F97316" />
          <rect width="36" height="8" y="8" fill="#FFFFFF" />
          <rect width="36" height="8" y="16" fill="#15803D" />
          <circle cx="18" cy="12" r="3" fill="none" stroke="#1E3A8A" strokeWidth="1.1" />
        </svg>
      );
    case 'ES':
      return (
        <svg viewBox="0 0 36 24" className={`${className} rounded-[3px] shadow-sm shrink-0`}>
          <rect width="36" height="6" y="0" fill="#C60B1E" />
          <rect width="36" height="12" y="6" fill="#FFC400" />
          <rect width="36" height="6" y="18" fill="#C60B1E" />
          <rect x="8" y="9" width="4" height="6" rx="1" fill="#991B1B" />
        </svg>
      );
    case 'TR':
      return (
        <svg viewBox="0 0 36 24" className={`${className} rounded-[3px] shadow-sm shrink-0`}>
          <rect width="36" height="24" fill="#E30A17" />
          <circle cx="14.5" cy="12" r="5.5" fill="#FFFFFF" />
          <circle cx="16" cy="12" r="4.3" fill="#E30A17" />
          <polygon points="22,9.5 23,11.5 25.2,11.5 23.4,12.8 24.1,15 22,13.6 19.9,15 20.6,12.8 18.8,11.5 21,11.5" fill="#FFFFFF" />
        </svg>
      );
    case 'AU':
      return (
        <svg viewBox="0 0 36 24" className={`${className} rounded-[3px] shadow-sm shrink-0`}>
          <rect width="36" height="24" fill="#012169" />
          <rect width="16" height="11" fill="#1E3A8A" />
          <path d="M0,0 L16,11 M16,0 L0,11" stroke="#FFF" strokeWidth="2" />
          <path d="M8,0 V11 M0,5.5 H16" stroke="#FFF" strokeWidth="3.2" />
          <path d="M8,0 V11 M0,5.5 H16" stroke="#DC2626" strokeWidth="1.6" />
          <circle cx="8" cy="17.5" r="2" fill="#FFF" />
          <circle cx="26" cy="6" r="1.2" fill="#FFF" />
          <circle cx="30" cy="11" r="1.2" fill="#FFF" />
          <circle cx="26" cy="17" r="1.4" fill="#FFF" />
          <circle cx="22" cy="11" r="1.1" fill="#FFF" />
        </svg>
      );
    case 'EXO':
    default:
      return (
        <svg viewBox="0 0 36 24" className={`${className} rounded-[3px] shadow-sm shrink-0`}>
          <rect width="36" height="24" fill="#0F172A" />
          <polygon points="18,3 28,12 18,21 8,12" fill="none" stroke="#F97316" strokeWidth="2" />
          <circle cx="18" cy="12" r="3.4" fill="#38BDF8" />
        </svg>
      );
  }
};
