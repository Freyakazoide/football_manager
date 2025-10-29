import React from 'react';
import { GameState, Player, PlayerRole } from '../types';

interface SquadViewProps {
    gameState: GameState;
    onPlayerClick: (player: Player) => void;
}

const roleOrder: Record<PlayerRole, number> = {
    'GK': 1,
    'LB': 10, 'LWB': 11, 'CB': 12, 'RB': 13, 'RWB': 14,
    'DM': 20, 'LM': 21, 'CM': 22, 'RM': 23, 'AM': 24,
    'LW': 30, 'ST': 31, 'CF': 32, 'RW': 33,
};

const getMoraleIcon = (morale: number): string => {
    if (morale > 75) return '😊'; // Happy
    if (morale > 50) return '😐'; // Content
    return '😞'; // Unhappy
}

const SquadView: React.FC<SquadViewProps> = ({ gameState, onPlayerClick }) => {
    if (!gameState.playerClubId) return null;

    const squadPlayers = Object.values(gameState.players).filter((p: Player) => p.clubId === gameState.playerClubId);
    squadPlayers.sort((a: Player, b: Player) => {
        return (roleOrder[a.naturalPosition] || 99) - (roleOrder[b.naturalPosition] || 99);
    });

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Squad</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-gray-700 text-gray-400">
                        <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">Position</th>
                            <th className="p-3 text-center" title="Status">St</th>
                            <th className="p-3 text-center" title="Yellow Cards">YC</th>
                            <th className="p-3 text-center" title="Morale">Mor</th>
                            <th className="p-3 text-center" title="Match Fitness">Fit</th>
                            <th className="p-3">Age</th>
                            <th className="p-3 text-right">Wage</th>
                            <th className="p-3 text-right">Market Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {squadPlayers.map((player: Player) => (
                            <tr
                                key={player.id}
                                className={`border-b border-gray-700 hover:bg-gray-700 cursor-pointer ${(player.injury || player.suspension) ? 'opacity-60' : ''}`}
                                onClick={() => onPlayerClick(player)}
                            >
                                <td className="p-3 font-semibold">{player.name}</td>
                                <td className="p-3">{player.naturalPosition}</td>
                                <td className="p-3 text-center">
                                    {player.injury && <span className="text-red-500 font-bold" title={`Injured: ${player.injury.type}`}>✚</span>}
                                    {player.suspension && <span className="text-red-500 font-bold" title={`Suspended until ${player.suspension.returnDate.toLocaleDateString()}`}>■</span>}
                                </td>
                                <td className="p-3 text-center">
                                    {player.seasonYellowCards > 0 && 
                                        <span className="inline-flex items-center justify-center w-5 h-5 bg-yellow-400 text-black font-bold text-xs rounded-sm">
                                            {player.seasonYellowCards}
                                        </span>
                                    }
                                </td>
                                <td className="p-3 text-center" title={`${player.morale}`}>{getMoraleIcon(player.morale)}</td>
                                <td className="p-3 text-center">{player.matchFitness}</td>
                                <td className="p-3">{player.age}</td>
                                <td className="p-3 text-right">
                                    {player.wage.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                </td>
                                <td className="p-3 text-right">
                                    {player.marketValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SquadView;