import React, { useMemo } from 'react';
import { GameState, Player, PlayerRole } from '../types';

interface AcademyViewProps {
    gameState: GameState;
    onPromotePlayer: (playerId: number) => void;
    onPlayerClick: (player: Player) => void;
}

const AcademyView: React.FC<AcademyViewProps> = ({ gameState, onPromotePlayer, onPlayerClick }) => {
    const playerClubId = gameState.playerClubId;
    if (!playerClubId) return null;

    const youthPlayers = useMemo(() =>
        (Object.values(gameState.players) as Player[])
            .filter(p => p.clubId === playerClubId && p.squadStatus === 'youth')
            .sort((a, b) => b.potential - a.potential)
    , [gameState.players, playerClubId]);
    
    const formatCurrency = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Youth Academy</h2>
            <p className="text-gray-400 mb-6">Here are the current prospects in your club's academy. Nurture their talent through training and promote them when they are ready for the first team.</p>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-gray-700 text-gray-400">
                        <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">Age</th>
                            <th className="p-3">Position</th>
                            <th className="p-3 text-center">Potential</th>
                            <th className="p-3 text-right">Value</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {youthPlayers.map(player => (
                            <tr
                                key={player.id}
                                className="border-b border-gray-700 hover:bg-gray-700"
                            >
                                <td 
                                    className="p-3 font-semibold cursor-pointer" 
                                    onClick={() => onPlayerClick(player)}
                                >
                                    {player.name}
                                </td>
                                <td className="p-3">{player.age}</td>
                                <td className="p-3">{player.naturalPosition}</td>
                                <td className="p-3 text-center font-mono font-bold text-green-300">
                                    {player.potential}
                                </td>
                                <td className="p-3 text-right font-mono">
                                    {formatCurrency(player.marketValue)}
                                </td>
                                <td className="p-3 text-center">
                                    <button 
                                        onClick={() => onPromotePlayer(player.id)}
                                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm transition-colors duration-200"
                                    >
                                        Promote
                                    </button>
                                </td>
                            </tr>
                        ))}
                         {youthPlayers.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center p-8 text-gray-500">
                                    Your academy is currently empty. A new intake of youth players will arrive at the end of the season.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AcademyView;
