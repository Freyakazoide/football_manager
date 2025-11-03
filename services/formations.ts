import { PlayerRole } from '../types';

export interface FormationPreset {
    name: string;
    positions: { x: number; y: number; role: PlayerRole }[];
}

// FIX: Translated all player roles from English to Portuguese to match the defined PlayerRole type.
export const FORMATION_PRESETS: FormationPreset[] = [
    {
        name: '4-4-2',
        positions: [
            { x: 50, y: 95, role: 'Goleiro' },
            { x: 18, y: 72, role: 'Lateral' },
            { x: 38, y: 78, role: 'Zagueiro' },
            { x: 62, y: 78, role: 'Zagueiro' },
            { x: 82, y: 72, role: 'Lateral' },
            { x: 18, y: 50, role: 'Meia Aberto' },
            { x: 40, y: 55, role: 'Meio-campista' },
            { x: 60, y: 55, role: 'Meia Box-to-Box' },
            { x: 82, y: 50, role: 'Meia Aberto' },
            { x: 40, y: 25, role: 'Atacante Recuado' },
            { x: 60, y: 25, role: 'Atacante Avançado' },
        ],
    },
    {
        name: '4-3-3',
        positions: [
            { x: 50, y: 95, role: 'Goleiro' },
            { x: 18, y: 72, role: 'Lateral' },
            { x: 38, y: 78, role: 'Zagueiro' },
            { x: 62, y: 78, role: 'Zagueiro' },
            { x: 82, y: 72, role: 'Lateral' },
            { x: 50, y: 65, role: 'Volante' },
            { x: 35, y: 48, role: 'Meio-campista' },
            { x: 65, y: 48, role: 'Mezzala' },
            { x: 20, y: 25, role: 'Armador Aberto' },
            { x: 50, y: 18, role: 'Falso Nove' },
            { x: 80, y: 25, role: 'Atacante Avançado' },
        ],
    },
    {
        name: '4-2-3-1',
        positions: [
            { x: 50, y: 95, role: 'Goleiro' },
            { x: 18, y: 72, role: 'Ala' },
            { x: 38, y: 78, role: 'Zagueiro com Passe' },
            { x: 62, y: 78, role: 'Zagueiro com Passe' },
            { x: 82, y: 72, role: 'Ala' },
            { x: 38, y: 60, role: 'Construtor de Jogo Recuado' },
            { x: 62, y: 60, role: 'Volante Ladrão de Bolas' },
            { x: 20, y: 38, role: 'Meia Aberto' },
            { x: 50, y: 35, role: 'Meia Atacante' },
            { x: 80, y: 38, role: 'Meia Aberto' },
            { x: 50, y: 15, role: 'Atacante Completo' },
        ],
    },
     {
        name: '3-5-2',
        positions: [
            { x: 50, y: 95, role: 'Goleiro Líbero' },
            { x: 30, y: 80, role: 'Zagueiro' },
            { x: 50, y: 82, role: 'Líbero' },
            { x: 70, y: 80, role: 'Zagueiro' },
            { x: 15, y: 55, role: 'Ala' },
            { x: 38, y: 60, role: 'Meio-campista' },
            { x: 62, y: 60, role: 'Meio-campista' },
            { x: 85, y: 55, role: 'Ala' },
            { x: 50, y: 40, role: 'Meia Atacante' },
            { x: 40, y: 20, role: 'Finalizador' },
            { x: 60, y: 20, role: 'Atacante Recuado' },
        ]
    }
];
