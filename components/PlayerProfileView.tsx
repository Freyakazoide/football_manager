import React, { useState } from 'react';
import { GameState, Player, PlayerAttributes, PlayerRole } from '../types';
import { Action } from '../services/reducerTypes';
import { ROLE_TO_POSITION_MAP } from '../services/database';

interface PlayerProfileViewProps {
    playerId: number;
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
    onPlayerClick: (player: Player) => void;
}

const AttributeBar: React.FC<{ label: string, value: number }> = ({ label, value }) => {
    const getColor = (val: number) => {
        if (val >= 85) return 'bg-green-500';
        if (val >= 70) return 'bg-yellow-500';
        return 'bg-red-500';
    };
    return (
        <div className="grid grid-cols-3 items-center gap-2 text-sm">
            <span className="text-gray-400 capitalize">{label.replace(/([A-Z])/g, ' $1')}</span>
            <div className="col-span-2 bg-gray-600 rounded-full h-4">
                <div className={`${getColor(value)} h-4 rounded-full text-center text-xs text-white font-bold flex items-center justify-center`} style={{ width: `${value}%` }}>
                   {value}
                </div>
            </div>
        </div>
    );
};

const StatusProgressBar: React.FC<{ label: string, value: number, max?: number }> = ({ label, value, max=100 }) => {
    const getBarColor = () => {
        const percentage = (value / max) * 100;
        if (percentage > 75) return 'bg-green-500';
        if (percentage > 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };
    return (
         <div>
            <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm text-gray-300">{label}</span>
                <span className="text-xs font-bold text-gray-400">{value} / {max}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className={`${getBarColor()} h-2.5 rounded-full`} style={{width: `${(value/max)*100}%`}}></div>
            </div>
        </div>
    );
}

const PositionalFamiliarityPitch: React.FC<{ player: Player }> = ({ player }) => {
    const getFamiliarityStyle = (role: PlayerRole) => {
        const familiarity = player.positionalFamiliarity[role] || 0;
        let color = 'bg-red-500';
        if (familiarity >= 95) color = 'bg-green-500'; // Natural
        else if (familiarity >= 80) color = 'bg-lime-500'; // Accomplished
        else if (familiarity >= 60) color = 'bg-yellow-500'; // Competent
        else if (familiarity >= 40) color = 'bg-orange-500'; // Awkward
        const opacity = Math.max(0.1, familiarity / 100);
        return { color, opacity };
    };

    const rolesOnPitch = Object.keys(ROLE_TO_POSITION_MAP) as PlayerRole[];

    // Group roles by position to avoid overlap
    const positions: Record<string, PlayerRole[]> = {};
    rolesOnPitch.forEach(role => {
        const pos = ROLE_TO_POSITION_MAP[role];
        const key = `${pos.x}-${pos.y}`;
        if (!positions[key]) positions[key] = [];
        positions[key].push(role);
    });

    return (
        <div 
            className="relative w-full max-w-sm mx-auto aspect-[7/10] bg-green-900 bg-center bg-no-repeat select-none rounded-lg shadow-inner overflow-hidden" 
            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 700 1000'%3e%3c!-- Pitch Outline --%3e%3crect x='2' y='2' width='696' height='996' fill='none' stroke='%232F855A' stroke-width='4'/%3e%3c!-- Halfway Line --%3e%3cline x1='2' y1='500' x2='698' y2='500' stroke='%232F855A' stroke-width='4'/%3e%3c!-- Center Circle --%3e%3ccircle cx='350' cy='500' r='91.5' fill='none' stroke='%232F855A' stroke-width='4'/%3e%3c/svg%3e")` }}
        >
            {Object.entries(positions).map(([key, roles]) => {
                const [x, y] = key.split('-').map(Number);
                const role = roles[0]; // Show first role in a stack for simplicity
                const { color, opacity } = getFamiliarityStyle(role);
                const displayRole = roles.find(r => player.positionalFamiliarity[r] > 80) || role;

                return (
                    <div
                        key={key}
                        className="absolute -translate-x-1/2 -translate-y-1/2 group"
                        style={{ left: `${x}%`, top: `${y}%` }}
                    >
                        <div 
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white border-2 border-black/30 transition-all ${color}`} 
                            style={{ opacity }}
                        >
                            {displayRole.split(' ').map(w => w[0]).join('')}
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-center text-xs font-semibold whitespace-nowrap bg-black/70 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {displayRole} ({player.positionalFamiliarity[displayRole]}%)
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const PlayerProfileView: React.FC<PlayerProfileViewProps> = ({ playerId, gameState, dispatch }) => {
    const player = gameState.players[playerId];
    if (!player) return <div>Player not found.</div>;
    
    const club = gameState.clubs[player.clubId];
    const playerClub = gameState.playerClubId ? gameState.clubs[gameState.playerClubId] : null;

    const [offerAmount, setOfferAmount] = useState(player.marketValue);
    const [activeTab, setActiveTab] = useState<'attributes' | 'history'>('attributes');
    
    const isTransferTarget = player.clubId !== gameState.playerClubId;

    const makeOffer = () => {
        dispatch({ type: 'MAKE_TRANSFER_OFFER', payload: { player, offerAmount } });
    };

    const formatCurrency = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

    const attributeGroups: {title: string, attrs: (keyof PlayerAttributes)[]}[] = [
        { title: 'Technical', attrs: ['passing', 'dribbling', 'shooting', 'tackling', 'heading'] },
        { title: 'Mental', attrs: ['aggression', 'creativity', 'positioning', 'teamwork', 'workRate'] },
        { title: 'Physical', attrs: ['pace', 'stamina', 'strength', 'naturalFitness'] },
    ];

    const renderAttributes = () => (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
                {attributeGroups.map(group => (
                    <div key={group.title}>
                        <h3 className="text-lg font-semibold text-green-400 mb-3">{group.title}</h3>
                        <div className="space-y-2">
                            {group.attrs.map(attr => <AttributeBar key={attr} label={attr} value={player.attributes[attr]}/>)}
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-6 lg:col-span-1">
                 {(player.injury || player.suspension) && (
                    <div className={`p-3 rounded-lg ${player.injury ? 'bg-red-900/50 border-red-500' : 'bg-yellow-900/50 border-yellow-500'} border`}>
                         <h3 className="text-lg font-semibold text-red-400 mb-2">{player.injury ? 'Injured' : 'Suspended'}</h3>
                         <div className="text-sm space-y-1">
                            {player.injury && <p>{player.injury.type}</p>}
                            <p>Expected back: <span className="font-semibold">{(player.injury?.returnDate || player.suspension?.returnDate)?.toLocaleDateString()}</span></p>
                         </div>
                    </div>
                )}
                <div>
                   <h3 className="text-lg font-semibold text-green-400 mb-2">Status</h3>
                   <div className="text-sm space-y-3">
                       <StatusProgressBar label="Morale" value={player.morale} />
                       <StatusProgressBar label="Satisfaction" value={player.satisfaction} />
                       <StatusProgressBar label="Match Fitness" value={player.matchFitness} />
                   </div>
                </div>
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

                {isTransferTarget && playerClub && (
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
    );

    const renderHistory = () => (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="border-b-2 border-gray-700 text-gray-400">
                    <tr>
                        <th className="p-2">Season</th>
                        <th className="p-2">Club</th>
                        <th className="p-2 text-center">Apps</th>
                        <th className="p-2 text-center">Gls</th>
                        <th className="p-2 text-center">Ast</th>
                        <th className="p-2 text-center">Tkls</th>
                        <th className="p-2 text-center font-bold">Av Rtg</th>
                    </tr>
                </thead>
                <tbody>
                    {player.history && player.history.length > 0 ? player.history.map(stat => (
                        <tr key={`${stat.season}-${stat.clubId}`} className="border-b border-gray-700">
                            <td className="p-2">{stat.season}</td>
                            <td className="p-2">{gameState.clubs[stat.clubId]?.name || 'N/A'}</td>
                            <td className="p-2 text-center">{stat.apps} ({stat.subOn})</td>
                            <td className="p-2 text-center">{stat.goals}</td>
                            <td className="p-2 text-center">{stat.assists}</td>
                            <td className="p-2 text-center">{stat.tackles}</td>
                            <td className="p-2 text-center font-bold">
                                {stat.apps > 0 ? (stat.ratingPoints / stat.apps).toFixed(2) : '-'}
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={7} className="p-4 text-center text-gray-500">No career history recorded.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold">{player.name}</h2>
                    <p className="text-gray-400">{player.naturalPosition} | {player.age} y/o | {player.nationality}</p>
                    <p className="text-sm text-gray-500">Club: {club?.name || 'N/A'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <PositionalFamiliarityPitch player={player} />
                </div>
                <div className="md:col-span-2">
                    <div className="border-b border-gray-700">
                        <div className="flex">
                            <button onClick={() => setActiveTab('attributes')} className={`py-2 px-4 font-semibold ${activeTab === 'attributes' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>Attributes</button>
                            <button onClick={() => setActiveTab('history')} className={`py-2 px-4 font-semibold ${activeTab === 'history' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>History</button>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-900/50 rounded-b-lg">
                        {activeTab === 'attributes' ? renderAttributes() : renderHistory()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerProfileView;
