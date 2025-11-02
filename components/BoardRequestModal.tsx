import React from 'react';
import { GameState, Club, BoardRequestType } from '../types';
import { Action } from '../services/reducerTypes';
import { BOARD_REQUESTS } from '../services/boardRequests';

interface BoardRequestModalProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
    onClose: () => void;
}

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
};

const BoardRequestModal: React.FC<BoardRequestModalProps> = ({ gameState, dispatch, onClose }) => {
    const club = gameState.clubs[gameState.playerClubId!]!;

    const handleRequest = (requestType: BoardRequestType) => {
        dispatch({ type: 'MAKE_BOARD_REQUEST', payload: { requestType } });
        onClose();
    };

    const isRequestOnCooldown = (requestType: BoardRequestType): { onCooldown: boolean; availableDate?: Date } => {
        const cooldownDate = club.boardRequestCooldowns[requestType];
        if (cooldownDate && new Date(cooldownDate) > gameState.currentDate) {
            return { onCooldown: true, availableDate: new Date(cooldownDate) };
        }
        return { onCooldown: false };
    };

    const hasReachedMonthlyLimit = club.requestsThisMonth.count >= 2;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Fazer Pedido à Direção</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-bold">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <p className="text-sm text-gray-400 mb-4">Você pode fazer até 2 pedidos por mês. Escolha com sabedoria, pois cada pedido terá um período de espera antes de poder ser solicitado novamente.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {BOARD_REQUESTS.map(req => {
                            const { onCooldown, availableDate } = isRequestOnCooldown(req.type);
                            const meetsConfidence = !req.requirements.minConfidence || club.managerConfidence >= req.requirements.minConfidence;
                            const meetsReputation = !req.requirements.minReputation || club.reputation >= req.requirements.minReputation;
                            const meetsBalance = !req.requirements.minBalance || club.balance >= req.requirements.minBalance;
                            const allRequirementsMet = meetsConfidence && meetsReputation && meetsBalance;
                            
                            const isDisabled = onCooldown || hasReachedMonthlyLimit || !allRequirementsMet;
                            let buttonText = 'Solicitar';
                            if (onCooldown) buttonText = `Em Cooldown até ${availableDate?.toLocaleDateString()}`;
                            else if (hasReachedMonthlyLimit) buttonText = 'Limite mensal atingido';
                            else if (!allRequirementsMet) buttonText = 'Requisitos não atendidos';

                            return (
                                <div key={req.type} className={`bg-gray-700/50 p-4 rounded-lg flex flex-col justify-between ${isDisabled ? 'opacity-60' : ''}`}>
                                    <div>
                                        <h3 className="font-bold text-green-400">{req.title}</h3>
                                        <p className="text-xs text-gray-400 my-2">{req.description}</p>
                                        <div className="text-xs space-y-1 my-2 border-t border-b border-gray-600 py-2">
                                            <p>Custo: <span className="font-mono">{formatCurrency(req.cost)}</span></p>
                                            <p>Cooldown: <span className="font-mono">{req.cooldownMonths} meses</span></p>
                                            <h5 className="font-bold pt-1">Requisitos:</h5>
                                            <ul className="list-disc list-inside">
                                                <li className={meetsConfidence ? 'text-gray-400' : 'text-red-400'}>Confiança do Treinador: {req.requirements.minConfidence || 'N/A'}</li>
                                                <li className={meetsReputation ? 'text-gray-400' : 'text-red-400'}>Reputação do Clube: {req.requirements.minReputation || 'N/A'}</li>
                                                <li className={meetsBalance ? 'text-gray-400' : 'text-red-400'}>Balanço Mínimo: {req.requirements.minBalance ? formatCurrency(req.requirements.minBalance) : 'N/A'}</li>
                                            </ul>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRequest(req.type)}
                                        disabled={isDisabled}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-2 rounded text-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
                                    >
                                        {buttonText}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BoardRequestModal;
