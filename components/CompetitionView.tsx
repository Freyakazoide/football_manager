
import React from 'react';
import { GameState } from '../types';

interface CompetitionViewProps {
    gameState: GameState;
}

const CompetitionView: React.FC<CompetitionViewProps> = ({ gameState }) => {
    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">League Table</h2>
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
                        {gameState.leagueTable.map((entry, index) => {
                            const club = gameState.clubs[entry.clubId];
                            const isPlayerClub = entry.clubId === gameState.playerClubId;
                            return (
                                <tr
                                    key={entry.clubId}
                                    className={`border-b border-gray-700 ${isPlayerClub ? 'bg-green-900' : 'hover:bg-gray-700'}`}
                                >
                                    <td className="p-3 font-semibold">{index + 1}</td>
                                    <td className={`p-3 font-semibold ${isPlayerClub ? 'text-green-300' : ''}`}>{club.name}</td>
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
        </div>
    );
};

export default CompetitionView;
