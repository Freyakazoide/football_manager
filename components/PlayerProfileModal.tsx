import React, { useState } from 'react';
import { GameState, Player, PlayerAttributes } from '../types';
import { Action } from '../services/reducerTypes';

interface PlayerProfileModalProps {
    player: Player;
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
    onClose: () => void;
}

const AttributeBar: React.FC<{ label: string, value: number }> = ({ label, value }) => {
    const getColor = (val: number) => {
        if (val >= 85) return 'bg-green-500';
        if (val >= 70) return 'bg-yellow-500';
        return 'bg-red-500';
    };
    return (
        <div className="grid grid-cols-3 items-center gap-2 text-sm">
            <span className="text-gray-400 capitalize">{label}</span>
            <div className="col-span-2 bg-gray-600 rounded-full h-4">
                <div className={`${getColor(value)} h-4 rounded-full text-center text-xs text-white font-bold flex items-center justify-center`} style={{ width: `${value}%` }}>
                   {value}
                </div>
            </div>
        </div>
    );
};

const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({ player, gameState, dispatch, onClose }) => {
    const club = gameState.clubs[player.clubId];
    const playerClub = gameState.clubs[gameState.playerClubId!];
    const [offerAmount, setOfferAmount] = useState(player.marketValue);
    
    const isTransferTarget = player.clubId !== gameState.playerClubId;

    const makeOffer = () => {
        dispatch({ type: 'MAKE_TRANSFER_OFFER', payload: { player, offerAmount } });
        onClose();
    };

    const formatCurrency = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

    const attributeGroups: {title: string, attrs: (keyof PlayerAttributes)[]}[] = [
        { title: 'Technical', attrs: ['passing', 'dribbling', 'shooting', 'tackling', 'heading'] },
        { title: 'Mental', attrs: ['aggression', 'creativity', 'positioning', 'teamwork', 'workRate'] },
        { title: 'Physical', attrs: ['pace', 'stamina', 'strength', 'naturalFitness'] },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-4xl max-h-full overflow-y-auto">
                <div className="p-6 border-b border-gray-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold">{player.name}</h2>
                        <p className="text-gray-400">{player.position} | {player.age} y/o | {player.nationality}</p>
                        <p className="text-sm text-gray-500">Club: {club.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Attributes Column */}
                    <div className="md:col-span-2 space-y-6">
                        {attributeGroups.map(group => (
                            <div key={group.title}>
                                <h3 className="text-lg font-semibold text-green-400 mb-2">{group.title}</h3>
                                <div className="space-y-2">
                                    {group.attrs.map(attr => <AttributeBar key={attr} label={attr} value={player.attributes[attr]}/>)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Info & Transfer Column */}
                    <div className="space-y-6">
                        <div>
                           <h3 className="text-lg font-semibold text-green-400 mb-2">Contract</h3>
                           <div className="text-sm space-y-1">
                                <p>Wage: <span className="font-semibold">{formatCurrency(player.wage)}/wk</span></p>
                                <p>Expires: <span className="font-semibold">{player.contractExpires.toLocaleDateString()}</span></p>
                           </div>
                        </div>
                         <div>
                           <h3 className="text-lg font-semibold text-green-400 mb-2">Value</h3>
                           <div className="text-sm space-y-1">
                                <p>Market Value: <span className="font-semibold">{formatCurrency(player.marketValue)}</span></p>
                           </div>
                        </div>

                        {isTransferTarget && (
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-green-400 mb-2">Transfer Offer</h3>
                            <p className="text-xs text-gray-400 mb-2">Your balance: {formatCurrency(playerClub.balance)}</p>
                            <input
                                type="number"
                                value={offerAmount}
                                onChange={(e) => setOfferAmount(Number(e.target.value))}
                                className="w-full bg-gray-800 p-2 rounded mb-2"
                            />
                             <div className="flex gap-2 mb-4">
                                <button onClick={() => setOfferAmount(Math.round(player.marketValue * 0.9))} className="flex-1 bg-gray-600 text-xs p-1 rounded">90%</button>
                                <button onClick={() => setOfferAmount(player.marketValue)} className="flex-1 bg-gray-600 text-xs p-1 rounded">100%</button>
                                <button onClick={() => setOfferAmount(Math.round(player.marketValue * 1.1))} className="flex-1 bg-gray-600 text-xs p-1 rounded">110%</button>
                             </div>
                            <button
                                onClick={makeOffer}
                                disabled={playerClub.balance < offerAmount}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                Make Offer
                            </button>
                        </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerProfileModal;