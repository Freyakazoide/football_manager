import React from 'react';
import { GameState, MatchDayInfo, Match } from '../types';
import { Action } from '../services/reducerTypes';

interface MatchDayModalProps {
    fixtures: { playerMatch: MatchDayInfo; aiMatches: Match[] };
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
    onClose: () => void;
}

const MatchDayModal: React.FC<MatchDayModalProps> = ({ fixtures, gameState, dispatch, onClose }) => {
    const { playerMatch, aiMatches } = fixtures;
    const { match, homeTeam, awayTeam } = playerMatch;
    
    const handleStartMatch = () => {
        dispatch({ type: 'START_MATCH', payload: playerMatch });
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="p-6 text-center border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-green-400 mb-2">Match Day!</h2>
                    <p className="text-gray-400 mb-4">{match.date.toDateString()}</p>
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
                        <p className="font-bold">Cannot Start Match</p>
                        <p>{gameState.matchStartError}</p>
                        <button onClick={() => dispatch({type: 'CLEAR_MATCH_START_ERROR'})} className="mt-2 text-xs text-gray-300 underline">Dismiss</button>
                    </div>
                )}
                
                <div className="p-6 overflow-y-auto flex-1">
                    <h3 className="text-lg font-semibold text-gray-300 mb-3 text-center">Today's Other Fixtures</h3>
                    <div className="space-y-2">
                        {aiMatches.length > 0 ? aiMatches.map(aiMatch => (
                            <div key={aiMatch.id} className="bg-gray-700/50 rounded p-2 text-sm text-center">
                                {gameState.clubs[aiMatch.homeTeamId].name} vs {gameState.clubs[aiMatch.awayTeamId].name}
                            </div>
                        )) : (
                            <p className="text-gray-500 text-center text-sm">No other matches scheduled today.</p>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-700">
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