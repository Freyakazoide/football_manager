import React, { useState, useMemo } from 'react';
import { GameState, Match, Player, LeagueEntry, PlayerSeasonStats } from '../types';
import { getSeason } from '../services/playerStatsService';

interface TeamViewProps {
    gameState: GameState;
}

// --- WIDGETS ---

const NextMatchWidget: React.FC<{ nextMatch: Match | undefined; gameState: GameState }> = ({ nextMatch, gameState }) => {
    if (!nextMatch) {
        return <p className="text-gray-400">No upcoming matches scheduled.</p>;
    }
    const opponentId = nextMatch.homeTeamId === gameState.playerClubId ? nextMatch.awayTeamId : nextMatch.homeTeamId;
    const opponent = gameState.clubs[opponentId];
    const isHome = nextMatch.homeTeamId === gameState.playerClubId;

    return (
        <div>
            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider">Next Match</h3>
            <div className="mt-2 text-center">
                <p className="text-gray-500 text-xs">{new Date(nextMatch.date).toLocaleDateString()}</p>
                <p className="text-xl font-bold text-white">{opponent.name}</p>
                <p className="text-sm text-gray-400">{isHome ? '(Home)' : '(Away)'}</p>
            </div>
        </div>
    );
};

const RecentFormWidget: React.FC<{ recentMatches: Match[]; playerClubId: number }> = ({ recentMatches, playerClubId }) => {
    const getResult = (match: Match) => {
        if (match.homeScore === undefined || match.awayScore === undefined) return null;
        const isHome = match.homeTeamId === playerClubId;
        const scoreDiff = isHome ? match.homeScore - match.awayScore : match.awayScore - match.homeScore;
        if (scoreDiff > 0) return { res: 'W', color: 'bg-green-500' };
        if (scoreDiff < 0) return { res: 'L', color: 'bg-red-500' };
        return { res: 'D', color: 'bg-gray-500' };
    };

    return (
        <div className="mt-4 pt-4 border-t border-gray-700">
            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Recent Form</h3>
            <div className="flex justify-center gap-2">
                {recentMatches.length > 0 ? recentMatches.slice(0, 5).reverse().map(match => {
                    const result = getResult(match);
                    return result ? (
                        <span key={match.id} className={`w-8 h-8 flex items-center justify-center font-bold text-white rounded-full text-sm ${result.color}`}>
                            {result.res}
                        </span>
                    ) : null;
                }) : <p className="text-xs text-gray-500">No matches played yet.</p>}
            </div>
        </div>
    );
};

const LeaguePositionWidget: React.FC<{ leagueEntry: LeagueEntry | undefined; position: number }> = ({ leagueEntry, position }) => {
    if (!leagueEntry) {
        return <p className="text-gray-400">Not in league.</p>;
    }
    return (
        <div>
            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">League Position</h3>
            <div className="flex items-baseline justify-center gap-4">
                <span className="text-6xl font-bold text-green-400">{position}</span>
                <div className="text-left">
                    <p className="font-semibold">{leagueEntry.points} pts</p>
                    <p className="text-xs text-gray-400">{leagueEntry.wins}-{leagueEntry.draws}-{leagueEntry.losses}</p>
                </div>
            </div>
        </div>
    );
};

const TeamStatsWidget: React.FC<{ gameState: GameState }> = ({ gameState }) => {
    const season = getSeason(gameState.currentDate);
    // FIX: Cast Object.values to Player[] to correctly infer player type.
    const clubPlayers = (Object.values(gameState.players) as Player[]).filter(p => p.clubId === gameState.playerClubId);

    const playersWithStats = clubPlayers.map(p => {
        const seasonStats = p.history.find(h => h.season === season);
        return {
            player: p,
            goals: seasonStats?.goals ?? 0,
            assists: seasonStats?.assists ?? 0,
        };
    });

    const topScorer = playersWithStats.reduce((top, current) => (current.goals > top.goals ? current : top), { player: null, goals: 0 } as any);
    const topAssister = playersWithStats.reduce((top, current) => (current.assists > top.assists ? current : top), { player: null, assists: 0 } as any);

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h3 className="text-xl font-bold text-white mb-3">Season Leaders</h3>
            <div className="space-y-4">
                <div>
                    <p className="text-sm text-gray-400">Top Scorer</p>
                    {topScorer.goals > 0 && topScorer.player ? (
                        <p className="text-lg font-semibold">{topScorer.player.name} - <span className="font-bold text-green-400">{topScorer.goals}</span></p>
                    ) : <p className="text-sm text-gray-400">-</p>}
                </div>
                <div>
                    <p className="text-sm text-gray-400">Top Assister</p>
                     {topAssister.assists > 0 && topAssister.player ? (
                        <p className="text-lg font-semibold">{topAssister.player.name} - <span className="font-bold text-green-400">{topAssister.assists}</span></p>
                    ) : <p className="text-sm text-gray-400">-</p>}
                </div>
            </div>
        </div>
    );
};

const SquadStatsTable: React.FC<{ gameState: GameState }> = ({ gameState }) => {
    const season = getSeason(gameState.currentDate);
    // FIX: Cast Object.values to Player[] to correctly infer player type in subsequent methods.
    const clubPlayers = (Object.values(gameState.players) as Player[])
        .filter(p => p.clubId === gameState.playerClubId)
        .map(player => {
            const seasonStats = player.history.find(h => h.season === season);
            return { player, seasonStats };
        })
        .filter((item): item is { player: Player; seasonStats: PlayerSeasonStats } => !!item.seasonStats && item.seasonStats.apps > 0)
        .sort((a, b) => b.seasonStats.goals - a.seasonStats.goals);

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 mt-6">
            <h2 className="text-xl font-bold text-white mb-4">Squad Season Statistics</h2>
            <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-sm">
                    <thead className="border-b-2 border-gray-700 text-gray-400 sticky top-0 bg-gray-800">
                        <tr>
                            <th className="p-2">Player</th>
                            <th className="p-2 text-center">Apps</th>
                            <th className="p-2 text-center">Gls</th>
                            <th className="p-2 text-center">Ast</th>
                            <th className="p-2 text-center font-bold">Av Rtg</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clubPlayers.map(({ player, seasonStats }) => (
                            <tr key={player.id} className="border-b border-gray-700">
                                <td className="p-2 font-semibold">{player.name}</td>
                                <td className="p-2 text-center">{seasonStats.apps} ({seasonStats.subOn})</td>
                                <td className="p-2 text-center">{seasonStats.goals}</td>
                                <td className="p-2 text-center">{seasonStats.assists}</td>
                                <td className="p-2 text-center font-bold">
                                    {(seasonStats.ratingPoints / seasonStats.apps).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const FinancesSummary: React.FC<{ gameState: GameState }> = ({ gameState }) => {
    const club = gameState.clubs[gameState.playerClubId!];
    const clubPlayers = (Object.values(gameState.players) as Player[]).filter(p => p.clubId === club.id);
    const totalWeeklyWage = clubPlayers.reduce((sum, p) => sum + p.wage, 0);
    const formatCurrency = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Financial Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-gray-400 text-sm">Total Balance</h3>
                    <p className={`text-3xl font-bold ${club.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(club.balance)}
                    </p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-gray-400 text-sm">Weekly Wage Bill</h3>
                    <p className="text-3xl font-bold text-orange-400">
                        {formatCurrency(totalWeeklyWage)}
                    </p>
                </div>
                 <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-gray-400 text-sm">Monthly Wage Bill (est.)</h3>
                    <p className="text-3xl font-bold text-red-400">
                        {formatCurrency(totalWeeklyWage * 4)}
                    </p>
                </div>
            </div>
        </div>
    );
};

const PlayerWagesList: React.FC<{ gameState: GameState }> = ({ gameState }) => {
    const clubPlayers = (Object.values(gameState.players) as Player[])
        .filter(p => p.clubId === gameState.playerClubId)
        .sort((a, b) => b.wage - a.wage);
    const formatCurrency = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 mt-6">
            <h2 className="text-xl font-bold text-white mb-4">Player Wages</h2>
            <div className="overflow-y-auto max-h-96">
                <table className="w-full text-left text-sm">
                    <thead className="border-b-2 border-gray-700 text-gray-400 sticky top-0 bg-gray-800">
                        <tr>
                            <th className="p-2">Player</th>
                            <th className="p-2 text-right">Weekly Wage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clubPlayers.map(player => (
                            <tr key={player.id} className="border-b border-gray-700">
                                <td className="p-2 font-semibold">{player.name}</td>
                                <td className="p-2 text-right font-mono">{formatCurrency(player.wage)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const RecentResultsList: React.FC<{ recentMatches: Match[]; gameState: GameState }> = ({ recentMatches, gameState }) => {
    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Recent Results</h2>
            <div className="space-y-3">
                {recentMatches.length > 0 ? recentMatches.map(match => {
                    const homeTeam = gameState.clubs[match.homeTeamId];
                    const awayTeam = gameState.clubs[match.awayTeamId];
                    const isPlayerHome = match.homeTeamId === gameState.playerClubId;
                    const scoreDiff = isPlayerHome ? match.homeScore! - match.awayScore! : match.awayScore! - match.homeScore!;
                    const resultColor = scoreDiff > 0 ? 'border-green-600' : scoreDiff < 0 ? 'border-red-600' : 'border-gray-600';

                    return (
                        <div key={match.id} className={`p-3 bg-gray-700/50 rounded-lg border-l-4 ${resultColor} flex justify-between items-center`}>
                             <span className={`w-2/5 text-right ${isPlayerHome ? 'font-bold text-white' : 'text-gray-400'}`}>{homeTeam.name}</span>
                             <span className="font-mono text-lg font-bold mx-2">{match.homeScore} - {match.awayScore}</span>
                             <span className={`w-2/5 text-left ${!isPlayerHome ? 'font-bold text-white' : 'text-gray-400'}`}>{awayTeam.name}</span>
                        </div>
                    )
                }) : <p className="text-gray-500 text-center">No matches played yet.</p>}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const TeamView: React.FC<TeamViewProps> = ({ gameState }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'finances'>('overview');
    const playerClubId = gameState.playerClubId;
    if (!playerClubId) return null;

    const club = gameState.clubs[playerClubId];

    const { nextMatch, recentMatches, leagueEntry, position } = useMemo(() => {
        const nextMatch = gameState.schedule
            .filter(m => (m.homeTeamId === playerClubId || m.awayTeamId === playerClubId) && m.homeScore === undefined)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    
        const recentMatches = gameState.schedule
            .filter(m => (m.homeTeamId === playerClubId || m.awayTeamId === playerClubId) && m.homeScore !== undefined)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

        const leagueEntry = gameState.leagueTable.find(e => e.clubId === playerClubId);
        const position = leagueEntry ? gameState.leagueTable.findIndex(e => e.clubId === playerClubId) + 1 : 0;
        return { nextMatch, recentMatches, leagueEntry, position };
    }, [gameState.schedule, gameState.leagueTable, playerClubId]);
    
    const TabButton = ({ tab, label }: { tab: typeof activeTab; label: string }) => (
        <button 
            onClick={() => setActiveTab(tab)}
            className={`capitalize py-2 px-4 text-sm font-semibold transition-colors duration-200 ${activeTab === tab ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}
        >
            {label}
        </button>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-800 rounded-lg shadow-xl p-6">
                                <NextMatchWidget nextMatch={nextMatch} gameState={gameState} />
                                <RecentFormWidget recentMatches={recentMatches} playerClubId={playerClubId} />
                            </div>
                            <div className="bg-gray-800 rounded-lg shadow-xl p-6 flex items-center justify-center">
                                <LeaguePositionWidget leagueEntry={leagueEntry} position={position} />
                            </div>
                        </div>
                        <RecentResultsList recentMatches={recentMatches} gameState={gameState} />
                    </div>
                );
            case 'stats':
                return (
                    <div className="space-y-6">
                        <TeamStatsWidget gameState={gameState} />
                        <SquadStatsTable gameState={gameState} />
                    </div>
                );
            case 'finances':
                return (
                     <div className="space-y-6">
                        <FinancesSummary gameState={gameState} />
                        <PlayerWagesList gameState={gameState} />
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">{club.name} - Team Hub</h1>
            <div className="bg-gray-900/50 rounded-lg shadow-xl">
                 <div className="flex border-b border-gray-700 px-4">
                    <TabButton tab="overview" label="Overview" />
                    <TabButton tab="stats" label="Stats" />
                    <TabButton tab="finances" label="Finances" />
                </div>
                <div className="p-4 md:p-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default TeamView;
