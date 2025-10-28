
import React from 'react';
import { GameState } from '../types';

interface CalendarViewProps {
    gameState: GameState;
}

const CalendarView: React.FC<CalendarViewProps> = ({ gameState }) => {
    const playerClubId = gameState.playerClubId;
    if (!playerClubId) return null;

    const playerSchedule = gameState.schedule.filter(m => m.homeTeamId === playerClubId || m.awayTeamId === playerClubId);

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Calendar</h2>
            <div className="space-y-3">
                {playerSchedule.map(match => {
                    const homeTeam = gameState.clubs[match.homeTeamId];
                    const awayTeam = gameState.clubs[match.awayTeamId];
                    const isPast = match.date < gameState.currentDate;
                    const hasResult = match.homeScore !== undefined;

                    return (
                        <div key={match.id} className={`p-4 rounded-lg flex justify-between items-center ${isPast ? 'bg-gray-700' : 'bg-gray-600'}`}>
                            <span className="text-gray-400 text-sm">{match.date.toLocaleDateString()}</span>
                            <div className="flex-1 text-center">
                                <span className={match.homeTeamId === playerClubId ? 'font-bold' : ''}>{homeTeam.name}</span>
                                <span className="mx-4">vs</span>
                                <span className={match.awayTeamId === playerClubId ? 'font-bold' : ''}>{awayTeam.name}</span>
                            </div>
                            <div className="w-24 text-right font-mono text-lg">
                                {hasResult ? `${match.homeScore} - ${match.awayScore}` : '-'}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;
