import React from 'react';
import { GameState, Match } from '../types';

interface CalendarViewProps {
    gameState: GameState;
    onMatchClick: (match: Match) => void;
}

const MatchRow: React.FC<{ match: Match, gameState: GameState, onMatchClick: (match: Match) => void }> = ({ match, gameState, onMatchClick }) => {
    const playerClubId = gameState.playerClubId;
    const homeTeam = gameState.clubs[match.homeTeamId];
    const awayTeam = gameState.clubs[match.awayTeamId];
    const isPast = match.date < gameState.currentDate;
    const hasResult = match.homeScore !== undefined;
    const isPlayerMatch = match.homeTeamId === playerClubId || match.awayTeamId === playerClubId;
    
    const isClickable = hasResult && match.log;
    const rowClasses = `p-4 rounded-lg flex flex-col ${isPast ? 'bg-gray-700' : 'bg-gray-600'} ${isClickable ? 'cursor-pointer hover:bg-gray-600/80 transition-colors' : ''} ${isPlayerMatch && isPast ? 'border-2 border-green-600' : ''}`;


    return (
        <div className={rowClasses} onClick={() => isClickable && onMatchClick(match)}>
            <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm w-1/4">{match.date.toLocaleDateString()}</span>
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
                 <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-600 flex justify-around text-center">
                    <div>
                        <div>{match.homeStats.possession}%</div>
                        <div className="font-bold">Possession</div>
                        <div>{match.awayStats.possession}%</div>
                    </div>
                     <div>
                        <div>{match.homeStats.shots}</div>
                        <div className="font-bold">Shots</div>
                        <div>{match.awayStats.shots}</div>
                    </div>
                     <div>
                        <div>{match.homeStats.xG?.toFixed(2)}</div>
                        <div className="font-bold">xG</div>
                        <div>{match.awayStats.xG?.toFixed(2)}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CalendarView: React.FC<CalendarViewProps> = ({ gameState, onMatchClick }) => {
    const allMatches = gameState.schedule;

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Full Season Calendar</h2>
            <div className="space-y-3">
                {allMatches.map(match => (
                    <MatchRow key={match.id} match={match} gameState={gameState} onMatchClick={onMatchClick} />
                ))}
            </div>
        </div>
    );
};

export default CalendarView;