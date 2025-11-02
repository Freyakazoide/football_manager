import React from 'react';
import { GameState } from '../types';

interface BoardViewProps {
    gameState: GameState;
}

const ConfidenceBar: React.FC<{ confidence: number }> = ({ confidence }) => {
    const getBarColor = (val: number) => {
        if (val > 75) return 'bg-green-500';
        if (val > 40) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getBoardMood = (val: number) => {
        if (val > 85) return "Ecstatic";
        if (val > 70) return "Pleased";
        if (val > 50) return "Content";
        if (val > 30) return "Concerned";
        if (val > 10) return "Unhappy";
        return "Outraged";
    };

    return (
        <div>
            <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-semibold text-gray-300">Board Mood: {getBoardMood(confidence)}</span>
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

const BoardView: React.FC<BoardViewProps> = ({ gameState }) => {
    if (!gameState.playerClubId) return null;

    const club = gameState.clubs[gameState.playerClubId];

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-2">Board Room</h2>
            <p className="text-gray-400 mb-6">An overview of your relationship with the board and current objectives.</p>
            
            <div className="bg-gray-900/50 p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold text-green-400 mb-4">Manager Confidence</h3>
                <ConfidenceBar confidence={club.managerConfidence} />
            </div>

            <div className="bg-gray-900/50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-green-400 mb-4">Season Objectives</h3>
                {club.boardObjective ? (
                    <div>
                        <p className="text-lg text-white">
                            <span className="font-bold">League:</span> {club.boardObjective.description}
                        </p>
                        <p className="text-sm text-gray-400">The board expects you to achieve this by the end of the season.</p>
                    </div>
                ) : (
                    <p className="text-gray-500">The board will set new objectives at the start of the next season.</p>
                )}
            </div>
            
            <div className="bg-gray-900/50 p-6 rounded-lg mt-6">
                <h3 className="text-xl font-semibold text-green-400 mb-4">Club Philosophies</h3>
                <p className="text-sm text-gray-400 mb-4">
                    These are the long-term guiding principles the board wants you to follow. Adhering to these philosophies is crucial for maintaining their confidence.
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
                    <p className="text-gray-500">The board has not set any specific club philosophies at this time.</p>
                )}
            </div>
        </div>
    );
};

export default BoardView;