import React from 'react';
import { LivePlayer } from '../types';

interface Match2DViewProps {
    playerTeam: LivePlayer[];
    opponentTeam: LivePlayer[];
    ball: { x: number; y: number };
    onPlayerClick: (player: LivePlayer) => void;
    onDrop: (e: React.DragEvent, playerOutId: number) => void;
}

const PlayerIcon: React.FC<{
    player: LivePlayer;
    color: string;
    onClick: () => void;
    onDragStart: (e: React.DragEvent) => void;
}> = ({ player, color, onClick, onDragStart }) => {
    return (
        <div
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${player.currentPosition.x}%`, top: `${player.currentPosition.y}%`, transition: 'all 0.5s linear' }}
            onClick={onClick}
            draggable
            onDragStart={onDragStart}
        >
            <div className={`relative w-6 h-6 flex items-center justify-center rounded-full font-bold text-xs text-white ${color} border-2 border-black/30`}>
                {player.jerseyNumber}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-center text-xs font-semibold whitespace-nowrap bg-black/70 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                {player.name}
            </div>
        </div>
    );
};


const Ball: React.FC<{ position: { x: number, y: number } }> = ({ position }) => (
    <div
        className="absolute w-4 h-4 bg-yellow-400 rounded-full border-2 border-black -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${position.x}%`, top: `${position.y}%`, transition: 'all 0.2s linear' }}
    />
);


const Match2DView: React.FC<Match2DViewProps> = ({ playerTeam, opponentTeam, ball, onPlayerClick, onDrop }) => {
    return (
        <div
            className="relative w-full h-full bg-green-700 bg-center bg-no-repeat select-none rounded-lg shadow-inner overflow-hidden"
            style={{
                backgroundImage: `
                    url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 700 1000'%3e
                    %3c!-- Pitch Outline --%3e
                    %3crect x='2' y='2' width='696' height='996' fill='none' stroke='%2338A169' stroke-width='4'/%3e
                    %3c!-- Midfield Line --%3e
                    %3cline x1='2' y1='500' x2='698' y2='500' stroke='%2338A169' stroke-width='4'/%3e
                    %3c!-- Center Circle --%3e
                    %3ccircle cx='350' cy='500' r='91.5' fill='none' stroke='%2338A169' stroke-width='4'/%3e
                    %3c!-- Center Spot --%3e
                    %3ccircle cx='350' cy='500' r='5' fill='%2338A169'/%3e
                    %3c!-- Home Penalty Area --%3e
                    %3crect x='100' y='2' width='500' height='165' stroke='%2338A169' stroke-width='4'/%3e
                    %3c!-- Home Goal Area --%3e
                    %3crect x='250' y='2' width='200' height='55' stroke='%2338A169' stroke-width='4'/%3e
                    %3c!-- Home Penalty Spot --%3e
                    %3ccircle cx='350' cy='110' r='5' fill='%2338A169'/%3e
                    %3c!-- Home Penalty Arc --%3e
                    %3cpath d='M 258.5,165 A 91.5,91.5 0 0,1 441.5,165' fill='none' stroke='%2338A169' stroke-width='4'/%3e
                    %3c!-- Away Penalty Area --%3e
                    %3crect x='100' y='833' width='500' height='165' stroke='%2338A169' stroke-width='4'/%3e
                    %3c!-- Away Goal Area --%3e
                    %3crect x='250' y='943' width='200' height='55' stroke='%2338A169' stroke-width='4'/%3e
                    %3c!-- Away Penalty Spot --%3e
                    %3ccircle cx='350' cy='890' r='5' fill='%2338A169'/%3e
                    %3c!-- Away Penalty Arc --%3e
                    %3cpath d='M 258.5,833 A 91.5,91.5 0 0,0 441.5,833' fill='none' stroke='%2338A169' stroke-width='4'/%3e
                    %3c/svg%3e")`,
                backgroundSize: '100% 100%',
            }}
        >
            {playerTeam.filter(p => !p.isSentOff).map(p => (
                <div onDragOver={e => e.preventDefault()} onDrop={(e) => onDrop(e, p.id)} key={p.id}>
                    <PlayerIcon player={p} color="bg-blue-600" onClick={() => onPlayerClick(p)} onDragStart={() => {}} />
                </div>
            ))}
            {opponentTeam.filter(p => !p.isSentOff).map(p => (
                <PlayerIcon key={p.id} player={p} color="bg-red-600" onClick={() => {}} onDragStart={() => {}} />
            ))}
            <Ball position={ball} />
        </div>
    );
};

export default Match2DView;
