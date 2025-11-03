
import React, { useState, useEffect } from 'react';
import { GameState, Player, DepartmentType, Staff, StaffDepartment, SponsorshipDeal, Loan, Bank } from '../types';
import { Action } from '../services/reducerTypes';

interface FinancesViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}

const getDepartmentMaintenanceCost = (level: number) => {
    return [0, 1000, 3000, 7500, 15000, 25000][level] || 0;
}

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
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
            <h3 className="text-xl font-semibold text-green-400 mb-4">Ajuste de Orçamento</h3>
            <p className="text-sm text-gray-400 mb-6">
                Ajuste a alocação entre seus orçamentos de transferência e salários. Mover fundos para o orçamento de salários permite salários mais altos, enquanto um orçamento de transferência maior permite contratações de maior valor.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-gray-400 text-sm">Orçamento de Transferência Atual</h4>
                    <p className="text-2xl font-bold text-white">{formatCurrency(club.transferBudget)}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-gray-400 text-sm">Orçamento de Salários Atual</h4>
                    <p className="text-2xl font-bold text-white">{formatCurrency(club.wageBudget)}/sem</p>
                    <p className={`text-xs ${availableWageBudget >= 0 ? 'text-gray-400' : 'text-red-400'}`}>Disponível: {formatCurrency(availableWageBudget)}/sem</p>
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
                    <span className="font-bold text-orange-400">Mais para Salários</span>
                    <span className="font-bold text-green-400">Mais para Transferências</span>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                <div className="bg-gray-800 p-4 rounded-lg border border-dashed border-gray-600">
                    <h4 className="text-gray-400 text-sm">Novo Orçamento de Transferência</h4>
                    <p className="text-2xl font-bold text-green-300">{formatCurrency(newTransferBudget)}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-dashed border-gray-600">
                    <h4 className="text-gray-400 text-sm">Novo Orçamento de Salários</h4>
                    <p className="text-2xl font-bold text-orange-300">{formatCurrency(newWageBudget)}/sem</p>
                    <p className="text-xs text-gray-400">Disponível: {formatCurrency(newAvailableWeeklyWage)}/sem</p>
                </div>
            </div>

            <button
                onClick={handleConfirm}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition-transform duration-200 hover:scale-105"
            >
                Confirmar Ajustes de Orçamento
            </button>
        </div>
    );
};

const Sponsorships: React.FC<{ gameState: GameState }> = ({ gameState }) => {
    const clubSponsorships = gameState.sponsorshipDeals.filter(d => d.clubId === gameState.playerClubId);

    if (clubSponsorships.length === 0) {
        return <p className="text-gray-400 text-center">Nenhum contrato de patrocínio ativo.</p>;
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
                                <span className="text-gray-300">Valor Anual:</span>
                                <span className="font-bold text-green-400">{formatCurrency(deal.annualValue)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-300">Expira em:</span>
                                <span className="font-semibold text-gray-300">{deal.expires.toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const Loans: React.FC<{ gameState: GameState; dispatch: React.Dispatch<Action> }> = ({ gameState, dispatch }) => {
    const club = gameState.clubs[gameState.playerClubId!];
    // FIX: Cast the result of Object.values to Bank[] to ensure proper type inference for `availableBanks`.
    const availableBanks = (Object.values(gameState.banks) as Bank[]).filter(b => club.reputation >= b.minReputation);
    const activeLoans = gameState.loans.filter(l => l.clubId === club.id);

    const [selectedBankId, setSelectedBankId] = useState<number | ''>('');
    const [amount, setAmount] = useState(100000);
    const [termMonths, setTermMonths] = useState(12);
    
    const selectedBank = selectedBankId ? gameState.banks[selectedBankId] : null;

    useEffect(() => {
        if (selectedBank) {
            setAmount(Math.min(amount, selectedBank.maxLoanAmount));
            setTermMonths(Math.max(selectedBank.termMonthsRange[0], Math.min(termMonths, selectedBank.termMonthsRange[1])));
        }
    }, [selectedBankId, selectedBank, amount, termMonths]);

    const calculateLoanDetails = () => {
        if (!selectedBank) return { interestRate: 0, monthlyPayment: 0 };
        
        const creditScoreModifier = (100 - club.creditScore) / 100; // 0 for perfect score, 1 for 0 score
        const rateRange = selectedBank.interestRateRange[1] - selectedBank.interestRateRange[0];
        const interestRate = selectedBank.interestRateRange[0] + (rateRange * creditScoreModifier);
        
        const monthlyRate = interestRate / 100 / 12;
        const monthlyPayment = monthlyRate > 0 
            ? (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths))
            : amount / termMonths;
            
        return { interestRate, monthlyPayment };
    };
    
    const { interestRate, monthlyPayment } = calculateLoanDetails();

    const handleRequestLoan = () => {
        if (!selectedBankId) return;
        dispatch({ type: 'REQUEST_LOAN', payload: { bankId: selectedBankId, amount, termMonths } });
        // Reset form
        setSelectedBankId('');
        setAmount(100000);
        setTermMonths(12);
    };

    const handleRepayLoan = (loanId: number) => {
        dispatch({ type: 'REPAY_LOAN', payload: { loanId } });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Request Loan Section */}
            <div className="bg-gray-900/50 p-6 rounded-lg space-y-4">
                <h3 className="text-xl font-semibold text-green-400">Solicitar Novo Empréstimo</h3>
                <div className="bg-gray-700 p-3 rounded-lg text-center">
                    <p className="text-sm text-gray-400">Pontuação de Crédito do Clube</p>
                    <p className="text-3xl font-bold">{club.creditScore}</p>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1">Selecionar Banco</label>
                    <select value={selectedBankId} onChange={e => setSelectedBankId(Number(e.target.value))} className="w-full bg-gray-700 p-2 rounded">
                        <option value="">-- Escolha um banco --</option>
                        {availableBanks.map(bank => (
                            <option key={bank.id} value={bank.id}>{bank.name} ({bank.tier})</option>
                        ))}
                    </select>
                </div>
                {selectedBank && (
                    <>
                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-1">Valor do Empréstimo ({formatCurrency(amount)})</label>
                            <input type="range" min="10000" max={selectedBank.maxLoanAmount} step="10000" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full" />
                            <div className="text-xs text-gray-400 flex justify-between">
                                <span>{formatCurrency(10000)}</span>
                                <span>{formatCurrency(selectedBank.maxLoanAmount)}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-1">Prazo ({termMonths} meses)</label>
                            <input type="range" min={selectedBank.termMonthsRange[0]} max={selectedBank.termMonthsRange[1]} step="1" value={termMonths} onChange={e => setTermMonths(Number(e.target.value))} className="w-full" />
                             <div className="text-xs text-gray-400 flex justify-between">
                                <span>{selectedBank.termMonthsRange[0]} meses</span>
                                <span>{selectedBank.termMonthsRange[1]} meses</span>
                            </div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg border border-dashed border-gray-600 space-y-2">
                             <div className="flex justify-between"><span>Taxa de Juros Estimada:</span> <span className="font-bold">{interestRate.toFixed(2)}%</span></div>
                             <div className="flex justify-between"><span>Pagamento Mensal Estimado:</span> <span className="font-bold">{formatCurrency(monthlyPayment)}</span></div>
                        </div>
                        <button onClick={handleRequestLoan} disabled={club.balance < 0} className="w-full bg-green-600 hover:bg-green-700 font-bold py-3 rounded disabled:bg-gray-600 disabled:cursor-not-allowed">
                           {club.balance < 0 ? "Não é possível solicitar empréstimo com saldo negativo" : "Confirmar Solicitação de Empréstimo"}
                        </button>
                    </>
                )}
            </div>
            {/* Active Loans Section */}
            <div className="bg-gray-900/50 p-6 rounded-lg space-y-4">
                 <h3 className="text-xl font-semibold text-green-400">Empréstimos Ativos</h3>
                 {activeLoans.length > 0 ? activeLoans.map(loan => (
                     <div key={loan.id} className="bg-gray-700 p-4 rounded-lg">
                        <p className="font-bold">{gameState.banks[loan.bankId].name}</p>
                        <div className="text-sm space-y-1 mt-2">
                             <div className="flex justify-between"><span>Saldo Devedor:</span> <span className="font-mono">{formatCurrency(loan.remainingBalance)}</span></div>
                             <div className="flex justify-between"><span>Pagamento Mensal:</span> <span className="font-mono">{formatCurrency(loan.monthlyRepayment)}</span></div>
                             <div className="flex justify-between"><span>Meses Restantes:</span> <span className="font-mono">{loan.monthsRemaining}</span></div>
                        </div>
                        <button onClick={() => handleRepayLoan(loan.id)} disabled={club.balance < loan.remainingBalance} className="mt-3 w-full text-xs bg-blue-600 hover:bg-blue-700 py-1 rounded disabled:bg-gray-600 disabled:cursor-not-allowed">
                           {club.balance < loan.remainingBalance ? 'Fundos Insuficientes' : `Pagar Valor Total (${formatCurrency(loan.remainingBalance)})`}
                        </button>
                     </div>
                 )) : <p className="text-gray-500 text-center pt-8">Nenhum empréstimo ativo.</p>}
            </div>
        </div>
    );
};


const FinancesView: React.FC<FinancesViewProps> = ({ gameState, dispatch }) => {
    const [activeTab, setActiveTab] = useState<'summary' | 'budgets' | 'sponsorship' | 'loans'>('summary');
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
                    <h3 className="text-gray-400 text-sm">Balanço Total</h3>
                    <p className={`text-3xl font-bold ${club.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(club.balance)}
                    </p>
                </div>
                 <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-gray-400 text-sm">Renda Mensal (est.)</h3>
                    <p className="text-3xl font-bold text-green-400">
                        {formatCurrency(totalMonthlyIncome)}
                    </p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-gray-400 text-sm">Resultado Mensal (est.)</h3>
                    <p className={`text-3xl font-bold ${netMonthly >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(netMonthly)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Income */}
                <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-400 mb-3">Detalhamento da Renda (Mensal)</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span>Patrocínio:</span>
                            <span className="font-bold text-green-300">{formatCurrency(monthlySponsorIncome)}</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span>Venda de Ingressos (est.):</span>
                            <span className="font-bold text-green-300">{formatCurrency(monthlyTicketSales)}</span>
                        </div>
                         <div className="flex justify-between items-center text-lg border-t border-gray-700 pt-2 mt-2">
                            <span>Renda Total (est.):</span>
                            <span className="font-bold text-green-400">{formatCurrency(totalMonthlyIncome)}</span>
                        </div>
                    </div>
                </div>

                 {/* Expenses */}
                <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-red-400 mb-3">Detalhamento das Despesas (Mensal)</h3>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span>Salários dos Jogadores (est.):</span>
                            <span className="font-bold text-orange-400">{formatCurrency(totalWeeklyPlayerWage * 4)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Salários da Equipe (est.):</span>
                            <span className="font-bold text-orange-400">{formatCurrency(totalWeeklyStaffWage * 4)}</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span>Manutenção Dept.:</span>
                            <span className="font-bold text-orange-400">{formatCurrency(totalMonthlyMaintenance)}</span>
                        </div>
                         <div className="flex justify-between items-center text-lg border-t border-gray-700 pt-2 mt-2">
                            <span>Despesas Totais (est.):</span>
                            <span className="font-bold text-red-400">{formatCurrency(totalMonthlyExpenses)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Finanças do Clube</h2>
            
            <div className="flex border-b border-gray-700 mb-6">
                <button onClick={() => setActiveTab('summary')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'summary' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Resumo
                </button>
                <button onClick={() => setActiveTab('budgets')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'budgets' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Orçamentos
                </button>
                <button onClick={() => setActiveTab('sponsorship')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'sponsorship' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Patrocínio
                </button>
                <button onClick={() => setActiveTab('loans')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'loans' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Empréstimos
                </button>
            </div>
            
            {activeTab === 'summary' && renderSummary()}
            {activeTab === 'budgets' && <BudgetAdjustment gameState={gameState} dispatch={dispatch} />}
            {activeTab === 'sponsorship' && <Sponsorships gameState={gameState} />}
            {activeTab === 'loans' && <Loans gameState={gameState} dispatch={dispatch} />}
        </div>
    );
};

export default FinancesView;