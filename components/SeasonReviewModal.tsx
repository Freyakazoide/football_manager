import React from 'react';
import { GameState, SeasonReviewData, LeagueEntry, Player } from '../types';

interface SeasonReviewModalProps {
    reviewData: SeasonReviewData;
    gameState: GameState;
    onContinue: () => void;
}

const AwardCard: React.FC<{ title: string, player: Player & { goals?: number }, stat?: string }> = ({ title, player, stat }) => (
    <div className="bg-gray-700/50 p-4 rounded-lg text-center">
        <h4 className="text-sm font-bold text-green-400 uppercase tracking-wider">{title}</h4>
        <p className="text-lg font-semibold text-white mt-1">{player.name}</p>
        {stat && <p className="text-gray-400">{stat}</p>}
    </div>
);


const SeasonReviewModal: React.FC<SeasonReviewModalProps> = ({ reviewData, gameState, onContinue }) => {
    const { season, finalTable, leagueWinnerId, promotedClubIds, relegatedClubIds, awards, prizeMoney } = reviewData;
    const playerClubId = gameState.playerClubId;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-gray-800 text-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
                <div className="p-6 text-center border-b border-gray-700 bg-gray-900/50 rounded-t-lg">
                    <h2 className="text-3xl font-bold text-green-400">Season Review {season}</h2>
                    <p className="text-gray-400">A look back at the season's key events.</p>
                </div>

                <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: League Table & Movements */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                                <span className="text-yellow-400">🏆</span>
                                Final League Table
                            </h3>
                            <div className="bg-gray-900/50 rounded-lg max-h-96 overflow-y-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 bg-gray-700">
                                        <tr>
                                            <th className="p-2">Pos</th>
                                            <th className="p-2">Club</th>
                                            <th className="p-2 text-center">Pts</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {finalTable.map((entry, index) => (
                                            <tr key={entry.clubId} className={`border-t border-gray-700 ${entry.clubId === playerClubId ? 'bg-green-900/70 font-bold' : ''}`}>
                                                <td className="p-2">{index + 1}</td>
                                                <td className="p-2">{gameState.clubs[entry.clubId].name}</td>
                                                <td className="p-2 text-center">{entry.points}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                         <div>
                            <h3 className="text-xl font-bold mb-3">League Movements</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-green-900/50 p-3 rounded">
                                    <h4 className="font-semibold text-green-400 mb-2">Promoted</h4>
                                    <ul className="text-sm space-y-1">
                                        {promotedClubIds.map(id => <li key={id}>{gameState.clubs[id].name}</li>)}
                                    </ul>
                                </div>
                                <div className="bg-red-900/50 p-3 rounded">
                                    <h4 className="font-semibold text-red-400 mb-2">Relegated</h4>
                                     <ul className="text-sm space-y-1">
                                        {relegatedClubIds.map(id => <li key={id}>{gameState.clubs[id].name}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Awards & Finances */}
                    <div className="space-y-6">
                        <div>
                             <h3 className="text-xl font-bold mb-3">Club Awards</h3>
                             <div className="grid grid-cols-1 gap-4">
                                <AwardCard title="Player of the Season" player={awards.playerOfTheSeason} />
                                <AwardCard title="Top Goalscorer" player={awards.topScorer} stat={`${awards.topScorer.goals} Goals`} />
                                <AwardCard title="Young Player of the Season" player={awards.youngPlayer} stat={`${awards.youngPlayer.age} years old`} />
                             </div>
                        </div>
                        <div>
                             <h3 className="text-xl font-bold mb-3">Financial Summary</h3>
                             <div className="bg-gray-900/50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between text-lg">
                                    <span className="text-gray-400">Prize Money:</span>
                                    <span className="font-bold text-green-400">{prizeMoney.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}</span>
                                </div>
                                <div className="flex justify-between text-lg">
                                    <span className="text-gray-400">End of Season Balance:</span>
                                    <span className="font-bold">{gameState.clubs[playerClubId!].balance.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}</span>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-700 bg-gray-900/50 rounded-b-lg">
                    <button
                        onClick={onContinue}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition duration-300 text-lg transform hover:scale-105"
                    >
                        Proceed to Next Season
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SeasonReviewModal;