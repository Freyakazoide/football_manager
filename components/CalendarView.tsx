import React from 'react';
import { GameState, Match } from '../types';

interface CalendarViewProps {
    gameState: GameState;
}

const MatchRow: React.FC<{ match: Match, gameState: GameState }> = ({ match, gameState }) => {
    const playerClubId = gameState.playerClubId;
    const homeTeam = gameState.clubs[match.homeTeamId];
    const awayTeam = gameState.clubs[match.awayTeamId];
    const isPast = match.date < gameState.currentDate;
    const hasResult = match.homeScore !== undefined;

    return (
        <div className={`p-4 rounded-lg flex flex-col ${isPast ? 'bg-gray-700' : 'bg-gray-600'}`}>
            <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm w-1/4">{match.date.toLocaleDateString()}</span>
                <div className="flex-1 text-center">
                    <span className={match.homeTeamId === playerClubId ? 'font-bold' : ''}>{homeTeam.name}</span>
                    <span className="mx-4">vs</span>
                    <span className={match.awayTeamId === playerClubId ? 'font-bold' : ''}>{awayTeam.name}</span>
                </div>
                <div className="w-1/4 text-right font-mono text-lg">
                    {hasResult ? `${match.homeScore} - ${match.awayScore}` : '-'}
                </div>
            </div>
            {hasResult && match.homeStats && match.awayStats && (
                 <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-600 flex justify-around">
                    <div className="text-center">
                        <div>Possession</div>
                        <div>{match.homeStats.possession}% - {match.awayStats.possession}%</div>
                    </div>
                     <div className="text-center">
                        <div>Shots</div>
                        <div>{match.homeStats.shots} - {match.awayStats.shots}</div>
                    </div>
                     <div className="text-center">
                        <div>On Target</div>
                        <div>{match.homeStats.shotsOnTarget} - {match.awayStats.shotsOnTarget}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CalendarView: React.FC<CalendarViewProps> = ({ gameState }) => {
    const playerClubId = gameState.playerClubId;
    if (!playerClubId) return null;

    const playerSchedule = gameState.schedule.filter(m => m.homeTeamId === playerClubId || m.awayTeamId === playerClubId);

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Calendar</h2>
            <div className="space-y-3">
                {playerSchedule.map(match => (
                    <MatchRow key={match.id} match={match} gameState={gameState} />
                ))}
            </div>
        </div>
    );
};

export default CalendarView;