import React, { useState, useMemo } from 'react';
import { GameState, Player, PlayerRole, TransferNegotiation } from '../types';
import { getRoleCategory } from '../services/database';
import { Action } from '../services/reducerTypes';

interface TransfersViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
    onPlayerClick: (player: Player) => void;
    onOpenNegotiation: (negotiationId: number) => void;
}

const TransferListManagement: React.FC<{
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
    onPlayerClick: (player: Player) => void;
}> = ({ gameState, dispatch, onPlayerClick }) => {
    const clubPlayers = useMemo(() =>
        (Object.values(gameState.players) as Player[])
            .filter(p => p.clubId === gameState.playerClubId && p.squadStatus !== 'Base')
            .sort((a, b) => (b.isTransferListed ? 1 : 0) - (a.isTransferListed ? 1 : 0) || a.name.localeCompare(b.name))
    , [gameState.players, gameState.playerClubId]);

    const handleToggleList = (playerId: number) => {
        dispatch({ type: 'TOGGLE_PLAYER_TRANSFER_LIST_STATUS', payload: { playerId } });
    };

    const handleOfferPlayer = (playerId: number) => {
        dispatch({ type: 'OFFER_PLAYER_TO_CLUBS', payload: { playerId } });
    };

    return (
        <div className="overflow-x-auto">
            <p className="text-sm text-gray-400 mb-4">Adicione jogadores à lista de transferências para sinalizar a outros clubes que eles estão disponíveis. Você também pode oferecê-los ativamente para solicitar propostas.</p>
            <table className="w-full text-left">
                <thead className="border-b-2 border-gray-700 text-gray-400">
                    <tr>
                        <th className="p-3">Nome</th>
                        <th className="p-3">Idade</th>
                        <th className="p-3">Posição</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Valor</th>
                        <th className="p-3 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {clubPlayers.map(player => (
                        <tr key={player.id} className="border-b border-gray-700 hover:bg-gray-700">
                            <td className="p-3 font-semibold cursor-pointer" onClick={() => onPlayerClick(player)}>{player.name}</td>
                            <td className="p-3">{player.age}</td>
                            <td className="p-3">{player.naturalPosition}</td>
                            <td className="p-3">
                                {player.isTransferListed 
                                    ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-300">Listado</span> 
                                    : <span className="text-gray-500 text-xs">Não Listado</span>}
                            </td>
                            <td className="p-3 text-right font-mono">{player.marketValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}</td>
                            <td className="p-3 text-center space-x-2">
                                <button
                                    onClick={() => handleToggleList(player.id)}
                                    className={`text-xs font-bold py-1 px-3 rounded ${player.isTransferListed ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-500'}`}
                                >
                                    {player.isTransferListed ? 'Remover' : 'Listar'}
                                </button>
                                {player.isTransferListed && (
                                     <button
                                        onClick={() => handleOfferPlayer(player.id)}
                                        className="text-xs font-bold py-1 px-3 rounded bg-blue-600 hover:bg-blue-700"
                                    >
                                        Oferecer aos Clubes
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const TransfersView: React.FC<TransfersViewProps> = ({ gameState, dispatch, onPlayerClick, onOpenNegotiation }) => {
    const [activeTab, setActiveTab] = useState<'market' | 'loan_market' | 'negotiations' | 'transfer_list' | 'shortlist'>('market');
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
    
    const loanMarketPlayers = useMemo(() => {
        return allPlayers.filter(player => {
            const nameMatch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
            const positionMatch = positionFilter === 'All' || getRoleCategory(player.naturalPosition) === positionFilter;
            const notOwnPlayer = player.clubId !== gameState.playerClubId;
            const isYoung = player.age <= 24;
            return nameMatch && positionMatch && notOwnPlayer && isYoung;
        });
    }, [allPlayers, searchTerm, positionFilter, gameState.playerClubId]);

    const activeNegotiations = useMemo(() =>
        (Object.values(gameState.transferNegotiations) as TransferNegotiation[]).filter((n) =>
            (n.buyingClubId === gameState.playerClubId || n.sellingClubId === gameState.playerClubId) &&
            !['completed', 'cancelled_player', 'cancelled_ai'].includes(n.status))
    , [gameState.transferNegotiations, gameState.playerClubId]);
    
    const renderPlayerTable = (players: Player[]) => {
        const handleToggleShortlist = (playerId: number) => {
            if (gameState.shortlist.includes(playerId)) {
                dispatch({ type: 'REMOVE_FROM_SHORTLIST', payload: { playerId } });
            } else {
                dispatch({ type: 'ADD_TO_SHORTLIST', payload: { playerId } });
            }
        };

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-gray-700 text-gray-400">
                        <tr>
                            <th className="p-3">Nome</th>
                            <th className="p-3">Posição</th>
                            <th className="p-3">Idade</th>
                            <th className="p-3">Clube</th>
                            <th className="p-3 text-right">Valor de Mercado</th>
                            <th className="p-3 text-center">Obs.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.slice(0, 100).map(player => (
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
                                    {player.marketValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                                </td>
                                <td className="p-3 text-center">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent row click
                                            handleToggleShortlist(player.id);
                                        }}
                                        title={gameState.shortlist.includes(player.id) ? 'Remover da lista de observação' : 'Adicionar à lista de observação'}
                                        className={`text-xl ${gameState.shortlist.includes(player.id) ? 'text-yellow-400' : 'text-gray-500'}`}
                                    >
                                        {gameState.shortlist.includes(player.id) ? '★' : '☆'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderMarket = () => (
        <>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <input
                    type="text"
                    placeholder="Buscar nome do jogador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow bg-gray-700 text-white p-2 rounded"
                />
                <select
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    className="bg-gray-700 text-white p-2 rounded"
                >
                    <option value="All">Todas</option>
                    <option value="GK">GOL</option>
                    <option value="DEF">DEF</option>
                    <option value="MID">MEI</option>
                    <option value="FWD">ATA</option>
                </select>
            </div>
            {renderPlayerTable(activeTab === 'market' ? filteredPlayers : loanMarketPlayers)}
        </>
    );

    const renderNegotiations = () => (
        <div className="space-y-3">
            {activeNegotiations.length > 0 ? activeNegotiations.map(neg => {
                const player = gameState.players[neg.playerId];
                const isPlayerBuying = neg.buyingClubId === gameState.playerClubId;
                const otherClub = gameState.clubs[isPlayerBuying ? neg.sellingClubId : neg.buyingClubId];
                let typeText = neg.type.charAt(0).toUpperCase() + neg.type.slice(1);
                if (neg.type === 'loan') typeText = "Empréstimo";
                if (neg.type === 'renewal') typeText = "Renovação";
                if (neg.type === 'transfer') typeText = "Transferência";

                return (
                    <div key={neg.id} onClick={() => onOpenNegotiation(neg.id)} className="p-4 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-bold text-lg">{player.name} <span className="text-xs font-normal text-gray-400">({typeText})</span></p>
                                <p className="text-sm text-gray-400">
                                    {isPlayerBuying ? 'Oferta enviada para' : 'Oferta recebida de'} {otherClub.name}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className={`font-semibold text-sm px-2 py-1 rounded-full ${neg.status === 'player_turn' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                    {neg.status === 'player_turn' ? 'Ação Necessária' : 'Aguardando Resposta'}
                                </p>
                                <p className="text-xs text-gray-500 capitalize mt-1">Fase de {neg.stage === 'club' ? 'Clubes' : 'Agente'}</p>
                            </div>
                        </div>
                    </div>
                );
            }) : (
                <p className="text-center text-gray-500 pt-8">Você não tem negociações de transferência ativas.</p>
            )}
        </div>
    );

    const renderShortlist = () => {
        const shortlistedPlayers = gameState.shortlist.map(id => gameState.players[id]).filter(Boolean);
        if (shortlistedPlayers.length === 0) {
            return <p className="text-center text-gray-500 pt-8">Sua lista de observação está vazia. Adicione jogadores do mercado.</p>;
        }
        return renderPlayerTable(shortlistedPlayers);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'market':
            case 'loan_market':
                return renderMarket();
            case 'shortlist':
                return renderShortlist();
            case 'negotiations':
                return renderNegotiations();
            case 'transfer_list':
                return <TransferListManagement gameState={gameState} dispatch={dispatch} onPlayerClick={onPlayerClick} />;
            default:
                return null;
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Transferências</h2>
            <div className="flex border-b border-gray-700 mb-4">
                <button onClick={() => setActiveTab('market')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'market' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Mercado
                </button>
                 <button onClick={() => setActiveTab('loan_market')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'loan_market' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Mercado de Empréstimos
                </button>
                 <button onClick={() => setActiveTab('shortlist')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'shortlist' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Lista de Observação <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-2 ml-1">{gameState.shortlist.length}</span>
                </button>
                <button onClick={() => setActiveTab('negotiations')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'negotiations' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Negociações <span className="bg-green-600 text-white text-xs font-bold rounded-full px-2 ml-1">{activeNegotiations.length}</span>
                </button>
                <button onClick={() => setActiveTab('transfer_list')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'transfer_list' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Lista de Transferências
                </button>
            </div>
            
            {renderContent()}
        </div>
    );
};

export default TransfersView;