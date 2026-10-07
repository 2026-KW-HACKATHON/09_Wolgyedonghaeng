import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { ProblemIconKey } from '../config/problemTypes';
import { useTheme } from './theme';

/** 문제 유형 그림. 선 2px, ink 한 색, 둥근 선 끝, 색칠 없음 (design.md 11절). */
export function ProblemIcon({ name, size = 64, label }: { name: ProblemIconKey; size?: number; label?: string }) {
  const { colors } = useTheme();
  const p = { stroke: colors.ink, strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      accessible={!!label}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    >
      {name === 'leak' && (
        <>
          <Path {...p} d="M32 8 C32 8 17 27 17 38 a15 15 0 0 0 30 0 C47 27 32 8 32 8 Z" />
          <Path {...p} d="M26 40 a6 6 0 0 0 6 6" />
          <Path {...p} d="M10 58 H54" />
        </>
      )}
      {name === 'mold' && (
        <>
          <Path {...p} d="M8 8 H56 V56 H8 Z" />
          <Circle {...p} cx={26} cy={30} r={8} />
          <Circle {...p} cx={42} cy={24} r={5} />
          <Circle {...p} cx={40} cy={42} r={6} />
          <Circle {...p} cx={20} cy={46} r={2} />
          <Circle {...p} cx={50} cy={34} r={1.5} />
        </>
      )}
      {name === 'window' && (
        <>
          <Rect {...p} x={12} y={8} width={40} height={48} rx={3} />
          <Path {...p} d="M32 8 V56 M12 32 H52" />
          <Path {...p} d="M56 20 h-6 M58 26 h-8" />
        </>
      )}
      {name === 'heating' && (
        <>
          <Rect {...p} x={14} y={8} width={36} height={48} rx={6} />
          <Path {...p} d="M32 22 C25 31 25 38 32 44 C39 38 39 31 32 22 Z" />
          <Path {...p} d="M22 52 H42" />
        </>
      )}
      {name === 'plumbing' && (
        <>
          <Rect {...p} x={6} y={14} width={8} height={16} rx={2} />
          <Path {...p} d="M14 22 H36 Q48 22 48 34 V48" />
          <Rect {...p} x={40} y={48} width={16} height={8} rx={2} />
          <Path {...p} d="M26 22 V14 M20 14 H32" />
        </>
      )}
      {name === 'safety' && (
        <>
          <Path {...p} d="M6 56 H20 V44 H32 V32 H44 V20 H58" />
          <Path {...p} d="M10 36 L40 8" />
          <Path {...p} d="M14 32 V44 M28 20 V32" />
        </>
      )}
      {name === 'electric' && (
        <>
          <Rect {...p} x={10} y={10} width={44} height={44} rx={10} />
          <Path {...p} d="M25 22 V31 M39 22 V31" />
          <Path {...p} d="M24 42 H40" />
        </>
      )}
      {name === 'other' && (
        <>
          <Circle {...p} cx={32} cy={32} r={24} />
          <Path {...p} d="M22 32 h0.1 M32 32 h0.1 M42 32 h0.1" />
        </>
      )}
    </Svg>
  );
}
