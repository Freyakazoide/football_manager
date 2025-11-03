import React, { useState, useMemo } from 'react';
import { GameState, Player, PlayerAttributes, PlayerRole, SquadStatus } from '../types';
import { Action } from '../services/reducerTypes';
import { ROLE_TO_POSITION_MAP } from '../services/database';

interface PlayerProfileViewProps {
    playerId: number;
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
    onStartNegotiation: (playerId: number) => void;
    onStartLoanNegotiation: (playerId: number) => void;
    onStartRenewalNegotiation: (playerId: number) => void;
    onOpenInteractionModal: (playerId: number) => void;
}

const AttributeBar: React.FC<{ label: string, value: number, isScouted: boolean, change: number }> = ({ label, value, isScouted, change }) => {
    const getDisplayValue = () => {
        if (isScouted) return value;
        const lower = Math.max(20, Math.floor(value / 10) * 10 - 5);
        const upper = Math.min(99, Math.ceil(value / 10) * 10 + 5);
        return `${lower}-${upper}`;
    };

    const getBarWidth = () => {
        if (isScouted) return `${value}%`;
        return `${Math.floor(value / 10) * 10}%`; // Show a bar based on the lower bound
    };

    const getColor = (val: number) => {
        if (val >= 85) return 'bg-green-500';
        if (val >= 70) return 'bg-yellow-500';
        return 'bg-red-500';
    };
    return (
        <div className="grid grid-cols-3 items-center gap-2 text-sm">
            <span className="text-gray-400 capitalize flex items-center">
                {change > 0 && <span className="text-green-400 mr-1">▲</span>}
                {change < 0 && <span className="text-red-400 mr-1">▼</span>}
                {label.replace(/([A-Z])/g, ' $1')}
            </span>
            <div className="col-span-2 bg-gray-600 rounded-full h-4 relative">
                <div className={`${getColor(value)} h-4 rounded-full ${!isScouted ? 'opacity-50' : ''}`} style={{ width: getBarWidth() }}></div>
                 <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold">
                   {getDisplayValue()}
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

const PlayerProfileView: React.FC<PlayerProfileViewProps> = ({ playerId, gameState, dispatch, onStartNegotiation, onStartLoanNegotiation, onStartRenewalNegotiation, onOpenInteractionModal }) => {
    const player = gameState.players[playerId];
    if (!player) return <div>Jogador não encontrado.</div>;
    
    const club = gameState.clubs[player.clubId];
    
    const [activeTab, setActiveTab] = useState<'attributes' | 'history'>('attributes');
    const [askingPrice, setAskingPrice] = useState(player.askingPrice || player.marketValue);
    
    const isTransferTarget = player.clubId !== gameState.playerClubId;
    const areAttributesFullyScouted = Object.keys(player.scoutedAttributes).length > 0 || !isTransferTarget;

    const getInteractionCooldown = (topic: 'praise' | 'criticize' | 'discipline' | 'set_target'): { onCooldown: boolean, remainingDays: number } => {
        const COOLDOWN_DAYS = 30;
        const lastInteraction = player.interactions
            .filter(i => i.topic === topic)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (!lastInteraction) {
            return { onCooldown: false, remainingDays: 0 };
        }

        const diffTime = gameState.currentDate.getTime() - new Date(lastInteraction.date).getTime();
        const daysSince = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const onCooldown = daysSince < COOLDOWN_DAYS;
        const remainingDays = onCooldown ? COOLDOWN_DAYS - daysSince : 0;
        
        return { onCooldown, remainingDays };
    };
    
    const praiseCooldown = getInteractionCooldown('praise');
    const criticizeCooldown = getInteractionCooldown('criticize');
    const disciplineCooldown = getInteractionCooldown('discipline');
    const targetCooldown = getInteractionCooldown('set_target');

    const isRenewalOnCooldown = useMemo(() => {
        if (!player.lastRenewalDate) return false;
        const sixMonthsAgo = new Date(gameState.currentDate);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return new Date(player.lastRenewalDate) > sixMonthsAgo;
    }, [player.lastRenewalDate, gameState.currentDate]);

    const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

    const handleSetAskingPrice = () => {
        dispatch({ type: 'SET_PLAYER_ASKING_PRICE', payload: { playerId: player.id, price: askingPrice } });
    };

    const isShortlisted = gameState.shortlist.includes(player.id);
    const handleToggleShortlist = () => {
        if (isShortlisted) {
            dispatch({ type: 'REMOVE_FROM_SHORTLIST', payload: { playerId: player.id } });
        } else {
            dispatch({ type: 'ADD_TO_SHORTLIST', payload: { playerId: player.id } });
        }
    };

    const attributeGroups: {title: string, attrs: (keyof PlayerAttributes)[]}[] = [
        { title: 'Técnico', attrs: ['passing', 'dribbling', 'shooting', 'tackling', 'heading', 'crossing'] },
        { title: 'Mental', attrs: ['aggression', 'creativity', 'positioning', 'teamwork', 'workRate'] },
        { title: 'Físico', attrs: ['pace', 'stamina', 'strength', 'naturalFitness'] },
    ];
    
    const renderAttributes = () => {
        const thirtyDaysAgo = new Date(gameState.currentDate);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentChanges = player.attributeChanges.filter(c => new Date(c.date) > thirtyDaysAgo);

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
                    {attributeGroups.map(group => (
                        <div key={group.title}>
                            <h3 className="text-lg font-semibold text-green-400 mb-3">{group.title}</h3>
                            <div className="space-y-2">
                                {group.attrs.map(attr => {
                                    const change = recentChanges.find(c => c.attr === attr)?.change || 0;
                                    return <AttributeBar key={attr} label={attr} value={player.attributes[attr]} isScouted={areAttributesFullyScouted} change={change} />
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-6 lg:col-span-1">
                    {(player.injury || player.suspension) && (
                        <div className={`p-3 rounded-lg ${player.injury ? 'bg-red-900/50 border-red-500' : 'bg-yellow-900/50 border-yellow-500'} border`}>
                            <h3 className="text-lg font-semibold text-red-400 mb-2">{player.injury ? 'Lesionado' : 'Suspenso'}</h3>
                            <div className="text-sm space-y-1">
                                {player.injury && <p>{player.injury.type}</p>}
                                <p>Retorno esperado: <span className="font-semibold">{(player.injury?.returnDate || player.suspension?.returnDate)?.toLocaleDateString()}</span></p>
                            </div>
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-semibold text-green-400 mb-2">Status</h3>
                        <div className="text-sm space-y-3">
                            <StatusProgressBar label="Moral" value={player.morale} />
                            <StatusProgressBar label="Satisfação" value={player.satisfaction} />
                            <StatusProgressBar label="Cond. Físico" value={player.matchFitness} />
                        </div>
                        {player.promise && (
                            <div className="mt-4 p-2 bg-yellow-900/50 rounded-lg text-xs text-yellow-300">
                                <p className="font-bold">Promessa Ativa:</p>
                                {player.promise.type === 'season_target' && <p>Marcar {player.promise.targetValue} {player.promise.targetMetric} até {player.promise.deadline.toLocaleDateString()}</p>}
                                {player.promise.type === 'playing_time' && <p>Mais tempo de jogo até {player.promise.deadline.toLocaleDateString()}</p>}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-green-400 mb-2">Alterações de Treino (30d)</h3>
                        <div className="text-sm space-y-2 bg-gray-700/50 p-3 rounded-lg max-h-32 overflow-y-auto">
                            {recentChanges.length > 0 ? (
                            [...recentChanges].reverse().map((change, index) => (
                                <div key={index} className="flex justify-between items-center">
                                <span className="capitalize flex items-center text-gray-300">
                                    {change.change > 0 ? <span className="text-green-400 mr-2 text-xs">▲</span> : <span className="text-red-400 mr-2 text-xs">▼</span>}
                                    {change.attr.replace(/([A-Z])/g, ' $1')}
                                </span>
                                <span className="text-gray-500 text-xs">{new Date(change.date).toLocaleDateString('pt-BR')}</span>
                                </div>
                            ))
                            ) : (
                            <p className="text-gray-500 text-xs text-center p-4">Nenhuma alteração nos últimos 30 dias.</p>
                            )}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-green-400 mb-2">Contrato</h3>
                        <div className="text-sm space-y-1">
                            <p>Salário: <span className="font-semibold">{formatCurrency(player.wage)}/sem</span></p>
                            <p>Expira em: <span className="font-semibold">{player.contractExpires.toLocaleDateString()}</span></p>
                             {!isTransferTarget && player.squadStatus !== 'Base' && (
                                <div className="pt-2">
                                    <label htmlFor="squad-status" className="block text-gray-400 text-xs font-bold mb-1">Status no Elenco</label>
                                    <select 
                                        id="squad-status"
                                        value={player.squadStatus} 
                                        onChange={e => dispatch({ 
                                            type: 'UPDATE_PLAYER_SQUAD_STATUS', 
                                            payload: { playerId: player.id, squadStatus: e.target.value as SquadStatus } 
                                        })}
                                        className="w-full bg-gray-700 text-white p-2 rounded text-sm"
                                    >
                                        <option value="Titular">Titular</option>
                                        <option value="Rodízio">Rodízio</option>
                                        <option value="Rotação">Rotação</option>
                                        <option value="Jovem Promessa">Jovem Promessa</option>
                                        <option value="Excedente">Excedente</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-green-400 mb-2">Valor</h3>
                        <div className="text-sm space-y-1">
                            <p>Valor de Mercado: <span className="font-semibold">{formatCurrency(player.marketValue)}</span></p>
                            {!isTransferTarget && (
                                <div className="pt-2">
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Definir Preço Pedido</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            step="100000"
                                            value={askingPrice}
                                            onChange={(e) => setAskingPrice(Number(e.target.value))}
                                            className="w-full bg-gray-700 p-2 rounded text-sm"
                                        />
                                        <button onClick={handleSetAskingPrice} className="bg-blue-600 hover:bg-blue-700 px-4 rounded text-sm font-bold">
                                            Definir
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {isTransferTarget && (
                    <div className="bg-gray-700 p-4 rounded-lg space-y-2">
                        <h3 className="text-lg font-semibold text-green-400 mb-2">Abordagem</h3>
                        <button
                            onClick={() => onStartNegotiation(player.id)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded"
                        >
                            Iniciar Negociação de Transferência
                        </button>
                        <button
                            onClick={() => onStartLoanNegotiation(player.id)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded"
                        >
                            Fazer Oferta de Empréstimo
                        </button>
                        <button
                            onClick={handleToggleShortlist}
                            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 rounded"
                        >
                            {isShortlisted ? 'Remover da Lista de Observação' : 'Adicionar à Lista de Observação'}
                        </button>
                    </div>
                    )}
                    {!isTransferTarget && player.squadStatus !== 'Base' && (
                        <>
                            <div className="bg-gray-700 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-400 mb-2">Renovação de Contrato</h3>
                                <button 
                                    onClick={() => onStartRenewalNegotiation(player.id)} 
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
                                    disabled={isRenewalOnCooldown}
                                    title={isRenewalOnCooldown ? "Você renovou o contrato com este jogador recentemente." : "Negociar um novo contrato"}
                                >
                                    {isRenewalOnCooldown ? 'Renovação em Cooldown' : 'Oferecer Novo Contrato'}
                                </button>
                            </div>

                           <div className="bg-gray-700 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-400 mb-3">Interagir com Jogador</h3>
                                {player.concern ? (
                                    <button onClick={() => onOpenInteractionModal(player.id)} className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2 rounded text-sm">
                                        Resolver Preocupação do Jogador
                                    </button>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2">
                                        <button onClick={() => dispatch({ type: 'PLAYER_INTERACTION', payload: { playerId: player.id, interactionType: 'praise' } })} disabled={praiseCooldown.onCooldown} className="bg-gray-600 hover:bg-blue-500 text-white font-bold py-2 rounded text-sm disabled:bg-gray-500 disabled:cursor-not-allowed">
                                            {praiseCooldown.onCooldown ? `Elogiar (Aguarde ${praiseCooldown.remainingDays}d)` : 'Elogiar Jogador'}
                                        </button>
                                        <button onClick={() => dispatch({ type: 'PLAYER_INTERACTION', payload: { playerId: player.id, interactionType: 'criticize' } })} disabled={criticizeCooldown.onCooldown} className="bg-gray-600 hover:bg-orange-500 text-white font-bold py-2 rounded text-sm disabled:bg-gray-500 disabled:cursor-not-allowed">
                                            {criticizeCooldown.onCooldown ? `Criticar (Aguarde ${criticizeCooldown.remainingDays}d)` : 'Criticar Jogador'}
                                        </button>
                                        <button onClick={() => dispatch({ type: 'PLAYER_INTERACTION', payload: { playerId: player.id, interactionType: 'discipline' } })} disabled={disciplineCooldown.onCooldown} className="bg-gray-600 hover:bg-red-500 text-white font-bold py-2 rounded text-sm disabled:bg-gray-500 disabled:cursor-not-allowed">
                                            {disciplineCooldown.onCooldown ? `Disciplinar (Aguarde ${disciplineCooldown.remainingDays}d)` : 'Disciplinar Jogador'}
                                        </button>
                                        <button onClick={() => dispatch({ type: 'PLAYER_INTERACTION', payload: { playerId: player.id, interactionType: 'set_target', target: { metric: 'goals', value: 10 } } })} disabled={!!player.promise || targetCooldown.onCooldown} className="bg-gray-600 hover:bg-purple-500 text-white font-bold py-2 rounded text-sm disabled:bg-gray-500 disabled:cursor-not-allowed">
                                            {player.promise?.type === 'season_target' ? 'Meta Ativa' : targetCooldown.onCooldown ? `Definir Meta (Aguarde ${targetCooldown.remainingDays}d)` : 'Definir Meta (10 Gols)'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        )
    };

    const renderHistory = () => (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="border-b-2 border-gray-700 text-gray-400">
                    <tr>
                        <th className="p-2">Temporada</th>
                        <th className="p-2">Clube</th>
                        <th className="p-2 text-center">Jogos</th>
                        <th className="p-2 text-center">Gols</th>
                        <th className="p-2 text-center">Assis.</th>
                        <th className="p-2 text-center">Des.</th>
                        <th className="p-2 text-center font-bold">Nota M.</th>
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
                            <td colSpan={7} className="p-4 text-center text-gray-500">Nenhum histórico de carreira registrado.</td>
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
                    <p className="text-gray-400">{player.naturalPosition} | {player.age} anos | {player.nationality}</p>
                    <p className="text-sm text-gray-500">Clube: {club?.name || 'N/A'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <PositionalFamiliarityPitch player={player} />
                </div>
                <div className="md:col-span-2">
                    <div className="border-b border-gray-700">
                        <div className="flex">
                            <button onClick={() => setActiveTab('attributes')} className={`py-2 px-4 font-semibold ${activeTab === 'attributes' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>Atributos</button>
                            <button onClick={() => setActiveTab('history')} className={`py-2 px-4 font-semibold ${activeTab === 'history' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>Histórico</button>
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
