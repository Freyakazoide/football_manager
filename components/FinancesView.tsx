

import React from 'react';
import { GameState, Player, DepartmentType, Staff, StaffDepartment } from '../types';

interface FinancesViewProps {
    gameState: GameState;
}

const getDepartmentMaintenanceCost = (level: number) => {
    return [0, 1000, 3000, 7500, 15000, 25000][level] || 0;
}

const FinancesView: React.FC<FinancesViewProps> = ({ gameState }) => {
    if (!gameState.playerClubId) return null;

    const club = gameState.clubs[gameState.playerClubId];
    const clubPlayers = (Object.values(gameState.players) as Player[]).filter(p => p.clubId === club.id);

    // --- EXPENSES ---
    const totalWeeklyPlayerWage = clubPlayers.reduce((sum, p) => sum + p.wage, 0);
    const departments = (Object.values(club.departments) as StaffDepartment[]);
    const staffChiefs = departments
        .map(d => d.chiefId)
        .filter((id): id is number => id !== null)
        .map(id => gameState.staff[id]);
    const totalWeeklyStaffWage = staffChiefs.reduce((sum, s) => sum + s.wage, 0);
    const totalMonthlyMaintenance = departments
        .reduce((sum, d) => sum + getDepartmentMaintenanceCost(d.level), 0);

    // --- INCOME (Replicated logic for display) ---
    const sponsorMoney = club.reputation * 10000;
    const avgPlayerMorale = clubPlayers.length > 0
        ? clubPlayers.reduce((sum, p) => sum + p.morale, 0) / clubPlayers.length
        : 50;
    const ticketSalesPerMatch = (club.reputation * 200) + (avgPlayerMorale * 100);
    const ticketSales = ticketSalesPerMatch * 2; // Assume 2 home games/month
    const totalMonthlyIncome = sponsorMoney + ticketSales;

    const formatCurrency = (value: number) => {
        return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
    };

    const totalMonthlyExpenses = (totalWeeklyPlayerWage + totalWeeklyStaffWage) * 4 + totalMonthlyMaintenance;
    const netMonthly = totalMonthlyIncome - totalMonthlyExpenses;


    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Club Finances</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                 <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-gray-400 text-sm">Total Balance</h3>
                    <p className={`text-3xl font-bold ${club.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(club.balance)}
                    </p>
                </div>
                 <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-gray-400 text-sm">Monthly Income (est.)</h3>
                    <p className="text-3xl font-bold text-green-400">
                        {formatCurrency(totalMonthlyIncome)}
                    </p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-gray-400 text-sm">Net Monthly (est.)</h3>
                    <p className={`text-3xl font-bold ${netMonthly >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(netMonthly)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Income */}
                <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-400 mb-3">Income Breakdown (Monthly)</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span>Sponsorship:</span>
                            <span className="font-bold text-green-300">{formatCurrency(sponsorMoney)}</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span>Ticket Sales (est.):</span>
                            <span className="font-bold text-green-300">{formatCurrency(ticketSales)}</span>
                        </div>
                         <div className="flex justify-between items-center text-lg border-t border-gray-700 pt-2 mt-2">
                            <span>Total Income (est.):</span>
                            <span className="font-bold text-green-400">{formatCurrency(totalMonthlyIncome)}</span>
                        </div>
                    </div>
                </div>

                 {/* Expenses */}
                <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-red-400 mb-3">Expenditure Breakdown (Monthly)</h3>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span>Player Wages (est.):</span>
                            <span className="font-bold text-orange-400">{formatCurrency(totalWeeklyPlayerWage * 4)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Staff Wages (est.):</span>
                            <span className="font-bold text-orange-400">{formatCurrency(totalWeeklyStaffWage * 4)}</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span>Dept. Maintenance:</span>
                            <span className="font-bold text-orange-400">{formatCurrency(totalMonthlyMaintenance)}</span>
                        </div>
                         <div className="flex justify-between items-center text-lg border-t border-gray-700 pt-2 mt-2">
                            <span>Total Expenses (est.):</span>
                            <span className="font-bold text-red-400">{formatCurrency(totalMonthlyExpenses)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancesView;