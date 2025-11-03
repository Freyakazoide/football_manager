
import React, { useMemo, useState } from 'react';
import { GameState, Club, Player, PlayerSeasonStats } from '../types';
import { getSeason } from '../services/playerStatsService';

interface CompetitionViewProps {
    gameState: GameState;
    onClubClick: (clubId: number) => void;
}
type StatCategory = 'goals' | 'assists' | 'tackles' | 'dribbles' | 'avgRating' | 'apps' | 'yellowCards' | 'redCards';

type PlayerWithSeasonStats = {
    player: Player;
    seasonStats: PlayerSeasonStats;
};

const STAT_CATEGORIES: { key: StatCategory; label: string }[] = [
    { key: 'goals', label: 'Goals' },
    { key: 'assists', label: 'Assists' },
    { key: 'avgRating', label: 'Avg Rating' },
    { key: 'apps', label: 'Apps' },
    { key: 'tackles', label: 'Tackles' },
    { key: 'dribbles', label: 'Dribbles' },
    { key: 'yellowCards', label: 'Yellow Cards' },
    { key: 'redCards', label: 'Red Cards' },
];

const PlayerStatsView: React.FC<{ gameState: GameState }> = ({ gameState }) => {
    const [stat, setStat] = useState<StatCategory>('goals');
    const playerClub = gameState.clubs[gameState.playerClubId!];

    const playersWithStats = useMemo((): PlayerWithSeasonStats[] => {
        const season = getSeason(gameState.currentDate);
        return (Object.values(gameState.players) as Player[])
            .filter(p => gameState.clubs[p.clubId]?.competitionId === playerClub.competitionId)
            .map(player => {
                const seasonStats = player.history.find(h => h.season === season);
                return { player, seasonStats };
            })
            .filter((item): item is PlayerWithSeasonStats => !!item.seasonStats && item.seasonStats.apps > 0);
    }, [gameState.players, gameState.currentDate, gameState.clubs, playerClub.competitionId]);

    const sortedPlayers = useMemo(() => {
        return [...playersWithStats].sort((a, b) => {
            if (stat === 'avgRating') {
                const ratingA = a.seasonStats.ratingPoints / a.seasonStats.apps;
                const ratingB = b.seasonStats.ratingPoints / b.seasonStats.apps;
                return ratingB - ratingA;
            }
            if (stat === 'yellowCards') {
                return b.player.seasonYellowCards - a.player.seasonYellowCards;
            }
            // FIX: Explicitly cast 'stat' to a keyof PlayerSeasonStats that is known to be numeric,
            // after handling the special string-only cases ('avgRating', 'yellowCards'), to resolve the arithmetic operation error.
            const numericStat = stat as 'goals' | 'assists' | 'tackles' | 'dribbles' | 'apps' | 'redCards';
            return b.seasonStats[numericStat] - a.seasonStats[numericStat];
        }).slice(0, 20);
    }, [playersWithStats, stat]);

    const getStatValue = (item: PlayerWithSeasonStats) => {
        if (stat === 'avgRating') {
            return (item.seasonStats.ratingPoints / item.seasonStats.apps).toFixed(2);
        }
        if (stat === 'yellowCards') {
            return item.player.seasonYellowCards;
        }
        return item.seasonStats[stat as keyof PlayerSeasonStats];
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Player Statistics</h3>
                <select 
                    value={stat} 
                    onChange={(e) => setStat(e.target.value as StatCategory)}
                    className="bg-gray-700 text-white p-2 rounded"
                >
                    {STAT_CATEGORIES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
            </div>
             <table className="w-full text-left">
                <thead className="border-b-2 border-gray-700 text-gray-400">
                    <tr>
                        <th className="p-3">Rank</th>
                        <th className="p-3">Player</th>
                        <th className="p-3">Club</th>
                        <th className="p-3 text-right font-bold">Stat</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedPlayers.map((item, index) => (
                        <tr key={item.player.id} className="border-b border-gray-700">
                            <td className="p-3">{index + 1}</td>
                            <td className="p-3 font-semibold">{item.player.name}</td>
                            <td className="p-3 text-gray-400">{gameState.clubs[item.player.clubId].name}</td>
                            <td className="p-3 text-right font-bold">{getStatValue(item)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const InjuryListView: React.FC<{ gameState: GameState }> = ({ gameState }) => {
    const injuredPlayers = useMemo(() => {
        return (Object.values(gameState.players) as Player[]).filter(p => p.injury);
    }, [gameState.players]);

    return (
        <div>
            <h3 className="text-xl font-bold text-white mb-4">League Injury List</h3>
            <table className="w-full text-left">
                <thead className="border-b-2 border-gray-700 text-gray-400">
                    <tr>
                        <th className="p-3">Player</th>
                        <th className="p-3">Club</th>
                        <th className="p-3">Injury</th>
                        <th className="p-3 text-right">Expected Return</th>
                    </tr>
                </thead>
                <tbody>
                    {injuredPlayers.length > 0 ? injuredPlayers.map(player => (
                        <tr key={player.id} className="border-b border-gray-700">
                            <td className="p-3 font-semibold">{player.name}</td>
                            <td className="p-3 text-gray-400">{gameState.clubs[player.clubId].name}</td>
                            <td className="p-3">{player.injury!.type}</td>
                            <td className="p-3 text-right">{player.injury!.returnDate.toLocaleDateString()}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={4} className="p-4 text-center text-gray-500">No players are currently injured.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};


const CompetitionView: React.FC<CompetitionViewProps> = ({ gameState, onClubClick }) => {
    const [activeTab, setActiveTab] = useState<'table' | 'stats' | 'injuries'>('table');
    
    if (!gameState.playerClubId) return null;
    const playerClub = gameState.clubs[gameState.playerClubId];
    const competition = gameState.competitions[playerClub.competitionId];

    const competitionLeagueTable = useMemo(() => {
        return gameState.leagueTable
            .filter(entry => gameState.clubs[entry.clubId]?.competitionId === playerClub.competitionId)
            .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
    }, [gameState.leagueTable, gameState.clubs, playerClub.competitionId]);

    const renderLeagueTable = () => (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="border-b-2 border-gray-700 text-gray-400">
                    <tr>
                        <th className="p-3">Pos</th>
                        <th className="p-3">Club</th>
                        <th className="p-3 text-center">P</th>
                        <th className="p-3 text-center">W</th>
                        <th className="p-3 text-center">D</th>
                        <th className="p-3 text-center">L</th>
                        <th className="p-3 text-center">GF</th>
                        <th className="p-3 text-center">GA</th>
                        <th className="p-3 text-center">GD</th>
                        <th className="p-3 text-center font-bold">Pts</th>
                    </tr>
                </thead>
                <tbody>
                    {competitionLeagueTable.map((entry, index) => {
                        const club = gameState.clubs[entry.clubId];
                        const isPlayerClub = entry.clubId === gameState.playerClubId;
                        return (
                            <tr
                                key={entry.clubId}
                                className={`border-b border-gray-700 ${isPlayerClub ? 'bg-green-900' : 'hover:bg-gray-700'}`}
                            >
                                <td className="p-3 font-semibold">{index + 1}</td>
                                <td 
                                    onClick={() => onClubClick(club.id)}
                                    className={`p-3 font-semibold ${isPlayerClub ? 'text-green-300' : 'cursor-pointer hover:text-green-400'}`}
                                >
                                    {club.name}
                                </td>
                                <td className="p-3 text-center">{entry.played}</td>
                                <td className="p-3 text-center">{entry.wins}</td>
                                <td className="p-3 text-center">{entry.draws}</td>
                                <td className="p-3 text-center">{entry.losses}</td>
                                <td className="p-3 text-center">{entry.goalsFor}</td>
                                <td className="p-3 text-center">{entry.goalsAgainst}</td>
                                <td className="p-3 text-center">{entry.goalDifference}</td>
                                <td className="p-3 text-center font-bold">{entry.points}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-1">{competition.name}</h2>
            <div className="flex border-b border-gray-700 mb-4">
                <button onClick={() => setActiveTab('table')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'table' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    League Table
                </button>
                 <button onClick={() => setActiveTab('stats')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'stats' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Player Stats
                </button>
                 <button onClick={() => setActiveTab('injuries')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'injuries' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Injury List
                </button>
            </div>
            
            {activeTab === 'table' && renderLeagueTable()}
            {activeTab === 'stats' && <PlayerStatsView gameState={gameState} />}
            {activeTab === 'injuries' && <InjuryListView gameState={gameState} />}
        </div>
    );
};

export default CompetitionView;