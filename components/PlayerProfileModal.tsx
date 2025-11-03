import React from 'react';
import { GameState, Player } from '../types';
import { Action } from '../services/reducerTypes';
import { CONCERN_DEFINITIONS } from '../services/database';

interface PlayerInteractionModalProps {
    playerId: number;
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
    onClose: () => void;
}

const PlayerInteractionModal: React.FC<PlayerInteractionModalProps> = ({ playerId, gameState, dispatch, onClose }) => {
    const player = gameState.players[playerId];
    const concern = player?.concern;

    if (!player || !concern) {
        // Fallback in case modal is opened without a valid concern
        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                    <p>Erro: Nenhuma preocupação ativa encontrada para este jogador.</p>
                </div>
            </div>
        );
    }

    const concernDef = CONCERN_DEFINITIONS[concern.type];

    const handleResponse = (responseId: string) => {
        dispatch({ type: 'RESPOND_TO_CONCERN', payload: { playerId, responseId } });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">Conversa com {player.name}</h2>
                        <p className="text-gray-400">Respondendo à preocupação do jogador</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-bold">&times;</button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <div className="bg-gray-700/50 p-4 rounded-lg mb-6">
                        <h3 className="text-lg font-semibold text-yellow-300 mb-2">"{concernDef.title}"</h3>
                        <p className="text-gray-300">{concernDef.getPlayerStatement(player.name)}</p>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-green-400 mb-3">Sua Resposta:</h3>
                        <div className="space-y-3">
                            {concernDef.responses.map(response => (
                                <button
                                    key={response.id}
                                    onClick={() => handleResponse(response.id)}
                                    className="w-full text-left p-4 bg-gray-700 hover:bg-blue-600 rounded-lg transition-colors duration-200"
                                >
                                    <p className="font-semibold">{response.text}</p>
                                    <p className="text-xs text-gray-400 mt-1">{response.outcome}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerInteractionModal;
