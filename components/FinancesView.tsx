import React, { useState } from 'react';
import { GameState, Player, DepartmentType, Staff, StaffDepartment, SponsorshipDeal } from '../types';
import { Action } from '../services/reducerTypes';

interface FinancesViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}

const getDepartmentMaintenanceCost = (level: number) => {
    return [0, 1000, 3000, 7500, 15000, 25000][level] || 0;
}

const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
};

const BudgetAdjustment: React.FC<{ gameState: GameState; dispatch: React.Dispatch<Action> }> = ({ gameState, dispatch }) => {
    const club = gameState.clubs[gameState.playerClubId!];
    const clubPlayers = (Object.values(gameState.players) as Player[]).filter(p => p.clubId === club.id);
    const departments = (Object.values(club.departments) as StaffDepartment[]);
    const staffChiefs = departments
        .map(d => d.chiefId)
        .filter((id): id is number => id !== null)
        .map(id => gameState.staff[id]);

    const totalWeeklyPlayerWage = clubPlayers.reduce((sum, p) => sum + p.wage, 0);
    const totalWeeklyStaffWage = staffChiefs.reduce((sum, s) => sum + s.wage, 0);
    const totalWeeklyWage = totalWeeklyPlayerWage + totalWeeklyStaffWage;

    const availableWageBudget = club.wageBudget - totalWeeklyWage;
    const totalAdjustablePool = club.transferBudget + (availableWageBudget > 0 ? availableWageBudget * 52 : 0);
    const initialTransferPct = totalAdjustablePool > 0 ? (club.transferBudget / totalAdjustablePool) * 100 : 0;
    
    const [sliderValue, setSliderValue] = useState(initialTransferPct);

    const newTransferBudget = (sliderValue / 100) * totalAdjustablePool;
    const newAvailableWagePool = totalAdjustablePool - newTransferBudget;
    const newAvailableWeeklyWage = newAvailableWagePool > 0 ? newAvailableWagePool / 52 : 0;
    const newWageBudget = totalWeeklyWage + newAvailableWeeklyWage;
    
    const handleConfirm = () => {
        dispatch({
            type: 'ADJUST_BUDGETS',
            payload: {
                transferBudget: Math.round(newTransferBudget),
                wageBudget: Math.round(newWageBudget)
            }
        });
    };

    return (
        <div className="bg-gray-900/50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-green-400 mb-4">Budget Adjustment</h3>
            <p className="text-sm text-gray-400 mb-6">
                Adjust the allocation between your transfer and wage budgets. Moving funds to the wage budget allows for higher salaries, while a larger transfer budget allows for bigger signings.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-gray-400 text-sm">Current Transfer Budget</h4>
                    <p className="text-2xl font-bold text-white">{formatCurrency(club.transferBudget)}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-gray-400 text-sm">Current Wage Budget</h4>
                    <p className="text-2xl font-bold text-white">{formatCurrency(club.wageBudget)}/wk</p>
                    <p className={`text-xs ${availableWageBudget >= 0 ? 'text-gray-400' : 'text-red-400'}`}>Available: {formatCurrency(availableWageBudget)}/wk</p>
                </div>
            </div>

            <div className="mb-6">
                 <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderValue}
                    onChange={(e) => setSliderValue(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(to right, #f59e0b ${100-sliderValue}%, #10b981 ${100-sliderValue}%)`}}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span className="font-bold text-orange-400">More for Wages</span>
                    <span className="font-bold text-green-400">More for Transfers</span>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                <div className="bg-gray-800 p-4 rounded-lg border border-dashed border-gray-600">
                    <h4 className="text-gray-400 text-sm">New Transfer Budget</h4>
                    <p className="text-2xl font-bold text-green-300">{formatCurrency(newTransferBudget)}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-dashed border-gray-600">
                    <h4 className="text-gray-400 text-sm">New Wage Budget</h4>
                    <p className="text-2xl font-bold text-orange-300">{formatCurrency(newWageBudget)}/wk</p>
                    <p className="text-xs text-gray-400">Available: {formatCurrency(newAvailableWeeklyWage)}/wk</p>
                </div>
            </div>

            <button
                onClick={handleConfirm}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition-transform duration-200 hover:scale-105"
            >
                Confirm Budget Adjustments
            </button>
        </div>
    );
};

const Sponsorships: React.FC<{ gameState: GameState }> = ({ gameState }) => {
    const clubSponsorships = gameState.sponsorshipDeals.filter(d => d.clubId === gameState.playerClubId);

    if (clubSponsorships.length === 0) {
        return <p className="text-gray-400 text-center">No active sponsorship deals.</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {clubSponsorships.map(deal => {
                const sponsor = gameState.sponsors[deal.sponsorId];
                return (
                    <div key={`${deal.sponsorId}-${deal.type}`} className="bg-gray-900/50 p-6 rounded-lg border-l-4 border-green-500">
                        <h3 className="text-xl font-semibold text-white">{sponsor.name}</h3>
                        <p className="text-sm text-gray-400 mb-4">{deal.type}</p>
                        
                        <div className="space-y-2 text-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-300">Annual Value:</span>
                                <span className="font-bold text-green-400">{formatCurrency(deal.annualValue)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-300">Expires:</span>
                                <span className="font-semibold text-gray-300">{deal.expires.toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const FinancesView: React.FC<FinancesViewProps> = ({ gameState, dispatch }) => {
    const [activeTab, setActiveTab] = useState<'summary' | 'budgets' | 'sponsorship'>('summary');
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

    // --- INCOME ---
    const clubSponsorships = gameState.sponsorshipDeals.filter(d => d.clubId === club.id);
    const monthlySponsorIncome = clubSponsorships.reduce((sum, deal) => sum + (deal.annualValue / 12), 0);
    
    const avgPlayerMorale = clubPlayers.length > 0
        ? clubPlayers.reduce((sum, p) => sum + p.morale, 0) / clubPlayers.length
        : 50;
    const ticketSalesPerMatch = (club.reputation * 200) + (avgPlayerMorale * 100);
    const monthlyTicketSales = ticketSalesPerMatch * 2; // Assume 2 home games/month
    const totalMonthlyIncome = monthlySponsorIncome + monthlyTicketSales;

    const totalMonthlyExpenses = (totalWeeklyPlayerWage + totalWeeklyStaffWage) * 4 + totalMonthlyMaintenance;
    const netMonthly = totalMonthlyIncome - totalMonthlyExpenses;

    const renderSummary = () => (
        <>
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
                            <span className="font-bold text-green-300">{formatCurrency(monthlySponsorIncome)}</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span>Ticket Sales (est.):</span>
                            <span className="font-bold text-green-300">{formatCurrency(monthlyTicketSales)}</span>
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
        </>
    );

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Club Finances</h2>
            
            <div className="flex border-b border-gray-700 mb-6">
                <button onClick={() => setActiveTab('summary')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'summary' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Summary
                </button>
                <button onClick={() => setActiveTab('budgets')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'budgets' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Budgets
                </button>
                <button onClick={() => setActiveTab('sponsorship')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'sponsorship' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Sponsorship
                </button>
            </div>
            
            {activeTab === 'summary' && renderSummary()}
            {activeTab === 'budgets' && <BudgetAdjustment gameState={gameState} dispatch={dispatch} />}
            {activeTab === 'sponsorship' && <Sponsorships gameState={gameState} />}
        </div>
    );
};

export default FinancesView;