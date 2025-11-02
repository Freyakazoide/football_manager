import React, { useState, useMemo } from 'react';
import { GameState, Match, MatchEvent, PlayerMatchStats, Player, LineupPlayer } from '../types';

interface MatchReportModalProps {
    match: Match;
    gameState: GameState;
    onClose: () => void;
    onPlayerClick: (player: Player) => void;
}

type Tab = 'summary' | 'lineups' | 'stats' | 'ratings' | 'events';

const StatRow: React.FC<{ label: string; homeValue: string | number; awayValue: string | number }> = ({ label, homeValue, awayValue }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-700">
        <span className="w-1/3 text-right font-mono">{homeValue}</span>
        <span className="w-1/3 text-center text-gray-400 text-xs">{label}</span>
        <span className="w-1/3 text-left font-mono">{awayValue}</span>
    </div>
);

const MiniPitch: React.FC<{
    lineup: (LineupPlayer | null)[];
    players: Record<number, Player>;
    onPlayerClick: (player: Player) => void;
    teamColor: string;
}> = ({ lineup, players, onPlayerClick, teamColor }) => {
    return (
        <div className="relative aspect-[7/10] bg-green-800 bg-center bg-no-repeat select-none rounded-md" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%2338A169' stroke-width='2' stroke-dasharray='4%2c 8' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`}}>
            {lineup.filter(Boolean).map(lp => {
                const player = players[lp!.playerId];
                if (!player) return null;
                return (
                    <div 
                        key={player.id} 
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                        style={{ top: `${lp!.position.y}%`, left: `${lp!.position.x}%` }}
                        onClick={() => onPlayerClick(player)}
                    >
                        <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-xs text-white ${teamColor} border-2 border-black/30`}>
                            {lp!.role.substring(0,3)}
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-center text-xs font-semibold whitespace-nowrap bg-black/50 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {player.name.split(' ')[1]}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const MatchReportModal: React.FC<MatchReportModalProps> = ({ match, gameState, onClose, onPlayerClick }) => {
    const [activeTab, setActiveTab] = useState<Tab>('summary');
    const homeTeam = gameState.clubs[match.homeTeamId];
    const awayTeam = gameState.clubs[match.awayTeamId];

    const allPlayersInvolved = useMemo(() => {
        if (!match.playerStats) return [];
        return Object.keys(match.playerStats).map(pId => gameState.players[Number(pId)]).filter(Boolean);
    }, [match.playerStats, gameState.players]);
    
    const renderSummary = () => (
        <div>
            <h3 className="text-xl font-bold text-green-400 mb-4">Resumo da Partida</h3>
            <p className="text-gray-300">
                Uma partida competitiva entre {homeTeam.name} e {awayTeam.name} terminou em {match.homeScore}-{match.awayScore}.
                O jogo teve um total de {(match.homeStats?.shots ?? 0) + (match.awayStats?.shots ?? 0)} finalizações, com muita ação em ambos os lados.
            </p>
        </div>
    );
    
    const renderLineups = () => {
        if (!match.homeLineup || !match.awayLineup) {
            return <p className="text-gray-400">Informações de escalação inicial não estão disponíveis para esta partida.</p>;
        }
        return (
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <h4 className="text-lg font-bold text-white mb-2 text-center">{homeTeam.name}</h4>
                    <MiniPitch lineup={match.homeLineup} players={gameState.players} onPlayerClick={onPlayerClick} teamColor="bg-blue-600" />
                </div>
                 <div>
                    <h4 className="text-lg font-bold text-white mb-2 text-center">{awayTeam.name}</h4>
                    <MiniPitch lineup={match.awayLineup} players={gameState.players} onPlayerClick={onPlayerClick} teamColor="bg-red-600" />
                </div>
            </div>
        );
    };

    const renderStats = () => (
        <div className="text-sm">
            <div className="flex justify-between items-center mb-2 font-bold">
                <span className="w-1/3 text-right">{homeTeam.name}</span>
                <span className="w-1/3 text-center"></span>
                <span className="w-1/3 text-left">{awayTeam.name}</span>
            </div>
            <StatRow label="Posse" homeValue={`${match.homeStats?.possession}%`} awayValue={`${match.awayStats?.possession}%`} />
            <StatRow label="Finalizações" homeValue={match.homeStats?.shots ?? 0} awayValue={match.awayStats?.shots ?? 0} />
            <StatRow label="No Alvo" homeValue={match.homeStats?.shotsOnTarget ?? 0} awayValue={match.awayStats?.shotsOnTarget ?? 0} />
            <StatRow label="xG" homeValue={match.homeStats?.xG.toFixed(2) ?? '0.00'} awayValue={match.awayStats?.xG.toFixed(2) ?? '0.00'} />
            <StatRow label="Passes" homeValue={match.homeStats?.passes ?? 0} awayValue={match.awayStats?.passes ?? 0} />
            <StatRow label="Desarmes" homeValue={match.homeStats?.tackles ?? 0} awayValue={match.awayStats?.tackles ?? 0} />
            <StatRow label="Faltas" homeValue={match.homeStats?.fouls ?? 0} awayValue={match.awayStats?.fouls ?? 0} />
            <StatRow label="Escanteios" homeValue={match.homeStats?.corners ?? 0} awayValue={match.awayStats?.corners ?? 0} />
        </div>
    );

    const renderPlayerRatings = () => {
        if (!match.playerStats) return <p>Notas dos jogadores indisponíveis para esta partida.</p>;

        const renderTeamTable = (teamId: number) => {
            const players = allPlayersInvolved.filter(p => p.clubId === teamId);
            return (
                <div>
                    <h4 className="text-lg font-bold text-white mb-2">{gameState.clubs[teamId].name}</h4>
                    <table className="w-full text-left text-sm">
                        <thead className="text-gray-400">
                            <tr>
                                <th className="p-1">Nome</th>
                                <th className="p-1 text-center">G</th>
                                <th className="p-1 text-center">A</th>
                                <th className="p-1 text-center">F</th>
                                <th className="p-1 text-center">D</th>
                                <th className="p-1 text-center font-bold">Nota</th>
                            </tr>
                        </thead>
                        <tbody>
                            {players.map(player => (
                                <tr key={player.id} className="border-t border-gray-700">
                                    <td className="p-1">{player.name}</td>
                                    <td className="p-1 text-center">{match.playerStats![player.id].goals}</td>
                                    <td className="p-1 text-center">{match.playerStats![player.id].assists}</td>
                                    <td className="p-1 text-center">{match.playerStats![player.id].shots}</td>
                                    <td className="p-1 text-center">{match.playerStats![player.id].tackles}</td>
                                    <td className={`p-1 text-center font-bold ${match.playerStats![player.id].rating >= 8 ? 'text-green-400' : match.playerStats![player.id].rating < 6 ? 'text-red-400' : ''}`}>
                                        {match.playerStats![player.id].rating.toFixed(1)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
        }
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderTeamTable(match.homeTeamId)}
                {renderTeamTable(match.awayTeamId)}
            </div>
        )
    };

    const renderEvents = () => (
         <div className="space-y-2 text-sm max-h-96 overflow-y-auto">
            {match.log?.map((event, i) => (
                <div key={i} className="flex gap-2">
                    <span className="font-bold w-8">{event.minute}'</span>
                    <span className={`flex-1 ${event.type === 'Goal' ? 'text-green-400 font-bold' : event.type === 'RedCard' ? 'text-red-500 font-bold' : event.type === 'YellowCard' ? 'text-yellow-400' : event.type === 'Highlight' ? 'text-yellow-400' : ''}`}>{event.text}</span>
                </div>
            ))}
        </div>
    );
    
    const renderContent = () => {
        switch(activeTab) {
            case 'summary': return renderSummary();
            case 'lineups': return renderLineups();
            case 'stats': return renderStats();
            case 'ratings': return renderPlayerRatings();
            case 'events': return renderEvents();
            default: return null;
        }
    };
    
    const TABS: { id: Tab; label: string }[] = [
        { id: 'summary', label: 'Resumo' },
        { id: 'lineups', label: 'Escalações' },
        { id: 'stats', label: 'Estatísticas' },
        { id: 'ratings', label: 'Notas' },
        { id: 'events', label: 'Eventos' }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-700">
                    <div className="flex justify-between items-center">
                        <div className="text-center w-2/5">
                            <h2 className="text-xl font-bold">{homeTeam.name}</h2>
                        </div>
                        <div className="text-center w-1/5">
                            <span className="text-3xl font-mono">{match.homeScore} - {match.awayScore}</span>
                        </div>
                        <div className="text-center w-2/5">
                            <h2 className="text-xl font-bold">{awayTeam.name}</h2>
                        </div>
                        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">&times;</button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700">
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === tab.id ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default MatchReportModal;