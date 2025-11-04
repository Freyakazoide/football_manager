import React from 'react';
import { GameState, Match } from '../types';

interface MatchResultsModalProps {
    results: { playerResult: Match; aiResults: Match[] };
    gameState: GameState;
    onClose: () => void;
}

const MatchResultsModal: React.FC<MatchResultsModalProps> = ({ results, gameState, onClose }) => {
    const { playerResult, aiResults } = results;
    const homeTeam = gameState.clubs[playerResult.homeTeamId];
    const awayTeam = gameState.clubs[playerResult.awayTeamId];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 text-center border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-green-400 mb-2">Resultados Finais</h2>
                    <p className="text-gray-400">{playerResult.date.toLocaleDateString('pt-BR')}</p>
                </div>

                {/* Player Match Result */}
                <div className="p-6 bg-gray-900/50">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xl font-bold w-1/3 text-right">{homeTeam.name}</span>
                        <span className="text-4xl font-mono mx-4">{playerResult.homeScore} - {playerResult.awayScore}</span>
                        <span className="text-xl font-bold w-1/3 text-left">{awayTeam.name}</span>
                    </div>
                     <div className="text-sm text-gray-400 mt-4 pt-4 border-t border-gray-700 grid grid-cols-3 gap-2 text-center">
                        <div>
                            <div className="font-bold">{Math.round(playerResult.homeStats?.possession || 0)}% - {Math.round(playerResult.awayStats?.possession || 0)}%</div>
                            <div className="text-xs text-gray-500">Posse</div>
                        </div>
                         <div>
                            <div className="font-bold">{playerResult.homeStats?.shots} - {playerResult.awayStats?.shots}</div>
                            <div className="text-xs text-gray-500">Finalizações</div>
                        </div>
                         <div>
                            <div className="font-bold">{playerResult.homeStats?.xG?.toFixed(2)} - {playerResult.awayStats?.xG?.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">xG</div>
                        </div>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <h3 className="text-lg font-semibold text-gray-300 mb-3 text-center">Resumo da Rodada</h3>
                    <div className="space-y-2">
                        {aiResults.length > 0 ? aiResults.map(aiMatch => (
                            <div key={aiMatch.id} className="bg-gray-700 rounded p-3 text-sm flex justify-between items-center">
                                <span className="w-2/5 text-right">{gameState.clubs[aiMatch.homeTeamId].name}</span>
                                <span className="font-bold font-mono mx-2">{aiMatch.homeScore} - {aiMatch.awayScore}</span>
                                <span className="w-2/5 text-left">{gameState.clubs[aiMatch.awayTeamId].name}</span>
                            </div>
                        )) : (
                            <p className="text-gray-500 text-center text-sm">Nenhuma outra partida foi jogada hoje.</p>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-700">
                    <button
                        onClick={onClose}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition duration-300"
                    >
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchResultsModal;