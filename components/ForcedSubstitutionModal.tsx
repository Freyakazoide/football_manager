import React from 'react';
import { LiveMatchState, Player, LivePlayer } from '../types';
import { Action } from '../services/reducerTypes';

interface ForcedSubstitutionModalProps {
    liveMatch: LiveMatchState;
    dispatch: React.Dispatch<Action>;
}

const ForcedSubstitutionModal: React.FC<ForcedSubstitutionModalProps> = ({ liveMatch, dispatch }) => {
    const { forcedSubstitution } = liveMatch;
    if (!forcedSubstitution) return null;

    const { playerOutId, reason } = forcedSubstitution;
    
    const isPlayerHome = liveMatch.playerTeamId === liveMatch.homeTeamId;
    const playerTeamLineup = isPlayerHome ? liveMatch.homeLineup : liveMatch.awayLineup;
    const playerTeamBench = isPlayerHome ? liveMatch.homeBench : liveMatch.awayBench;

    const playerOut = playerTeamLineup.find(p => p.id === playerOutId);

    if (!playerOut) return null; // Should not happen

    const handleDismiss = () => {
        dispatch({ type: 'DISMISS_FORCED_SUBSTITUTION' });
    };

    const handleSubstitution = (playerInId: number) => {
        dispatch({ type: 'MAKE_SUBSTITUTION', payload: { playerOutId, playerInId } });
        dispatch({ type: 'DISMISS_FORCED_SUBSTITUTION' });
    };

    if (reason === 'red_card') {
        return (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 p-8 rounded-lg text-center shadow-2xl max-w-md">
                    <h2 className="text-3xl font-bold text-red-500 mb-4">Expulso!</h2>
                    <p className="text-lg mb-6">{playerOut.name} foi expulso. Sua equipe agora está com 10 homens.</p>
                    <button onClick={handleDismiss} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg">
                        Continuar Partida
                    </button>
                </div>
            </div>
        );
    }
    
    // reason === 'injury'
    const availableSubs = playerTeamBench.filter(p => !playerTeamLineup.some(onPitch => onPitch.id === p.id));

    return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-lg w-full">
                <h2 className="text-2xl font-bold text-yellow-400 mb-2">Lesão!</h2>
                <p className="mb-4">{playerOut.name} se lesionou e precisa ser substituído.</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableSubs.length > 0 ? availableSubs.map(playerIn => (
                        <button 
                            key={playerIn.id}
                            onClick={() => handleSubstitution(playerIn.id)}
                            className="w-full text-left p-3 bg-gray-700 hover:bg-blue-600 rounded-lg transition-colors"
                        >
                            <span className="font-semibold">{playerIn.name}</span>
                            <span className="text-xs text-gray-400 ml-2">{playerIn.role}</span>
                        </button>
                    )) : (
                        <p className="text-center text-red-400">Sem jogadores disponíveis no banco para substituir.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForcedSubstitutionModal;
