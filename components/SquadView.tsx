
import React from 'react';
import { GameState, Player } from '../types';

interface SquadViewProps {
    gameState: GameState;
    onPlayerClick: (player: Player) => void;
}

const SquadView: React.FC<SquadViewProps> = ({ gameState, onPlayerClick }) => {
    if (!gameState.playerClubId) return null;

    // FIX: Explicitly type `p` as Player to resolve 'unknown' type error from Object.values.
    const squadPlayers = Object.values(gameState.players).filter((p: Player) => p.clubId === gameState.playerClubId);
    // FIX: Explicitly type `a` and `b` as Player to resolve 'unknown' type error.
    squadPlayers.sort((a: Player, b: Player) => {
        const posOrder = { 'GK': 0, 'DEF': 1, 'MID': 2, 'FWD': 3 };
        return posOrder[a.position] - posOrder[b.position];
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
                            <th className="p-3">Age</th>
                            <th className="p-3 text-right">Wage</th>
                            <th className="p-3 text-right">Market Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {squadPlayers.map(player => (
                            <tr
                                key={player.id}
                                className="border-b border-gray-700 hover:bg-gray-700 cursor-pointer"
                                onClick={() => onPlayerClick(player)}
                            >
                                <td className="p-3 font-semibold">{player.name}</td>
                                <td className="p-3">{player.position}</td>
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
