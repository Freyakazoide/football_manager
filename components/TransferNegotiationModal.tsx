import React, { useState, useEffect } from 'react';
import { GameState, TransferNegotiation, TransferOffer, ContractOffer, Player, Club, LoanOffer } from '../types';
import { Action } from '../services/reducerTypes';

interface TransferNegotiationModalProps {
    negotiation: TransferNegotiation;
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
    onClose: () => void;
}

const formatCurrency = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

const isLoanOffer = (offer: TransferOffer | LoanOffer): offer is LoanOffer => {
    return 'loanFee' in offer;
}

// Painel para quando o JOGADOR está COMPRANDO um jogador
const BuyingClubNegotiation: React.FC<{
    negotiation: TransferNegotiation;
    player: Player;
    dispatch: React.Dispatch<Action>;
    balance: number;
}> = ({ negotiation, player, dispatch, balance }) => {
    const [fee, setFee] = useState(player.marketValue);
    const [sellOn, setSellOn] = useState(0);

    const handleSubmitOffer = () => {
        dispatch({ type: 'SUBMIT_CLUB_OFFER', payload: { negotiationId: negotiation.id, offer: { fee, sellOnPercentage: sellOn > 0 ? sellOn : undefined } } });
    };

    const handleAcceptCounter = () => {
        dispatch({ type: 'ACCEPT_CLUB_COUNTER', payload: { negotiationId: negotiation.id } });
    };

    // FIX: Replaced findLast with slice().reverse().find() for broader compatibility.
    const lastAiOffer = negotiation.lastOfferBy === 'ai' ? negotiation.clubOfferHistory.slice().reverse().find(o => o.by === 'ai')?.offer as TransferOffer | undefined : null;

    return (
        <div>
            {lastAiOffer && (
                <div className="bg-yellow-900/50 p-4 rounded-lg mb-4 border border-yellow-600">
                    <h4 className="font-bold text-yellow-300">Counter Offer Received!</h4>
                    <p>Fee: <span className="font-mono">{formatCurrency(lastAiOffer.fee)}</span></p>
                    {lastAiOffer.sellOnPercentage && <p>Sell-on Clause: <span className="font-mono">{lastAiOffer.sellOnPercentage}%</span></p>}
                    <button onClick={handleAcceptCounter} className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded">
                        Accept Offer
                    </button>
                </div>
            )}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1">Transfer Fee</label>
                    <input type="number" value={fee} onChange={e => setFee(Number(e.target.value))} className="w-full bg-gray-900 p-2 rounded" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1">Sell-on Clause (%)</label>
                    <input type="number" value={sellOn} onChange={e => setSellOn(Number(e.target.value))} className="w-full bg-gray-900 p-2 rounded" />
                </div>
            </div>
            <button onClick={handleSubmitOffer} disabled={balance < fee} className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded disabled:bg-gray-600 disabled:cursor-not-allowed">
                Submit Offer
            </button>
        </div>
    );
};

const BuyingLoanNegotiation: React.FC<{
    negotiation: TransferNegotiation;
    player: Player;
    dispatch: React.Dispatch<Action>;
    balance: number;
}> = ({ negotiation, player, dispatch, balance }) => {
    // FIX: Replaced findLast with slice().reverse().find() for broader compatibility.
    const lastAiOffer = negotiation.lastOfferBy === 'ai' 
        ? negotiation.clubOfferHistory.slice().reverse().find(o => o.by === 'ai')?.offer as LoanOffer | undefined 
        : undefined;

    const [loanFee, setLoanFee] = useState(lastAiOffer?.loanFee ?? Math.round(player.marketValue * 0.1));
    const [wageContribution, setWageContribution] = useState(lastAiOffer?.wageContribution ?? 50);
    const [futureBuyOption, setFutureBuyOption] = useState(lastAiOffer?.futureBuyOption ?? 0);

    const handleSubmitOffer = () => {
        const offer: LoanOffer = {
            loanFee,
            wageContribution,
            futureBuyOption: futureBuyOption > 0 ? futureBuyOption : undefined,
        };
        dispatch({ type: 'SUBMIT_CLUB_OFFER', payload: { negotiationId: negotiation.id, offer } });
    };

    const handleAcceptCounter = () => {
        dispatch({ type: 'ACCEPT_CLUB_COUNTER', payload: { negotiationId: negotiation.id } });
    };

    return (
        <div>
            {lastAiOffer && isLoanOffer(lastAiOffer) && (
                <div className="bg-yellow-900/50 p-4 rounded-lg mb-4 border border-yellow-600">
                    <h4 className="font-bold text-yellow-300">Counter Offer Received!</h4>
                    <p>Loan Fee: <span className="font-mono">{formatCurrency(lastAiOffer.loanFee)}</span></p>
                    <p>Wage Contribution: <span className="font-mono">{lastAiOffer.wageContribution}%</span></p>
                    {lastAiOffer.futureBuyOption && <p>Future Buy Option: <span className="font-mono">{formatCurrency(lastAiOffer.futureBuyOption)}</span></p>}
                    <button onClick={handleAcceptCounter} className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded">
                        Accept Offer
                    </button>
                </div>
            )}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1">Taxa de Empréstimo (Adiantado)</label>
                    <input type="number" step="10000" value={loanFee} onChange={e => setLoanFee(Number(e.target.value))} className="w-full bg-gray-900 p-2 rounded" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1">Contribuição Salarial ({wageContribution}%)</label>
                    <input type="range" min="0" max="100" step="5" value={wageContribution} onChange={e => setWageContribution(Number(e.target.value))} className="w-full" />
                </div>
                 <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1">Opção de Compra Futura (Opcional)</label>
                    <input type="number" step="100000" value={futureBuyOption} onChange={e => setFutureBuyOption(Number(e.target.value))} className="w-full bg-gray-900 p-2 rounded" />
                </div>
            </div>
            <button onClick={handleSubmitOffer} disabled={balance < loanFee} className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded disabled:bg-gray-600 disabled:cursor-not-allowed">
                Enviar Oferta de Empréstimo
            </button>
        </div>
    );
};


// Painel completamente redesenhado para quando o JOGADOR está VENDENDO
const SellingClubNegotiation: React.FC<{
    negotiation: TransferNegotiation;
    player: Player;
    buyingClub: Club;
    dispatch: React.Dispatch<Action>;
    onCancel: () => void;
    onClose: () => void;
}> = ({ negotiation, player, buyingClub, dispatch, onCancel, onClose }) => {
    // Encontra a última oferta da IA
    const latestAiOffer = negotiation.clubOfferHistory.filter(o => o.by === 'ai').slice(-1)[0]?.offer as TransferOffer | undefined;
    
    // Define uma contra-proposta inicial sensata (15% acima da oferta ou 20% acima do valor de mercado)
    const initialCounter = latestAiOffer ? latestAiOffer.fee * 1.15 : player.marketValue * 1.2;
    const [counterFee, setCounterFee] = useState(Math.round(initialCounter / 1000) * 1000);

    if (!latestAiOffer) {
        return <p className="text-gray-400">Aguardando detalhes da oferta inicial...</p>;
    }
    
    const handleAccept = () => {
        dispatch({ type: 'ACCEPT_INCOMING_CLUB_OFFER', payload: { negotiationId: negotiation.id } });
        onClose();
    };

    const handleCounter = () => {
        if (counterFee <= latestAiOffer.fee) {
            alert("Your counter offer must be higher than the current offer.");
            return;
        }
        dispatch({ type: 'SUBMIT_COUNTER_OFFER', payload: { negotiationId: negotiation.id, offer: { fee: counterFee } } });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Painel Esquerdo: Informações do Jogador e da Oferta */}
            <div className="space-y-4">
                {/* Informações do Jogador */}
                <div className="bg-gray-700/50 p-4 rounded-lg">
                    <h4 className="font-bold text-lg text-gray-300 mb-2">Detalhes do Jogador</h4>
                    <div className="text-sm space-y-1">
                        <div className="flex justify-between"><span>Valor de Mercado:</span> <span className="font-mono font-semibold">{formatCurrency(player.marketValue)}</span></div>
                        <div className="flex justify-between"><span>Salário:</span> <span className="font-mono font-semibold">{formatCurrency(player.wage)}/sem</span></div>
                        <div className="flex justify-between"><span>Contrato Expira:</span> <span className="font-mono font-semibold">{player.contractExpires.toLocaleDateString()}</span></div>
                    </div>
                </div>

                {/* Informações da Oferta */}
                <div className="bg-gray-700/50 p-4 rounded-lg">
                    <h4 className="font-bold text-lg text-green-400 mb-2">Oferta de {buyingClub.name}</h4>
                    <div className="text-lg">
                        <div className="flex justify-between">
                            <span>Taxa de Transferência:</span> 
                            <span className="font-mono font-bold">{formatCurrency(latestAiOffer.fee)}</span>
                        </div>
                        {latestAiOffer.sellOnPercentage && (
                             <div className="flex justify-between text-sm mt-1">
                                <span>Cláusula de Venda Futura:</span> 
                                <span className="font-mono font-semibold">{latestAiOffer.sellOnPercentage}%</span>
                            </div>
                        )}
                    </div>
                </div>
                
                 {/* Histórico da Negociação */}
                {negotiation.clubOfferHistory.length > 0 && (
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                        <h4 className="font-bold text-base text-gray-300 mb-2">Histórico</h4>
                        <ul className="text-xs space-y-1 text-gray-400 max-h-24 overflow-y-auto">
                           {negotiation.clubOfferHistory.map((hist, index) => (
                               <li key={index} className="flex justify-between">
                                   <span>{hist.by === 'ai' ? buyingClub.name : 'Você'} ofereceu:</span>
                                   <span className="font-mono">{!isLoanOffer(hist.offer) ? formatCurrency(hist.offer.fee) : `Loan (${formatCurrency(hist.offer.loanFee)})`}</span>
                               </li>
                           ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Painel Direito: Ações */}
            <div className="bg-gray-700/50 p-4 rounded-lg flex flex-col justify-between">
                <div>
                    <h4 className="font-bold text-lg text-yellow-300 mb-4">Sua Resposta</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-1">Sugerir Contraproposta</label>
                            <input type="number" step="50000" value={counterFee} onChange={e => setCounterFee(Number(e.target.value))} className="w-full bg-gray-900 p-2 rounded font-mono text-lg" />
                            <p className="text-xs text-gray-400 mt-1">O valor de mercado do jogador é {formatCurrency(player.marketValue)}.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 mt-4">
                    <button onClick={handleAccept} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded">
                        Aceitar Oferta ({formatCurrency(latestAiOffer.fee)})
                    </button>
                    <button onClick={handleCounter} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">
                        Enviar Contraproposta
                    </button>
                     <button onClick={onCancel} className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-2 rounded">
                        Rejeitar e Sair
                    </button>
                </div>
            </div>
        </div>
    );
};


const AgentNegotiation: React.FC<{
    negotiation: TransferNegotiation;
    player: Player;
    dispatch: React.Dispatch<Action>;
}> = ({ negotiation, player, dispatch }) => {
    const [wage, setWage] = useState(Math.round(player.wage * 1.1));
    const [signingBonus, setSigningBonus] = useState(Math.round(player.marketValue * 0.05));
    const [duration, setDuration] = useState(3);
    const [releaseClause, setReleaseClause] = useState(0);
    
    // New Clauses State
    const [appearanceBonus, setAppearanceBonus] = useState(0);
    const [goalBonus, setGoalBonus] = useState(0);
    const [cleanSheetBonus, setCleanSheetBonus] = useState(0);
    const [leagueTitleBonus, setLeagueTitleBonus] = useState(0);
    const [loyaltyBonus, setLoyaltyBonus] = useState(0);
    const [annualSalaryIncrease, setAnnualSalaryIncrease] = useState(0);
    const [relegationReleaseClause, setRelegationReleaseClause] = useState(0);
    
    const handleSubmitOffer = () => {
        const offer: ContractOffer = {
            wage, signingBonus, durationYears: duration,
            goalBonus: goalBonus > 0 ? goalBonus : undefined,
            releaseClause: releaseClause > 0 ? releaseClause : undefined,
            appearanceBonus: appearanceBonus > 0 ? appearanceBonus : undefined,
            cleanSheetBonus: cleanSheetBonus > 0 ? cleanSheetBonus : undefined,
            leagueTitleBonus: leagueTitleBonus > 0 ? leagueTitleBonus : undefined,
            loyaltyBonus: loyaltyBonus > 0 ? loyaltyBonus : undefined,
            annualSalaryIncrease: annualSalaryIncrease > 0 ? annualSalaryIncrease : undefined,
            relegationReleaseClause: relegationReleaseClause > 0 ? relegationReleaseClause : undefined,
        };
        dispatch({ type: 'SUBMIT_AGENT_OFFER', payload: { negotiationId: negotiation.id, offer }});
    };

    const handleAcceptCounter = () => {
        dispatch({ type: 'ACCEPT_AGENT_COUNTER', payload: { negotiationId: negotiation.id } });
    };

    const lastAiOffer = negotiation.lastOfferBy === 'ai' ? negotiation.agentOfferHistory[negotiation.agentOfferHistory.length - 1]?.offer : null;

    return (
        <div>
            {lastAiOffer && (
                <div className="bg-yellow-900/50 p-4 rounded-lg mb-4 border border-yellow-600">
                    <h4 className="font-bold text-yellow-300">Exigências do Agente!</h4>
                    <p>Salário: <span className="font-mono">{formatCurrency(lastAiOffer.wage)}/sem</span></p>
                    <p>Bônus de Assinatura: <span className="font-mono">{formatCurrency(lastAiOffer.signingBonus)}</span></p>
                    <p>Duração: <span className="font-mono">{lastAiOffer.durationYears} Anos</span></p>
                    {lastAiOffer.loyaltyBonus && <p>Bônus de Lealdade: <span className="font-mono">{formatCurrency(lastAiOffer.loyaltyBonus)}</span></p>}
                    {lastAiOffer.annualSalaryIncrease && <p>Aumento Anual: <span className="font-mono">{lastAiOffer.annualSalaryIncrease}%</span></p>}
                    {lastAiOffer.relegationReleaseClause && <p>Cláusula de Rebaixamento: <span className="font-mono">{formatCurrency(lastAiOffer.relegationReleaseClause)}</span></p>}
                    <button onClick={handleAcceptCounter} className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded">
                        Aceitar Termos
                    </button>
                </div>
            )}
             <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-1">Salário Semanal</label>
                        <input type="number" step="100" value={wage} onChange={e => setWage(Number(e.target.value))} className="w-full bg-gray-900 p-2 rounded" />
                    </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-300 mb-1">Bônus de Assinatura</label>
                        <input type="number" step="1000" value={signingBonus} onChange={e => setSigningBonus(Number(e.target.value))} className="w-full bg-gray-900 p-2 rounded" />
                    </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-300 mb-1">Duração (Anos)</label>
                        <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full bg-gray-900 p-2 rounded">
                            <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5