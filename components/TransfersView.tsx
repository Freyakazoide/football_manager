

import React, { useState, useMemo } from 'react';
import { GameState, Player, PlayerRole, TransferNegotiation } from '../types';
import { getRoleCategory } from '../services/database';

interface TransfersViewProps {
    gameState: GameState;
    onPlayerClick: (player: Player) => void;
    onOpenNegotiation: (negotiationId: number) => void;
}

const TransfersView: React.FC<TransfersViewProps> = ({ gameState, onPlayerClick, onOpenNegotiation }) => {
    const [activeTab, setActiveTab] = useState<'market' | 'negotiations'>('market');
    const [searchTerm, setSearchTerm] = useState('');
    const [positionFilter, setPositionFilter] = useState('All');

    const allPlayers = useMemo(() => Object.values(gameState.players), [gameState.players]);

    const filteredPlayers = useMemo(() => {
        return allPlayers.filter(player => {
            const nameMatch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
            const positionMatch = positionFilter === 'All' || getRoleCategory(player.naturalPosition) === positionFilter;
            const notOwnPlayer = player.clubId !== gameState.playerClubId;
            return nameMatch && positionMatch && notOwnPlayer;
        });
    }, [allPlayers, searchTerm, positionFilter, gameState.playerClubId]);

    const activeNegotiations = useMemo(() =>
        (Object.values(gameState.transferNegotiations) as TransferNegotiation[]).filter((n) =>
            (n.buyingClubId === gameState.playerClubId || n.sellingClubId === gameState.playerClubId) &&
            !['completed', 'cancelled_player', 'cancelled_ai'].includes(n.status))
    , [gameState.transferNegotiations, gameState.playerClubId]);

    const renderMarket = () => (
        <>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <input
                    type="text"
                    placeholder="Search player name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow bg-gray-700 text-white p-2 rounded"
                />
                <select
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    className="bg-gray-700 text-white p-2 rounded"
                >
                    <option>All</option>
                    <option>GK</option>
                    <option>DEF</option>
                    <option>MID</option>
                    <option>FWD</option>
                </select>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-gray-700 text-gray-400">
                        <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">Position</th>
                            <th className="p-3">Age</th>
                            <th className="p-3">Club</th>
                            <th className="p-3 text-right">Market Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPlayers.slice(0, 100).map(player => (
                            <tr
                                key={player.id}
                                className="border-b border-gray-700 hover:bg-gray-700 cursor-pointer"
                                onClick={() => onPlayerClick(player)}
                            >
                                <td className="p-3 font-semibold">{player.name}</td>
                                <td className="p-3">{player.naturalPosition}</td>
                                <td className="p-3">{player.age}</td>
                                <td className="p-3">{gameState.clubs[player.clubId]?.name}</td>
                                <td className="p-3 text-right">
                                    {player.marketValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );

    const renderNegotiations = () => (
        <div className="space-y-3">
            {activeNegotiations.length > 0 ? activeNegotiations.map(neg => {
                const player = gameState.players[neg.playerId];
                const isPlayerBuying = neg.buyingClubId === gameState.playerClubId;
                const otherClub = gameState.clubs[isPlayerBuying ? neg.sellingClubId : neg.buyingClubId];
                return (
                    <div key={neg.id} onClick={() => onOpenNegotiation(neg.id)} className="p-4 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-bold text-lg">{player.name}</p>
                                <p className="text-sm text-gray-400">
                                    {isPlayerBuying ? 'Outgoing offer to' : 'Incoming offer from'} {otherClub.name}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className={`font-semibold text-sm px-2 py-1 rounded-full ${neg.status === 'player_turn' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                    {neg.status === 'player_turn' ? 'Action Required' : 'Waiting for Response'}
                                </p>
                                <p className="text-xs text-gray-500 capitalize mt-1">{neg.stage} Stage</p>
                            </div>
                        </div>
                    </div>
                );
            }) : (
                <p className="text-center text-gray-500 pt-8">You have no active transfer negotiations.</p>
            )}
        </div>
    );

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Transfers</h2>
            <div className="flex border-b border-gray-700 mb-4">
                <button onClick={() => setActiveTab('market')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'market' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Market
                </button>
                <button onClick={() => setActiveTab('negotiations')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'negotiations' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Negotiations <span className="bg-green-600 text-white text-xs font-bold rounded-full px-2 ml-1">{activeNegotiations.length}</span>
                </button>
            </div>
            
            {activeTab === 'market' ? renderMarket() : renderNegotiations()}
        </div>
    );
};

export default TransfersView;