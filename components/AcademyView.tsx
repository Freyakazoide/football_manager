
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
            // FIX: The comparison 'squadStatus === 'youth'' is invalid because 'youth' is not a valid SquadStatus. Changed to 'Base' to correctly filter for academy players.
            .filter(p => p.clubId === playerClubId && p.squadStatus === 'Base')
            .sort((a, b) => b.potential - a.potential)
    , [gameState.players, playerClubId]);
    
    const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Categoria de Base</h2>
            <p className="text-gray-400 mb-6">Aqui estão os jovens talentos da base do seu clube. Desenvolva o talento deles através do treino e promova-os quando estiverem prontos para o time principal.</p>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-gray-700 text-gray-400">
                        <tr>
                            <th className="p-3">Nome</th>
                            <th className="p-3">Idade</th>
                            <th className="p-3">Posição</th>
                            <th className="p-3 text-center">Potencial</th>
                            <th className="p-3 text-right">Valor</th>
                            <th className="p-3 text-center">Ações</th>
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
                                        Promover
                                    </button>
                                </td>
                            </tr>
                        ))}
                         {youthPlayers.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center p-8 text-gray-500">
                                    Sua categoria de base está vazia. Uma nova leva de jovens jogadores chegará ao final da temporada.
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