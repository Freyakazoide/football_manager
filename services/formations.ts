import { PlayerRole } from '../types';

export interface FormationPreset {
    name: string;
    positions: { x: number; y: number; role: PlayerRole }[];
}

export const FORMATION_PRESETS: FormationPreset[] = [
    {
        name: '4-4-2',
        positions: [
            { x: 50, y: 95, role: 'Goalkeeper' },
            { x: 18, y: 72, role: 'Full-Back' },
            { x: 38, y: 78, role: 'Central Defender' },
            { x: 62, y: 78, role: 'Central Defender' },
            { x: 82, y: 72, role: 'Full-Back' },
            { x: 18, y: 50, role: 'Wide Midfielder' },
            { x: 40, y: 55, role: 'Central Midfielder' },
            { x: 60, y: 55, role: 'Box-To-Box Midfielder' },
            { x: 82, y: 50, role: 'Wide Midfielder' },
            { x: 40, y: 25, role: 'Deep-Lying Forward' },
            { x: 60, y: 25, role: 'Advanced Forward' },
        ],
    },
    {
        name: '4-3-3',
        positions: [
            { x: 50, y: 95, role: 'Goalkeeper' },
            { x: 18, y: 72, role: 'Full-Back' },
            { x: 38, y: 78, role: 'Central Defender' },
            { x: 62, y: 78, role: 'Central Defender' },
            { x: 82, y: 72, role: 'Full-Back' },
            { x: 50, y: 65, role: 'Defensive Midfielder' },
            { x: 35, y: 48, role: 'Central Midfielder' },
            { x: 65, y: 48, role: 'Mezzala' },
            { x: 20, y: 25, role: 'Wide Playmaker' },
            { x: 50, y: 18, role: 'False Nine' },
            { x: 80, y: 25, role: 'Advanced Forward' },
        ],
    },
    {
        name: '4-2-3-1',
        positions: [
            { x: 50, y: 95, role: 'Goalkeeper' },
            { x: 18, y: 72, role: 'Wing-Back' },
            { x: 38, y: 78, role: 'Ball-Playing Defender' },
            { x: 62, y: 78, role: 'Ball-Playing Defender' },
            { x: 82, y: 72, role: 'Wing-Back' },
            { x: 38, y: 60, role: 'Deep Lying Playmaker' },
            { x: 62, y: 60, role: 'Ball Winning Midfielder' },
            { x: 20, y: 38, role: 'Wide Midfielder' },
            { x: 50, y: 35, role: 'Attacking Midfielder' },
            { x: 80, y: 38, role: 'Wide Midfielder' },
            { x: 50, y: 15, role: 'Complete Forward' },
        ],
    },
     {
        name: '3-5-2',
        positions: [
            { x: 50, y: 95, role: 'Sweeper Keeper' },
            { x: 30, y: 80, role: 'Central Defender' },
            { x: 50, y: 82, role: 'Libero' },
            { x: 70, y: 80, role: 'Central Defender' },
            { x: 15, y: 55, role: 'Wing-Back' },
            { x: 38, y: 60, role: 'Central Midfielder' },
            { x: 62, y: 60, role: 'Central Midfielder' },
            { x: 85, y: 55, role: 'Wing-Back' },
            { x: 50, y: 40, role: 'Attacking Midfielder' },
            { x: 40, y: 20, role: 'Poacher' },
            { x: 60, y: 20, role: 'Deep-Lying Forward' },
        ]
    }
];
