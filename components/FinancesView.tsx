


import React from 'react';
import { GameState, Player } from '../types';

interface FinancesViewProps {
    gameState: GameState;
}

const FinancesView: React.FC<FinancesViewProps> = ({ gameState }) => {
    if (!gameState.playerClubId) return null;

    const club = gameState.clubs[gameState.playerClubId];
    // FIX: Cast the result of Object.values to Player[] to ensure correct type inference.
    // TypeScript was incorrectly inferring it as `unknown[]`, causing downstream errors.
    const clubPlayers = (Object.values(gameState.players) as Player[]).filter(p => p.clubId === club.id);
    const totalWeeklyWage = clubPlayers.reduce((sum, p) => sum + p.wage, 0);

    const formatCurrency = (value: number) => {
        return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Finances</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-gray-400 text-sm">Total Balance</h3>
                    <p className={`text-3xl font-bold ${club.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(club.balance)}
                    </p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-gray-400 text-sm">Weekly Wage Bill</h3>
                    <p className="text-3xl font-bold text-orange-400">
                        {formatCurrency(totalWeeklyWage)}
                    </p>
                </div>
                 <div className="bg-gray-700 p-4 rounded-lg md:col-span-2">
                    <h3 className="text-gray-400 text-sm">Monthly Wage Bill (approx.)</h3>
                    <p className="text-3xl font-bold text-red-400">
                        {formatCurrency(totalWeeklyWage * 4)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FinancesView;