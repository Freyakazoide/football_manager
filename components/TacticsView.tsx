import React, { useState, useEffect } from 'react';
import { GameState, Player, Tactics, Formation, Mentality } from '../types';
import { Action } from '../services/reducerTypes';

interface TacticsViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}

const pitchPositions: Record<Formation, { top: string; left: string }[]> = {
    '4-4-2': [ { top: '88%', left: '50%' }, { top: '70%', left: '20%' }, { top: '70%', left: '40%' }, { top: '70%', left: '60%' }, { top: '70%', left: '80%' }, { top: '50%', left: '20%' }, { top: '50%', left: '40%' }, { top: '50%', left: '60%' }, { top: '50%', left: '80%' }, { top: '25%', left: '40%' }, { top: '25%', left: '60%' } ],
    '4-3-3': [ { top: '88%', left: '50%' }, { top: '70%', left: '20%' }, { top: '70%', left: '40%' }, { top: '70%', left: '60%' }, { top: '70%', left: '80%' }, { top: '50%', left: '30%' }, { top: '50%', left: '50%' }, { top: '50%', left: '70%' }, { top: '25%', left: '25%' }, { top: '25%', left: '50%' }, { top: '25%', left: '75%' } ],
    '3-5-2': [ { top: '88%', left: '50%' }, { top: '70%', left: '30%' }, { top: '70%', left: '50%' }, { top: '70%', left: '70%' }, { top: '50%', left: '15%' }, { top: '50%', left: '35%' }, { top: '50%', left: '50%' }, { top: '50%', left: '65%' }, { top: '50%', left: '85%' }, { top: '25%', left: '40%' }, { top: '25%', left: '60%' } ],
    '5-3-2': [ { top: '88%', left: '50%' }, { top: '70%', left: '15%' }, { top: '70%', left: '35%' }, { top: '70%', left: '50%' }, { top: '70%', left: '65%' }, { top: '70%', left: '85%' }, { top: '50%', left: '30%' }, { top: '50%', left: '50%' }, { top: '50%', left: '70%' }, { top: '25%', left: '40%' }, { top: '25%', left: '60%' } ],
};


const TacticsView: React.FC<TacticsViewProps> = ({ gameState, dispatch }) => {
    const playerClub = gameState.playerClubId ? gameState.clubs[gameState.playerClubId] : null;
    const [tactics, setTactics] = useState<Tactics>(playerClub!.tactics);

    const squadPlayers = Object.values(gameState.players).filter((p: Player) => p.clubId === gameState.playerClubId);
    const assignedPlayers = new Set([...tactics.lineup, ...tactics.bench].filter(p => p !== null));
    const availablePlayers = squadPlayers.filter((p: Player) => !assignedPlayers.has(p.id));

    useEffect(() => {
        if (playerClub) {
            setTactics(playerClub.tactics);
        }
    }, [playerClub]);

    const handleFormationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setTactics({ ...tactics, formation: e.target.value as Formation });
    };

     const handleMentalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setTactics({ ...tactics, mentality: e.target.value as Mentality });
    };
    
    const handlePlayerSelect = (slotIndex: number, playerId: number | null, list: 'lineup' | 'bench') => {
        const newList = [...tactics[list]];
        const otherList = list === 'lineup' ? 'bench' : 'lineup';
        
        const existingIndexInList = newList.indexOf(playerId);
        const existingIndexInOtherList = tactics[otherList].indexOf(playerId);

        if (playerId !== null) {
            if (existingIndexInList > -1) { // Swap within same list
                newList[existingIndexInList] = newList[slotIndex];
            } else if (existingIndexInOtherList > -1) { // Player is in the other list, so can't select
                return; 
            }
        }
        newList[slotIndex] = playerId;
        setTactics({ ...tactics, [list]: newList });
    };

    const handleSaveChanges = () => {
        dispatch({ type: 'UPDATE_TACTICS', payload: tactics });
    };
    
    if (!playerClub) return null;

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-2/3 bg-gray-800 rounded-lg shadow-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Tactics</h2>
                <div className="relative aspect-[7/10] bg-green-800 bg-center bg-no-repeat" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%2338A169' stroke-width='4' stroke-dasharray='6%2c 12' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`}}>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 aspect-square border-2 border-green-600 rounded-full"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-1/2 bg-green-600"></div>

                    {pitchPositions[tactics.formation].map((pos, index) => {
                        const playerId = tactics.lineup[index];
                        const player = playerId ? gameState.players[playerId] : null;
                        return (
                            <div key={index} className="absolute -translate-x-1/2 -translate-y-1/2 group" style={{ top: pos.top, left: pos.left }}>
                               <div className="relative w-12 h-12 flex items-center justify-center">
                                    <div className={`w-full h-full rounded-full flex items-center justify-center font-bold text-sm ${player ? 'bg-blue-500 text-white' : 'bg-gray-600 text-gray-300'}`}>
                                        {player ? player.name.split(' ')[1].substring(0,3).toUpperCase() : '?'}
                                    </div>
                                    <div className="absolute bottom-full mb-2 w-48 bg-gray-900 text-white text-xs rounded py-1 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        {player ? `${player.name} (${player.position})` : 'Empty Slot'}
                                    </div>
                               </div>
                            </div>
                        );
})}
                </div>
            </div>
            <div className="lg:w-1/3 bg-gray-800 rounded-lg shadow-xl p-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="formation" className="block text-gray-400 text-sm font-bold mb-2">Formation</label>
                        <select id="formation" value={tactics.formation} onChange={handleFormationChange} className="w-full bg-gray-700 text-white p-2 rounded">
                            <option>4-4-2</option> <option>4-3-3</option> <option>3-5-2</option> <option>5-3-2</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="mentality" className="block text-gray-400 text-sm font-bold mb-2">Mentality</label>
                        <select id="mentality" value={tactics.mentality} onChange={handleMentalityChange} className="w-full bg-gray-700 text-white p-2 rounded">
                            <option>Defensive</option> <option>Balanced</option> <option>Offensive</option>
                        </select>
                    </div>
                </div>

                <div className="mb-4">
                    <h3 className="text-xl font-bold text-white mb-2">Starting XI</h3>
                    {tactics.lineup.map((playerId, index) => (
                        <select key={index} value={playerId || ''} onChange={(e) => handlePlayerSelect(index, e.target.value ? Number(e.target.value) : null, 'lineup')} className="w-full bg-gray-700 text-white p-1 rounded mb-1 text-sm">
                            <option value="">{`Slot ${index + 1}`}</option>
                            {playerId && <option value={playerId}>{gameState.players[playerId].name}</option>}
                            {availablePlayers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.position})</option>)}
                        </select>
                    ))}
                </div>
                
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-white mb-2">Bench</h3>
                    {tactics.bench.map((playerId, index) => (
                         <select key={index} value={playerId || ''} onChange={(e) => handlePlayerSelect(index, e.target.value ? Number(e.target.value) : null, 'bench')} className="w-full bg-gray-700 text-white p-1 rounded mb-1 text-sm">
                            <option value="">{`Sub ${index + 1}`}</option>
                            {playerId && <option value={playerId}>{gameState.players[playerId].name}</option>}
                            {availablePlayers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.position})</option>)}
                        </select>
                    ))}
                </div>

                <button onClick={handleSaveChanges} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                    Save Changes
                </button>
            </div>
        </div>
    );
};

export default TacticsView;
