import React, { useState, useEffect, useMemo } from 'react';
import { GameState, Player, TeamTrainingFocus, IndividualTrainingFocus, PlayerAttributes, PlayerRole, DepartmentType } from '../types';
import { Action } from '../services/reducerTypes';
import { ALL_ROLES } from '../services/database';

interface TrainingViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}

const ATTRIBUTE_KEYS = [
    'passing', 'dribbling', 'shooting', 'tackling', 'heading', 'crossing',
    'aggression', 'creativity', 'positioning', 'teamwork', 'workRate',
    'pace', 'stamina', 'strength', 'naturalFitness'
] as (keyof PlayerAttributes)[];

const TrainingView: React.FC<TrainingViewProps> = ({ gameState, dispatch }) => {
    const playerClubId = gameState.playerClubId;
    if (!playerClubId) return null;

    const club = gameState.clubs[playerClubId];
    const headOfPerformanceId = club.departments[DepartmentType.Performance].chiefId;
    const headOfPerformance = headOfPerformanceId ? gameState.staff[headOfPerformanceId] : null;

    const clubPlayers = useMemo(() =>
        (Object.values(gameState.players) as Player[]).filter(p => p.clubId === playerClubId)
    , [gameState.players, playerClubId]);

    const [teamFocus, setTeamFocus] = useState<TeamTrainingFocus>(club.trainingFocus);
    const [individualFocuses, setIndividualFocuses] = useState<Record<number, IndividualTrainingFocus>>({});

    useEffect(() => {
        setTeamFocus(club.trainingFocus);
        const initialFocuses: Record<number, IndividualTrainingFocus> = {};
        clubPlayers.forEach(p => {
            initialFocuses[p.id] = p.individualTrainingFocus;
        });
        setIndividualFocuses(initialFocuses);
    }, [club, clubPlayers]);

    const handleIndividualFocusChange = (playerId: number, value: string) => {
        let newFocus: IndividualTrainingFocus = null;
        if (value.startsWith('attr_')) {
            newFocus = { type: 'attribute', attribute: value.replace('attr_', '') as keyof PlayerAttributes };
        } else if (value.startsWith('role_')) {
            newFocus = { type: 'role', role: value.replace('role_', '') as PlayerRole };
        }
        setIndividualFocuses(prev => ({ ...prev, [playerId]: newFocus }));
    };

    const handleSaveChanges = () => {
        dispatch({ type: 'UPDATE_TRAINING_SETTINGS', payload: { teamFocus, individualFocuses } });
    };

    const getIndividualFocusValue = (focus: IndividualTrainingFocus): string => {
        if (!focus) return 'none';
        if (focus.type === 'attribute') return `attr_${focus.attribute}`;
        if (focus.type === 'role') return `role_${focus.role}`;
        return 'none';
    };

    const TEAM_FOCUS_OPTIONS: TeamTrainingFocus[] = ['Equilibrado', 'Ofensivo', 'Defensivo', 'Tático', 'Físico', 'Bolas Paradas'];

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 space-y-6">
            <h2 className="text-2xl font-bold text-white">Treino</h2>

            <div className="bg-gray-900/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-400 mb-3">Foco de Treino da Equipe</h3>
                <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-400 mb-3">Defina o foco geral de treino para todo o elenco para a próxima semana. Isso influencia o desenvolvimento de todos os jogadores.</p>
                     <p className="text-sm text-gray-400">Liderado por: <span className="font-semibold text-white">{headOfPerformance?.name || 'N/A'}</span></p>
                </div>
                <select
                    value={teamFocus}
                    onChange={e => setTeamFocus(e.target.value as TeamTrainingFocus)}
                    className="w-full md:w-1/3 bg-gray-700 text-white p-2 rounded"
                >
                    {TEAM_FOCUS_OPTIONS.map(focus => (
                        <option key={focus} value={focus}>{focus}</option>
                    ))}
                </select>
            </div>

            <div className="bg-gray-900/50 p-4 rounded-lg">
                 <h3 className="text-lg font-semibold text-green-400 mb-3">Focos Individuais dos Jogadores</h3>
                 <p className="text-sm text-gray-400 mb-3">Atribua um foco de treino específico a jogadores individuais para melhorar um atributo particular ou treiná-los em uma nova posição/função.</p>
                <div className="overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b-2 border-gray-700 text-gray-400 sticky top-0 bg-gray-900/50 z-10">
                            <tr>
                                <th className="p-3">Jogador</th>
                                <th className="p-3">Posição</th>
                                <th className="p-3">Foco Individual</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clubPlayers.map(player => (
                                <tr key={player.id} className="border-b border-gray-700">
                                    <td className="p-3 font-semibold">{player.name}</td>
                                    <td className="p-3">{player.naturalPosition}</td>
                                    <td className="p-3">
                                        <select
                                            value={getIndividualFocusValue(individualFocuses[player.id])}
                                            onChange={e => handleIndividualFocusChange(player.id, e.target.value)}
                                            className="w-full bg-gray-700 text-white p-2 rounded text-xs"
                                        >
                                            <option value="none">Nenhum</option>
                                            <optgroup label="Atributos">
                                                {ATTRIBUTE_KEYS.map(attr => (
                                                    <option key={attr} value={`attr_${attr}`}>{attr.charAt(0).toUpperCase() + attr.slice(1).replace(/([A-Z])/g, ' $1')}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Nova Função">
                                                {ALL_ROLES.map(role => (
                                                    <option key={role} value={`role_${role}`}>{role}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <button
                onClick={handleSaveChanges}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition-transform duration-200 hover:scale-105"
            >
                Confirmar Cronograma de Treino
            </button>
        </div>
    );
};

export default TrainingView;