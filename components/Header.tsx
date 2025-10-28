
import React from 'react';
import { GameState } from '../types';

interface HeaderProps {
    gameState: GameState;
    onAdvanceDay: () => void;
}

const Header: React.FC<HeaderProps> = ({ gameState, onAdvanceDay }) => {
    const playerClub = gameState.playerClubId ? gameState.clubs[gameState.playerClubId] : null;

    return (
        <header className="bg-gray-800 shadow-md p-4 flex justify-between items-center z-10">
            <div>
                <h1 className="text-xl font-bold text-white">{playerClub?.name || 'Manager'}</h1>
                <p className="text-sm text-gray-400">{gameState.currentDate.toDateString()}</p>
            </div>
            <button
                onClick={onAdvanceDay}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
            >
                Continue
            </button>
        </header>
    );
};

export default Header;
