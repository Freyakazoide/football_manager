import React from 'react';
import { GameState, MatchDayInfo, Match, LineupPlayer } from '../types';
import { Action } from '../services/reducerTypes';

interface MatchDayModalProps {
    fixtures: { playerMatch: MatchDayInfo; aiMatches: Match[] };
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
    onGoToTactics: () => void;
}

const MatchDayModal: React.FC<MatchDayModalProps> = ({ fixtures, gameState, dispatch, onGoToTactics }) => {
    const { playerMatch, aiMatches } = fixtures;
    const { match, homeTeam, awayTeam } = playerMatch;
    
    const playerClub = gameState.playerClubId ? gameState.clubs[gameState.playerClubId] : null;
    if (!playerClub) return null;
    
    const handleStartMatch = () => {
        dispatch({ type: 'START_MATCH', payload: playerMatch });
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 text-center border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-green-400 mb-2">Dia de Jogo!</h2>
                    <p className="text-gray-400 mb-4">{match.date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-around text-lg font-semibold">
                            <span>{homeTeam.name}</span>
                            <span className="text-gray-500">vs</span>
                            <span>{awayTeam.name}</span>
                        </div>
                    </div>
                </div>

                {gameState.matchStartError && (
                    <div className="p-4 bg-red-900/50 text-red-300 text-center text-sm">
                        <p className="font-bold">Não é Possível Iniciar a Partida</p>
                        <p>{gameState.matchStartError}</p>
                        <button onClick={() => dispatch({type: 'CLEAR_MATCH_START_ERROR'})} className="mt-2 text-xs text-gray-300 underline">Dispensar</button>
                    </div>
                )}
                
                <div className="p-6 overflow-y-auto flex-1">
                    <h3 className="text-lg font-semibold text-gray-300 mb-3 text-center">Sua Escalação Inicial</h3>
                    <div className="bg-gray-900/50 rounded-lg p-4">
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                            {playerClub.tactics.lineup.map((lp, index) => {
                                if (!lp) return <li key={`empty-${index}`} className="text-gray-600">- Posição Vazia -</li>;
                                const player = gameState.players[lp.playerId];
                                const isInvalid = player.injury || player.suspension;
                                return (
                                    <li key={player.id} className={`flex items-center justify-between text-sm p-1 rounded ${isInvalid ? 'bg-red-900/50 text-red-300' : ''}`}>
                                        <span className="font-semibold">{player.name}</span>
                                        <span className="text-gray-400 text-xs">{lp.role}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <button
                        onClick={onGoToTactics}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded transition duration-300"
                    >
                        Mudar Táticas
                    </button>
                     <button
                        onClick={handleStartMatch}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition duration-300"
                    >
                        Confirmar e Iniciar Partida
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchDayModal;