import React, { useState, useEffect } from 'react';
import { GameState, TransferNegotiation, TransferOffer, ContractOffer, Player } from '../types';
import { Action } from '../services/reducerTypes';

interface TransferNegotiationModalProps {
    negotiation: TransferNegotiation;
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
    onClose: () => void;
}

const formatCurrency = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

const ClubNegotiation: React.FC<{
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

    const lastAiOffer = negotiation.lastOfferBy === 'ai' ? negotiation.clubOfferHistory[negotiation.clubOfferHistory.length - 1]?.offer : null;

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

const AgentNegotiation: React.FC<{
    negotiation: TransferNegotiation;
    player: Player;
    dispatch: React.Dispatch<Action>;
}> = ({ negotiation, player, dispatch }) => {
    const [wage, setWage] = useState(player.wage * 1.1);
    const [signingBonus, setSigningBonus] = useState(player.marketValue * 0.05);
    const [goalBonus, setGoalBonus] = useState(0);
    const [releaseClause, setReleaseClause] = useState(0);

    const handleSubmitOffer = () => {
        dispatch({ type: 'SUBMIT_AGENT_OFFER', payload: { negotiationId: negotiation.id, offer: { wage, signingBonus, goalBonus, releaseClause: releaseClause > 0 ? releaseClause : undefined } } });
    };

    const handleAcceptCounter = () => {
        dispatch({ type: 'ACCEPT_AGENT_COUNTER', payload: { negotiationId: negotiation.id } });
    };

    const lastAiOffer = negotiation.lastOfferBy === 'ai' ? negotiation.agentOfferHistory[negotiation.agentOfferHistory.length - 1]?.offer : null;

    return (
        <div>
            {lastAiOffer && (
                <div className="bg-yellow-900/50 p-4 rounded-lg mb-4 border border-yellow-600">
                    <h4 className="font-bold text-yellow-300">Agent Demands!</h4>
                    <p>Wage: <span className="font-mono">{formatCurrency(lastAiOffer.wage)}/wk</span></p>
                    <p>Signing Bonus: <span className="font-mono">{formatCurrency(lastAiOffer.signingBonus)}</span></p>
                    <button onClick={handleAcceptCounter} className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded">
                        Accept Terms
                    </button>
                </div>
            )}
             <div className="space-y-3">
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1">Weekly Wage</label>
                    <input type="number" step="100" value={wage} onChange={e => setWage(Number(e.target.value))} className="w-full bg-gray-900 p-2 rounded" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1">Signing Bonus</label>
                    <input type="number" step="1000" value={signingBonus} onChange={e => setSigningBonus(Number(e.target.value))} className="w-full bg-gray-900 p-2 rounded" />
                </div>
                 <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1">Goal Bonus</label>
                    <input type="number" step="100" value={goalBonus} onChange={e => setGoalBonus(Number(e.target.value))} className="w-full bg-gray-900 p-2 rounded" />
                </div>
                 <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1">Release Clause (Optional)</label>
                    <input type="number" step="10000" value={releaseClause} onChange={e => setReleaseClause(Number(e.target.value))} className="w-full bg-gray-900 p-2 rounded" />
                </div>
            </div>
            <button onClick={handleSubmitOffer} className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded">
                Propose Contract
            </button>
        </div>
    );
};

const TransferNegotiationModal: React.FC<TransferNegotiationModalProps> = ({ negotiation, gameState, dispatch, onClose }) => {
    const player = gameState.players[negotiation.playerId];
    const sellingClub = gameState.clubs[negotiation.sellingClubId];
    const buyingClub = gameState.clubs[negotiation.buyingClubId];

    if (!player || !sellingClub || !buyingClub) return null;

    const handleCancel = () => {
        dispatch({ type: 'CANCEL_NEGOTIATION', payload: { negotiationId: negotiation.id } });
        onClose();
    };
    
    const isWaitingForResponse = negotiation.status === 'ai_turn';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold">Transfer Negotiation</h2>
                            <p className="text-gray-400">For <span className="font-semibold text-white">{player.name}</span> from {sellingClub.name}</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-bold">&times;</button>
                    </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {negotiation.stage === 'club' && (
                        <ClubNegotiation negotiation={negotiation} player={player} dispatch={dispatch} balance={buyingClub.balance} />
                    )}
                    {negotiation.stage === 'agent' && (
                        <div>
                            <p className="text-sm bg-green-900/50 p-2 rounded mb-4">Fee of <span className="font-bold">{formatCurrency(negotiation.agreedFee)}</span> agreed with {sellingClub.name}.</p>
                            <AgentNegotiation negotiation={negotiation} player={player} dispatch={dispatch} />
                        </div>
                    )}
                     {isWaitingForResponse && (
                        <div className="mt-4 text-center p-4 bg-gray-700/50 rounded animate-pulse">
                            <p className="font-semibold text-yellow-300">Waiting for response...</p>
                            <p className="text-xs text-gray-400">Advance to the next day to receive a response.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-700">
                    <button onClick={handleCancel} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                        Walk Away From Negotiations
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransferNegotiationModal;