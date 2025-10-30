import React, { useState, useEffect } from 'react';
import { GameState, TransferNegotiation, TransferOffer, ContractOffer, Player, Club } from '../types';
import { Action } from '../services/reducerTypes';

interface TransferNegotiationModalProps {
    negotiation: TransferNegotiation;
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
    onClose: () => void;
}

const formatCurrency = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

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


// Painel completamente redesenhado para quando o JOGADOR está VENDENDO
const SellingClubNegotiation: React.FC<{
    negotiation: TransferNegotiation;
    player: Player;
    buyingClub: Club;
    dispatch: React.Dispatch<Action>;
    onCancel: () => void;
}> = ({ negotiation, player, buyingClub, dispatch, onCancel }) => {
    // Encontra a última oferta da IA
    const latestAiOffer = negotiation.clubOfferHistory.filter(o => o.by === 'ai').slice(-1)[0]?.offer;
    
    // Define uma contra-proposta inicial sensata (15% acima da oferta ou 20% acima do valor de mercado)
    const initialCounter = latestAiOffer ? latestAiOffer.fee * 1.15 : player.marketValue * 1.2;
    const [counterFee, setCounterFee] = useState(Math.round(initialCounter / 1000) * 1000);

    if (!latestAiOffer) {
        return <p className="text-gray-400">Aguardando detalhes da oferta inicial...</p>;
    }
    
    const handleAccept = () => {
        dispatch({ type: 'ACCEPT_INCOMING_CLUB_OFFER', payload: { negotiationId: negotiation.id } });
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
                                   <span className="font-mono">{formatCurrency(hist.offer.fee)}</span>
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
    const [goalBonus, setGoalBonus] = useState(0);
    const [releaseClause, setReleaseClause] = useState(0);
    const [duration, setDuration] = useState(3);

    const handleSubmitOffer = () => {
        dispatch({ type: 'SUBMIT_AGENT_OFFER', payload: { negotiationId: negotiation.id, offer: { wage, signingBonus, goalBonus, releaseClause: releaseClause > 0 ? releaseClause : undefined, durationYears: duration } } });
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
                    <p>Duration: <span className="font-mono">{lastAiOffer.durationYears} Years</span></p>
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
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1">Contract Duration (Years)</label>
                    <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full bg-gray-900 p-2 rounded">
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                    </select>
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
    const isRenewal = negotiation.sellingClubId === negotiation.buyingClubId;

    const isPlayerSelling = negotiation.sellingClubId === gameState.playerClubId;
    const isPlayerBuying = negotiation.buyingClubId === gameState.playerClubId;

    useEffect(() => {
        if (['completed', 'cancelled_player', 'cancelled_ai'].includes(negotiation.status)) {
            const timer = setTimeout(onClose, 800);
            return () => clearTimeout(timer);
        }
    }, [negotiation.status, onClose]);

    if (!player || !sellingClub || !buyingClub) return null;

    const handleCancel = () => {
        dispatch({ type: 'CANCEL_NEGOTIATION', payload: { negotiationId: negotiation.id } });
        onClose();
    };
    
    const isWaitingForResponse = negotiation.status === 'ai_turn';
    const mainTitle = isRenewal ? 'Contract Renewal' : isPlayerSelling ? 'Incoming Transfer Offer' : 'Outgoing Transfer Offer';
    const subTitle = isRenewal ? `For ${player.name}` : `For ${player.name} from ${sellingClub.name}`;

    const renderContent = () => {
        if (isWaitingForResponse) {
            return (
                <div className="text-center p-8 bg-gray-700/50 rounded animate-pulse">
                    <p className="font-semibold text-yellow-300 text-lg">Waiting for response from {isPlayerSelling ? buyingClub.name : sellingClub.name}...</p>
                    <p className="text-sm text-gray-400 mt-2">Advance to the next day to receive a response.</p>
                </div>
            );
        }

        if (negotiation.stage === 'club') {
            if (isPlayerBuying) {
                return <BuyingClubNegotiation negotiation={negotiation} player={player} dispatch={dispatch} balance={buyingClub.balance} />;
            }
            if (isPlayerSelling) {
                return <SellingClubNegotiation negotiation={negotiation} player={player} buyingClub={buyingClub} dispatch={dispatch} onCancel={handleCancel} />;
            }
        }

        if (negotiation.stage === 'agent') {
            if (isPlayerBuying) {
                return (
                    <div>
                        {!isRenewal && <p className="text-sm bg-green-900/50 p-2 rounded mb-4">Fee of <span className="font-bold">{formatCurrency(negotiation.agreedFee)}</span> agreed with {sellingClub.name}.</p>}
                        <AgentNegotiation negotiation={negotiation} player={player} dispatch={dispatch} />
                    </div>
                );
            }
            if (isPlayerSelling) {
                return (
                    <div className="text-center p-8">
                        <p className="font-semibold text-lg">A transfer fee has been agreed with {buyingClub.name}.</p>
                        <p className="mt-2 text-gray-400">
                            {player.name} is now negotiating personal terms with their new club. You will be notified of the outcome via an inbox message.
                        </p>
                    </div>
                );
            }
        }

        return null;
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold">{mainTitle}</h2>
                            <p className="text-gray-400">{subTitle}</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-bold">&times;</button>
                    </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {renderContent()}
                </div>

                {/* O rodapé agora é condicional. Ações de venda estão dentro do painel principal. */}
                {(isPlayerBuying || (isPlayerSelling && negotiation.stage === 'agent')) && !isWaitingForResponse && (
                    <div className="p-4 border-t border-gray-700">
                        <button onClick={handleCancel} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                            Walk Away From Negotiations
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransferNegotiationModal;