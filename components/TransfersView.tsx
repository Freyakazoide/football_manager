import React, { useState, useMemo } from 'react';
import { GameState, Player, PlayerRole } from '../types';
import { getRoleCategory } from '../services/database';

interface TransfersViewProps {
    gameState: GameState;
    onPlayerClick: (player: Player) => void;
}

const TransfersView: React.FC<TransfersViewProps> = ({ gameState, onPlayerClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [positionFilter, setPositionFilter] = useState('All');

    const allPlayers = useMemo(() => Object.values(gameState.players), [gameState.players]);

    const filteredPlayers = useMemo(() => {
        return allPlayers.filter(player => {
            const nameMatch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
            const positionMatch = positionFilter === 'All' || getRoleCategory(player.naturalPosition) === positionFilter;
            const notOwnPlayer = player.clubId !== gameState.playerClubId;
            return nameMatch && positionMatch && notOwnPlayer;
        });
    }, [allPlayers, searchTerm, positionFilter, gameState.playerClubId]);

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Transfer Market</h2>
            
            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <input
                    type="text"
                    placeholder="Search player name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow bg-gray-700 text-white p-2 rounded"
                />
                <select
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    className="bg-gray-700 text-white p-2 rounded"
                >
                    <option>All</option>
                    <option>GK</option>
                    <option>DEF</option>
                    <option>MID</option>
                    <option>FWD</option>
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-gray-700 text-gray-400">
                        <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">Position</th>
                            <th className="p-3">Age</th>
                            <th className="p-3">Club</th>
                            <th className="p-3 text-right">Market Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPlayers.slice(0, 100).map(player => (
                            <tr
                                key={player.id}
                                className="border-b border-gray-700 hover:bg-gray-700 cursor-pointer"
                                onClick={() => onPlayerClick(player)}
                            >
                                <td className="p-3 font-semibold">{player.name}</td>
                                <td className="p-3">{player.naturalPosition}</td>
                                <td className="p-3">{player.age}</td>
                                <td className="p-3">{gameState.clubs[player.clubId]?.name}</td>
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

export default TransfersView;