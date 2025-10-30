import React, { useState, useMemo, useEffect } from 'react';
import { GameState, Player, PlayerRole } from '../types';
import { getSeason } from '../services/playerStatsService';
import { ROLE_DEFINITIONS } from '../services/database';

interface SquadViewProps {
    gameState: GameState;
    onPlayerClick: (player: Player) => void;
}

type SortKey = keyof (Player & { apps: number; avgRating: number; goals: number; assists: number });

const getRoleCategory = (role: PlayerRole): 'GK' | 'DEF' | 'MID' | 'FWD' => {
    return ROLE_DEFINITIONS[role]?.category || 'MID';
};

const MoraleDisplay: React.FC<{ morale: number }> = ({ morale }) => {
    if (morale > 75) return <span className="text-green-400 text-sm">😊 Happy</span>;
    if (morale > 50) return <span className="text-gray-300 text-sm">😐 Content</span>;
    return <span className="text-red-400 text-sm">😞 Unhappy</span>;
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
                className={`${getColor(fitness)} h-5 rounded-full text-center text-xs text-white font-bold flex items-center justify-center transition-all duration-300`}
                style={{ width: `${fitness}%` }}
            >
                {fitness}%
            </div>
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

const SquadView: React.FC<SquadViewProps> = ({ gameState, onPlayerClick }) => {
    const [positionFilter, setPositionFilter] = useState('All');
    const [showAlertsOnly, setShowAlertsOnly] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    const [isLoading, setIsLoading] = useState(true);
    const [processedSquad, setProcessedSquad] = useState<any[]>([]);
    
    if (!gameState.playerClubId) return null;
    
    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            const season = getSeason(gameState.currentDate);
            let squadPlayers = (Object.values(gameState.players) as Player[])
                .filter(p => p.clubId === gameState.playerClubId)
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
            if (positionFilter !== 'All') {
                squadPlayers = squadPlayers.filter(p => getRoleCategory(p.naturalPosition) === positionFilter);
            }
            if (showAlertsOnly) {
                squadPlayers = squadPlayers.filter(p => p.injury || p.suspension || p.seasonYellowCards > 0);
            }
            
            // Sorting
            squadPlayers.sort((a, b) => {
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
            setProcessedSquad(squadPlayers);
            setIsLoading(false);
        }, 50); // Small delay to allow UI to render loading state before heavy computation

        return () => clearTimeout(timer);

    }, [gameState.players, gameState.playerClubId, gameState.currentDate, positionFilter, showAlertsOnly, sortConfig]);

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

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Squad</h2>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-4 p-3 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-400">Position:</span>
                    <FilterButton label="All" onClick={() => setPositionFilter('All')} isActive={positionFilter === 'All'} />
                    <FilterButton label="GK" onClick={() => setPositionFilter('GK')} isActive={positionFilter === 'GK'} />
                    <FilterButton label="DEF" onClick={() => setPositionFilter('DEF')} isActive={positionFilter === 'DEF'} />
                    <FilterButton label="MID" onClick={() => setPositionFilter('MID')} isActive={positionFilter === 'MID'} />
                    <FilterButton label="FWD" onClick={() => setPositionFilter('FWD')} isActive={positionFilter === 'FWD'} />
                </div>
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-400">Status:</span>
                    <FilterButton label="Show Alerts" onClick={() => setShowAlertsOnly(!showAlertsOnly)} isActive={showAlertsOnly} />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-gray-700 text-gray-400">
                        <tr>
                            <SortableHeader label="Name" sortKey="name" />
                            <SortableHeader label="Pos" sortKey="naturalPosition" className="text-center" />
                            <th className="p-3 text-center" title="Status">St</th>
                            <SortableHeader label="Mor" sortKey="morale" className="text-center" />
                            <SortableHeader label="Fit" sortKey="matchFitness" className="text-center" />
                            <SortableHeader label="Apps" sortKey="apps" className="text-center" />
                            <SortableHeader label="Gls" sortKey="goals" className="text-center" />
                            <SortableHeader label="Ast" sortKey="assists" className="text-center" />
                            <SortableHeader label="Av Rtg" sortKey="avgRating" className="text-center" />
                            <SortableHeader label="Age" sortKey="age" className="text-center" />
                            <SortableHeader label="Value" sortKey="marketValue" className="text-right" />
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 15 }).map((_, index) => <SkeletonRow key={index} />)
                        ) : (
                            processedSquad.map((player) => (
                                <tr
                                    key={player.id}
                                    className={`border-b border-gray-700 hover:bg-gray-700 cursor-pointer ${(player.injury || player.suspension) ? 'opacity-60' : ''}`}
                                    onClick={() => onPlayerClick(player)}
                                >
                                    <td className="p-3 font-semibold">{player.name}</td>
                                    <td className="p-3 text-center">{player.naturalPosition}</td>
                                    <td className="p-3 text-center">
                                        {player.injury && <span className="text-red-500 font-bold" title={`Injured: ${player.injury.type}`}>✚</span>}
                                        {player.suspension && <span className="text-red-500 font-bold" title={`Suspended until ${player.suspension.returnDate.toLocaleDateString()}`}>■</span>}
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
                                        {player.marketValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SquadView;