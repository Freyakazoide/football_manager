import React, { useState } from 'react';
import { GameState } from '../types';
import BoardRequestModal from './BoardRequestModal';
import { Action } from '../services/reducerTypes';

interface BoardViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}

const ConfidenceBar: React.FC<{ confidence: number }> = ({ confidence }) => {
    const getBarColor = (val: number) => {
        if (val > 75) return 'bg-green-500';
        if (val > 40) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getBoardMood = (val: number) => {
        if (val > 85) return "Extasiada";
        if (val > 70) return "Satisfeita";
        if (val > 50) return "Contente";
        if (val > 30) return "Preocupada";
        if (val > 10) return "Insatisfeita";
        return "Furiosa";
    };

    return (
        <div>
            <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-semibold text-gray-300">Humor da Diretoria: {getBoardMood(confidence)}</span>
                <span className="text-lg font-bold text-gray-200">{confidence} / 100</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-5">
                <div 
                    className={`${getBarColor(confidence)} h-5 rounded-full transition-all duration-500`}
                    style={{width: `${confidence}%`}}
                ></div>
            </div>
        </div>
    );
};

const BoardView: React.FC<BoardViewProps> = ({ gameState, dispatch }) => {
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

    if (!gameState.playerClubId) return null;

    const club = gameState.clubs[gameState.playerClubId];

    return (
        <>
        {isRequestModalOpen && <BoardRequestModal gameState={gameState} dispatch={dispatch} onClose={() => setIsRequestModalOpen(false)} />}
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Sala da Diretoria</h2>
                    <p className="text-gray-400">Uma visão geral do seu relacionamento com a diretoria e os objetivos atuais.</p>
                </div>
                <button
                    onClick={() => setIsRequestModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-transform duration-200 hover:scale-105"
                >
                    Fazer Pedido à Direção
                </button>
            </div>
            
            <div className="bg-gray-900/50 p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold text-green-400 mb-4">Confiança no Treinador</h3>
                <ConfidenceBar confidence={club.managerConfidence} />
            </div>

            <div className="bg-gray-900/50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-green-400 mb-4">Objetivos da Temporada</h3>
                {club.boardObjective ? (
                    <div>
                        <p className="text-lg text-white">
                            <span className="font-bold">Liga:</span> {club.boardObjective.description}
                        </p>
                        <p className="text-sm text-gray-400">A diretoria espera que você alcance isso até o final da temporada.</p>
                    </div>
                ) : (
                    <p className="text-gray-500">A diretoria definirá novos objetivos no início da próxima temporada.</p>
                )}
            </div>
            
            <div className="bg-gray-900/50 p-6 rounded-lg mt-6">
                <h3 className="text-xl font-semibold text-green-400 mb-4">Filosofias do Clube</h3>
                <p className="text-sm text-gray-400 mb-4">
                    Estes são os princípios orientadores de longo prazo que a diretoria quer que você siga. Aderir a essas filosofias é crucial para manter a confiança deles.
                </p>
                {club.philosophies.length > 0 ? (
                    <ul className="space-y-3">
                        {club.philosophies.map((philosophy, index) => (
                            <li key={index} className="flex items-start p-3 bg-gray-700/50 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400 mr-3 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="font-semibold text-white">{philosophy.description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">A diretoria não definiu nenhuma filosofia específica para o clube neste momento.</p>
                )}
            </div>
        </div>
        </>
    );
};

export default BoardView;