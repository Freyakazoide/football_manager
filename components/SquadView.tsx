import React, { useState, useMemo } from 'react';
import { GameState, Player, PlayerRole } from '../types';
import { getSeason } from '../services/playerStatsService';
import { ROLE_DEFINITIONS } from '../services/database';
import { Action } from '../services/reducerTypes';

interface SquadViewProps {
    gameState: GameState;
    onPlayerClick: (player: Player) => void;
    dispatch: React.Dispatch<Action>;
}

const MentoringModal: React.FC<{
    players: Player[];
    onClose: () => void;
    dispatch: React.Dispatch<Action>;
}> = ({ players, onClose, dispatch }) => {
    const MENTEE_LIMIT = 3;

    const potentialMentors = useMemo(() => 
        players.filter(p => p.age >= 28 && p.attributes.teamwork >= 75 && p.squadStatus !== 'Base')
            .sort((a,b) => b.attributes.teamwork - a.attributes.teamwork)
    , [players]);
    
    const potentialMentees = useMemo(() => 
        players.filter(p => p.age <= 21 && p.squadStatus !== 'Base')
            .sort((a,b) => b.potential - a.potential)
    , [players]);
    
    const currentMentor = players.find(p => p.menteeIds && p.menteeIds.length > 0);
    
    const [selectedMentorId, setSelectedMentorId] = useState<number | null>(currentMentor?.id || null);
    const [selectedMenteeIds, setSelectedMenteeIds] = useState<number[]>(currentMentor?.menteeIds || []);

    const handleMenteeToggle = (menteeId: number) => {
        setSelectedMenteeIds(prev => {
            if (prev.includes(menteeId)) {
                return prev.filter(id => id !== menteeId);
            } else if (prev.length < MENTEE_LIMIT) {
                return [...prev, menteeId];
            }
            return prev;
        });
    };
    
    const handleSetMentor = (mentorId: number | null) => {
        setSelectedMentorId(mentorId);
        // Clear mentees when mentor changes
        setSelectedMenteeIds([]);
    };

    const handleSave = () => {
        dispatch({ type: 'SET_MENTORING_RELATIONSHIPS', payload: { mentorId: selectedMentorId, menteeIds: selectedMenteeIds } });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Gerenciar Mentoria de Elenco</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-bold">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mentors Column */}
                    <div className="bg-gray-900/50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-green-400 mb-3">1. Escolha um Líder de Equipe (Mentor)</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            <label className="flex items-center p-3 rounded-lg bg-gray-700 hover:bg-gray-600 cursor-pointer">
                                <input type="radio" name="mentor" checked={selectedMentorId === null} onChange={() => handleSetMentor(null)} className="form-radio h-5 w-5 text-green-600 bg-gray-900 border-gray-500 focus:ring-green-500" />
                                <span className="ml-3 text-gray-400 font-semibold">Nenhum</span>
                            </label>
                            {potentialMentors.map(p => (
                                <label key={p.id} className="flex items-center p-3 rounded-lg bg-gray-700 hover:bg-gray-600 cursor-pointer">
                                    <input type="radio" name="mentor" value={p.id} checked={selectedMentorId === p.id} onChange={() => handleSetMentor(p.id)} className="form-radio h-5 w-5 text-green-600 bg-gray-900 border-gray-500 focus:ring-green-500" />
                                    <span className="ml-3 font-semibold">{p.name}</span>
                                    <span className="ml-auto text-xs text-gray-400">Idade: {p.age} | Trab. Eq.: {p.attributes.teamwork}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {/* Mentees Column */}
                    <div className={`bg-gray-900/50 p-4 rounded-lg transition-opacity ${!selectedMentorId ? 'opacity-50' : ''}`}>
                        <h3 className="text-lg font-semibold text-green-400 mb-3">2. Atribua Jovens Promessas ({selectedMenteeIds.length}/{MENTEE_LIMIT})</h3>
                         <div className="space-y-2 max-h-96 overflow-y-auto">
                            {potentialMentees.map(p => {
                                const isDisabled = !selectedMentorId || (selectedMenteeIds.length >= MENTEE_LIMIT && !selectedMenteeIds.includes(p.id));
                                return (
                                <label key={p.id} className={`flex items-center p-3 rounded-lg bg-gray-700 ${isDisabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-600 cursor-pointer'}`}>
                                    <input type="checkbox" checked={selectedMenteeIds.includes(p.id)} onChange={() => handleMenteeToggle(p.id)} disabled={isDisabled} className="form-checkbox h-5 w-5 text-green-600 bg-gray-900 border-gray-500 focus:ring-green-500" />
                                    <span className="ml-3 font-semibold">{p.name}</span>
                                    <span className="ml-auto text-xs text-gray-400">Idade: {p.age} | Pot.: {p.potential}</span>
                                </label>
                                );
                            })}
                        </div>
                    </div>
                </div>
                 <div className="p-4 border-t border-gray-700">
                    <button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded">
                        Salvar Relações de Mentoria
                    </button>
                </div>
            </div>
        </div>
    );
};

type SortKey = keyof (Player & { apps: number; avgRating: number; goals: number; assists: number });

const getRoleCategory = (role: PlayerRole): 'GK' | 'DEF' | 'MID' | 'FWD' => {
    return ROLE_DEFINITIONS[role]?.category || 'MID';
};

const MoraleDisplay: React.FC<{ morale: number }> = ({ morale }) => {
    if (morale > 75) return <span className="text-green-400 text-sm">😊 Feliz</span>;
    if (morale > 50) return <span className="text-gray-300 text-sm">😐 Contente</span>;
    return <span className="text-red-400 text-sm">😞 Infeliz</span>;
};


const FitnessBar: React.FC<{ fitness: number }> = ({ fitness }) => {
    const getColor = (val: number) => {
        if (val >= 80) return 'bg-green-500';
        if (val >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="w-24 bg-gray-600 rounded-full h-5 relative mx-auto">
            <div
                className={`${getColor(fitness)} h-5 rounded-full transition-all duration-300`}
                style={{ width: `${fitness}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold">
                {fitness}%
            </span>
        </div>
    );
};

const FilterButton: React.FC<{
    label: string;
    onClick: () => void;
    isActive: boolean;
}> = ({ label, onClick, isActive }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1 text-sm rounded-full transition-colors duration-200 ${isActive ? 'bg-green-600 text-white shadow-md' : 'bg-gray-700 hover:bg-gray-600'}`}
    >
        {label}
    </button>
);

const SkeletonRow = () => (
    <tr className="animate-pulse">
        <td className="p-3"><div className="h-4 bg-gray-700 rounded w-3/4"></div></td>
        <td className="p-3"><div className="h-4 bg-gray-700 rounded w-8 mx-auto"></div></td>
        <td className="p-3"><div className="h-4 bg-gray-700 rounded w-6 mx-auto"></div></td>
        <td className="p-3"><div className="h-4 bg-gray-700 rounded w-6 mx-auto"></div></td>
        <td className="p-3"><div className="h-5 bg-gray-700 rounded-full w-24 mx-auto"></div></td>
        <td className="p-3"><div className="h-4 bg-gray-700 rounded w-6 mx-auto"></div></td>
        <td className="p-3"><div className="h-4 bg-gray-700 rounded w-6 mx-auto"></div></td>
        <td className="p-3"><div className="h-4 bg-gray-700 rounded w-6 mx-auto"></div></td>
        <td className="p-3"><div className="h-4 bg-gray-700 rounded w-10 mx-auto"></div></td>
        <td className="p-3"><div className="h-4 bg-gray-700 rounded w-6 mx-auto"></div></td>
        <td className="p-3"><div className="h-4 bg-gray-700 rounded w-20 ml-auto"></div></td>
    </tr>
);

const SquadView: React.FC<SquadViewProps> = ({ gameState, onPlayerClick, dispatch }) => {
    const [showAlertsOnly, setShowAlertsOnly] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    const [isMentoringModalOpen, setIsMentoringModalOpen] = useState(false);
    
    if (!gameState.playerClubId) return null;
    
    const processedSquad = useMemo(() => {
        const season = getSeason(gameState.currentDate);
        let squadPlayers = (Object.values(gameState.players) as Player[])
            .filter(p => p.clubId === gameState.playerClubId && p.squadStatus !== 'Base')
            .map(player => {
                const seasonStats = player.history.find(h => h.season === season);
                const avgRating = (seasonStats && seasonStats.apps > 0) ? (seasonStats.ratingPoints / seasonStats.apps) : 0;
                return {
                    ...player,
                    apps: seasonStats?.apps ?? 0,
                    goals: seasonStats?.goals ?? 0,
                    assists: seasonStats?.assists ?? 0,
                    avgRating: parseFloat(avgRating.toFixed(2)),
                };
            });
        
        // Filtering
        if (showAlertsOnly) {
            squadPlayers = squadPlayers.filter(p => p.injury || p.suspension || p.seasonYellowCards > 0);
        }
        
        // Sorting helper
        const sortPlayers = (players: (Player & { apps: number; avgRating: number; goals: number; assists: number })[]) => {
            return [...players].sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        };

        // Grouping
        const groupedPlayers: Record<'GK' | 'DEF' | 'MID' | 'FWD', (Player & { apps: number; avgRating: number; goals: number; assists: number })[]> = {
            GK: [],
            DEF: [],
            MID: [],
            FWD: [],
        };

        squadPlayers.forEach(player => {
            const category = getRoleCategory(player.naturalPosition);
            groupedPlayers[category].push(player);
        });
        
        // Sort within each group
        groupedPlayers.GK = sortPlayers(groupedPlayers.GK);
        groupedPlayers.DEF = sortPlayers(groupedPlayers.DEF);
        groupedPlayers.MID = sortPlayers(groupedPlayers.MID);
        groupedPlayers.FWD = sortPlayers(groupedPlayers.FWD);

        return groupedPlayers;
    }, [gameState.players, gameState.playerClubId, gameState.currentDate, showAlertsOnly, sortConfig]);


    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const SortableHeader: React.FC<{ label: string; sortKey: SortKey, className?: string }> = ({ label, sortKey, className }) => {
        const isSorted = sortConfig.key === sortKey;
        const icon = isSorted ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '↕';
        return (
            <th className={`p-3 cursor-pointer select-none hover:bg-gray-600 ${className}`} onClick={() => requestSort(sortKey)}>
                {label} <span className={`text-xs ${isSorted ? 'text-green-400' : 'text-gray-500'}`}>{icon}</span>
            </th>
        );
    };
    
    const groupNames = {
        GK: 'Goleiros',
        DEF: 'Defensores',
        MID: 'Meio-campistas',
        FWD: 'Atacantes'
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            {isMentoringModalOpen && (
                <MentoringModal
                    players={(Object.values(gameState.players) as Player[]).filter(p => p.clubId === gameState.playerClubId)}
                    onClose={() => setIsMentoringModalOpen(false)}
                    dispatch={dispatch}
                />
            )}
            <h2 className="text-2xl font-bold text-white mb-4">Elenco</h2>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-4 p-3 bg-gray-900/50 rounded-lg">
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-400">Filtros:</span>
                    <FilterButton label="Mostrar Alertas" onClick={() => setShowAlertsOnly(!showAlertsOnly)} isActive={showAlertsOnly} />
                </div>
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-400">Ações:</span>
                    <FilterButton label="Gerenciar Mentoria" onClick={() => setIsMentoringModalOpen(true)} isActive={isMentoringModalOpen} />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-gray-700 text-gray-400">
                        <tr>
                            <SortableHeader label="Nome" sortKey="name" />
                            <SortableHeader label="Pos" sortKey="naturalPosition" className="text-center" />
                            <th className="p-3 text-center" title="Status">St</th>
                            <SortableHeader label="Mor" sortKey="morale" className="text-center" />
                            <SortableHeader label="Fís" sortKey="matchFitness" className="text-center" />
                            <SortableHeader label="Jogos" sortKey="apps" className="text-center" />
                            <SortableHeader label="Gols" sortKey="goals" className="text-center" />
                            <SortableHeader label="Assis" sortKey="assists" className="text-center" />
                            <SortableHeader label="Nota" sortKey="avgRating" className="text-center" />
                            <SortableHeader label="Idade" sortKey="age" className="text-center" />
                            <SortableHeader label="Valor" sortKey="marketValue" className="text-right" />
                        </tr>
                    </thead>
                    {(Object.keys(processedSquad) as Array<keyof typeof processedSquad>).map((groupKey) => {
                        const players = processedSquad[groupKey];
                        return (
                        <tbody key={groupKey}>
                            {players.length > 0 && (
                                <tr className="bg-gray-900/70">
                                    <th colSpan={11} className="p-2 text-left text-green-400 font-bold text-sm">
                                        {groupNames[groupKey]}
                                    </th>
                                </tr>
                            )}
                            {players.map((player) => (
                            <tr
                                key={player.id}
                                className={`border-b border-gray-700 hover:bg-gray-700 cursor-pointer ${(player.injury || player.suspension) ? 'opacity-60' : ''}`}
                                onClick={() => onPlayerClick(player)}
                            >
                                <td className="p-3 font-semibold">
                                    <div className="flex items-center gap-2">
                                        <span>{player.name}</span>
                                        {player.menteeIds && player.menteeIds.length > 0 && <span title="Líder de Equipe / Mentor" className="text-yellow-400">⭐</span>}
                                        {player.mentorId && <span title={`Mentorado por ${gameState.players[player.mentorId].name}`} className="text-blue-400">🎓</span>}
                                    </div>
                                </td>
                                <td className="p-3 text-center">{player.naturalPosition}</td>
                                <td className="p-3 text-center">
                                    {player.injury && <span className="text-red-500 font-bold" title={`Lesionado: ${player.injury.type}`}>✚</span>}
                                    {player.suspension && <span className="text-red-500 font-bold" title={`Suspenso até ${player.suspension.returnDate.toLocaleDateString()}`}>■</span>}
                                    {player.seasonYellowCards > 0 && 
                                        <span className="inline-flex items-center justify-center w-5 h-5 bg-yellow-400 text-black font-bold text-xs rounded-sm">
                                            {player.seasonYellowCards}
                                        </span>
                                    }
                                </td>
                                <td className="p-3 text-center whitespace-nowrap"><MoraleDisplay morale={player.morale} /></td>
                                <td className="p-3"><FitnessBar fitness={player.matchFitness} /></td>
                                <td className="p-3 text-center">{player.apps}</td>
                                <td className="p-3 text-center">{player.goals}</td>
                                <td className="p-3 text-center">{player.assists}</td>
                                <td className="p-3 text-center font-bold">{player.avgRating > 0 ? player.avgRating.toFixed(2) : '-'}</td>
                                <td className="p-3 text-center">{player.age}</td>
                                <td className="p-3 text-right">
                                    {player.marketValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                        );
                    })}
                </table>
            </div>
        </div>
    );
};

export default SquadView;