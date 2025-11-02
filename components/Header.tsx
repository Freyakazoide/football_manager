import React from 'react';
import { GameState } from '../types';

interface HeaderProps {
    gameState: GameState;
    onAdvanceDay: () => void;
    onGoBack: () => void;
    onGoForward: () => void;
    canGoBack: boolean;
    canGoForward: boolean;
}

const NavButton: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode }> = ({ onClick, disabled, children }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold p-2 rounded-full transition-colors duration-200 w-8 h-8 flex items-center justify-center"
    >
        {children}
    </button>
);

const Header: React.FC<HeaderProps> = ({ gameState, onAdvanceDay, onGoBack, onGoForward, canGoBack, canGoForward }) => {
    const playerClub = gameState.playerClubId ? gameState.clubs[gameState.playerClubId] : null;

    return (
        <header className="bg-gray-800 shadow-md p-4 flex justify-between items-center z-10">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <NavButton onClick={onGoBack} disabled={!canGoBack}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                        </svg>
                    </NavButton>
                    <NavButton onClick={onGoForward} disabled={!canGoForward}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                    </NavButton>
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">{playerClub?.name || 'Manager'}</h1>
                    <p className="text-sm text-gray-400">{gameState.currentDate.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>
            <button
                onClick={onAdvanceDay}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
            >
                Continuar
            </button>
        </header>
    );
};

export default Header;