import React, { useState, useMemo } from 'react';
import { GameState, Match } from '../types';

interface CalendarViewProps {
    gameState: GameState;
    onMatchClick: (match: Match) => void;
}

const GraphicalStatBar: React.FC<{ label: string; homeValue: number; awayValue: number; isPercentage?: boolean; isXG?: boolean }> = ({ label, homeValue, awayValue, isPercentage, isXG }) => {
    const total = homeValue + awayValue;
    const homePercent = total > 0 ? (homeValue / total) * 100 : 50;
    const homeDisplay = isPercentage ? `${Math.round(homeValue)}%` : isXG ? homeValue.toFixed(2) : Math.round(homeValue);
    const awayDisplay = isPercentage ? `${Math.round(awayValue)}%` : isXG ? awayValue.toFixed(2) : Math.round(awayValue);

    return (
        <div>
            <div className="flex justify-between items-center text-sm mb-1 px-1">
                <span className="font-bold font-mono text-xs">{homeDisplay}</span>
                <span className="text-gray-400 text-xs">{label}</span>
                <span className="font-bold font-mono text-xs">{awayDisplay}</span>
            </div>
            <div className="flex w-full h-1.5 bg-gray-900 rounded">
                <div className="bg-blue-500 rounded-l" style={{ width: `${homePercent}%` }}></div>
                <div className="bg-red-500 rounded-r" style={{ width: `${100 - homePercent}%` }}></div>
            </div>
        </div>
    );
};


const MatchRow: React.FC<{ match: Match, gameState: GameState, onMatchClick: (match: Match) => void }> = ({ match, gameState, onMatchClick }) => {
    const playerClubId = gameState.playerClubId;
    const homeTeam = gameState.clubs[match.homeTeamId];
    const awayTeam = gameState.clubs[match.awayTeamId];
    const isPast = new Date(match.date).getTime() < new Date(gameState.currentDate).getTime();
    const hasResult = match.homeScore !== undefined;
    const isPlayerMatch = match.homeTeamId === playerClubId || match.awayTeamId === playerClubId;
    
    const isClickable = hasResult && match.log;
    const rowClasses = `p-4 rounded-lg flex flex-col ${isPast ? 'bg-gray-700/80' : 'bg-gray-700/50'} ${isClickable ? 'cursor-pointer hover:bg-gray-600/80 transition-colors' : ''} ${isPlayerMatch && isPast ? 'border-2 border-green-600' : ''}`;


    return (
        <div className={rowClasses} onClick={() => isClickable && onMatchClick(match)}>
            <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm w-1/4">{new Date(match.date).toLocaleDateString()}</span>
                <div className="flex-1 text-center">
                    <span className={match.homeTeamId === playerClubId ? 'font-bold text-green-300' : ''}>{homeTeam.name}</span>
                    <span className="mx-4">vs</span>
                    <span className={match.awayTeamId === playerClubId ? 'font-bold text-green-300' : ''}>{awayTeam.name}</span>
                </div>
                <div className="w-1/4 text-right font-mono text-lg">
                    {hasResult ? `${match.homeScore} - ${match.awayScore}` : '-'}
                </div>
            </div>
            {hasResult && match.homeStats && match.awayStats && (
                 <div className="mt-2 pt-2 border-t border-gray-600 space-y-2">
                    <GraphicalStatBar label="Possession" homeValue={match.homeStats.possession} awayValue={match.awayStats.possession} isPercentage />
                    <GraphicalStatBar label="Shots" homeValue={match.homeStats.shots} awayValue={match.awayStats.shots} />
                    <GraphicalStatBar label="xG" homeValue={match.homeStats.xG} awayValue={match.awayStats.xG} isXG />
                </div>
            )}
        </div>
    );
};

const FilterButton: React.FC<{
    label: string;
    value: string;
    current: string;
    setter: (value: any) => void;
}> = ({ label, value, current, setter }) => (
    <button
        onClick={() => setter(value)}
        className={`px-3 py-1 text-sm rounded-full transition-colors duration-200 ${current === value ? 'bg-green-600 text-white shadow-md' : 'bg-gray-700 hover:bg-gray-600'}`}
    >
        {label}
    </button>
);


const CalendarView: React.FC<CalendarViewProps> = ({ gameState, onMatchClick }) => {
    const [homeAwayFilter, setHomeAwayFilter] = useState<'all' | 'home' | 'away'>('all');
    const [resultFilter, setResultFilter] = useState<'all' | 'W' | 'D' | 'L'>('all');

    const allRoundDates = useMemo(() => {
        const uniqueDates = [...new Set(gameState.schedule.map(m => new Date(m.date).toDateString()))];
        // FIX: Explicitly type sort callback parameters to resolve type inference issue.
        uniqueDates.sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());
        return uniqueDates;
    }, [gameState.schedule]);

    const processedMatches = useMemo(() => {
        const playerClubId = gameState.playerClubId;
        if (!playerClubId) return {};

        const filtered = gameState.schedule.filter(match => {
            if (homeAwayFilter === 'home' && match.homeTeamId !== playerClubId) return false;
            if (homeAwayFilter === 'away' && match.awayTeamId !== playerClubId) return false;

            if (resultFilter !== 'all' && match.homeScore !== undefined && match.awayScore !== undefined) {
                const isPlayerHome = match.homeTeamId === playerClubId;
                const scoreDiff = isPlayerHome ? match.homeScore - match.awayScore : match.awayScore - match.homeScore;
                
                if (resultFilter === 'W' && scoreDiff <= 0) return false;
                if (resultFilter === 'D' && scoreDiff !== 0) return false;
                if (resultFilter === 'L' && scoreDiff >= 0) return false;
            }
            return true;
        });

        const groupedByDate = filtered.reduce((acc, match) => {
            const dateString = new Date(match.date).toDateString();
            if (!acc[dateString]) acc[dateString] = [];
            acc[dateString].push(match);
            return acc;
        }, {} as Record<string, Match[]>);

        return groupedByDate;
    }, [gameState.schedule, homeAwayFilter, resultFilter, gameState.playerClubId]);

    const displayRoundDates = useMemo(() => Object.keys(processedMatches).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()), [processedMatches]);

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Full Season Calendar</h2>
            
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-6 p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400">Venue:</span>
                    <div className="inline-flex gap-2">
                        <FilterButton label="All" value="all" current={homeAwayFilter} setter={setHomeAwayFilter} />
                        <FilterButton label="Home" value="home" current={homeAwayFilter} setter={setHomeAwayFilter} />
                        <FilterButton label="Away" value="away" current={homeAwayFilter} setter={setHomeAwayFilter} />
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400">Result:</span>
                    <div className="inline-flex gap-2">
                        <FilterButton label="All" value="all" current={resultFilter} setter={setResultFilter} />
                        <FilterButton label="Win" value="W" current={resultFilter} setter={setResultFilter} />
                        <FilterButton label="Draw" value="D" current={resultFilter} setter={setResultFilter} />
                        <FilterButton label="Loss" value="L" current={resultFilter} setter={setResultFilter} />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {displayRoundDates.map((dateString) => {
                    const roundNumber = allRoundDates.indexOf(dateString) + 1;
                    return (
                        <div key={dateString}>
                            <h3 className="text-lg font-semibold text-gray-400 mt-4 mb-2 pb-1 border-b-2 border-gray-700">
                                Round {roundNumber}
                            </h3>
                             <div className="space-y-3">
                                {processedMatches[dateString].map(match => (
                                    <MatchRow key={match.id} match={match} gameState={gameState} onMatchClick={onMatchClick} />
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default CalendarView;