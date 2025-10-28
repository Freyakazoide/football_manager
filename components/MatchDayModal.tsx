import React from 'react';
import { GameState, MatchDayInfo } from '../types';
import { Action } from '../services/reducerTypes';

interface MatchDayModalProps {
    matchInfo: MatchDayInfo;
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
    onClose: () => void;
}

const MatchDayModal: React.FC<MatchDayModalProps> = ({ matchInfo, gameState, dispatch, onClose }) => {
    const { match, homeTeam, awayTeam } = matchInfo;
    
    const handleStartMatch = () => {
        dispatch({ type: 'START_MATCH', payload: matchInfo });
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6 text-center">
                    <h2 className="text-2xl font-bold text-green-400 mb-2">Match Day!</h2>
                    <p className="text-gray-400 mb-6">{match.date.toDateString()}</p>
                    <div className="flex items-center justify-around text-lg font-semibold mb-6">
                        <span>{homeTeam.name}</span>
                        <span className="text-gray-500">vs</span>
                        <span>{awayTeam.name}</span>
                    </div>
                    <button
                        onClick={handleStartMatch}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition duration-300"
                    >
                        Go to Match
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchDayModal;
