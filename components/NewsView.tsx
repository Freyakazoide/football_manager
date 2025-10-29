import React, { useState } from 'react';
import { GameState, NewsItem, Match, Club } from '../types';
import { Action } from '../services/reducerTypes';

const GraphicalStatBar: React.FC<{ label: string; homeValue: number; awayValue: number; isPercentage?: boolean; isXG?: boolean }> = ({ label, homeValue, awayValue, isPercentage, isXG }) => {
    const total = homeValue + awayValue;
    const homePercent = total > 0 ? (homeValue / total) * 100 : 50;
    const homeDisplay = isPercentage ? `${Math.round(homeValue)}%` : isXG ? homeValue.toFixed(2) : Math.round(homeValue);
    const awayDisplay = isPercentage ? `${Math.round(awayValue)}%` : isXG ? awayValue.toFixed(2) : Math.round(awayValue);

    return (
        <div>
            <div className="flex justify-between items-center text-sm mb-1 px-1">
                <span className="font-bold font-mono">{homeDisplay}</span>
                <span className="text-gray-400 text-xs">{label}</span>
                <span className="font-bold font-mono">{awayDisplay}</span>
            </div>
            <div className="flex w-full h-2 bg-gray-600 rounded">
                <div className="bg-blue-500 rounded-l" style={{ width: `${homePercent}%` }}></div>
                <div className="bg-red-500 rounded-r" style={{ width: `${100 - homePercent}%` }}></div>
            </div>
        </div>
    );
};


const MatchStatsSummary: React.FC<{ match: Match; clubs: Record<number, Club> }> = ({ match, clubs }) => {
    const homeTeam = clubs[match.homeTeamId];
    const awayTeam = clubs[match.awayTeamId];
    
    if (!match.homeStats || !match.awayStats) return null;

    return (
        <div className="mt-6 border-t border-gray-700 pt-4">
            <h4 className="text-lg font-bold text-white mb-4">Match Statistics</h4>
            <div className="bg-gray-700/50 p-4 rounded-lg">
                 <div className="flex justify-between items-center mb-4 font-bold text-center">
                    <span className="w-2/5 text-right">{homeTeam.name}</span>
                    <span className="w-1/5">vs</span>
                    <span className="w-2/5 text-left">{awayTeam.name}</span>
                </div>
                <div className="space-y-4">
                    <GraphicalStatBar label="Possession" homeValue={match.homeStats.possession} awayValue={match.awayStats.possession} isPercentage />
                    <GraphicalStatBar label="Shots" homeValue={match.homeStats.shots} awayValue={match.awayStats.shots} />
                    <GraphicalStatBar label="On Target" homeValue={match.homeStats.shotsOnTarget} awayValue={match.awayStats.shotsOnTarget} />
                    <GraphicalStatBar label="xG" homeValue={match.homeStats.xG} awayValue={match.awayStats.xG} isXG />
                    <GraphicalStatBar label="Tackles" homeValue={match.homeStats.tackles} awayValue={match.awayStats.tackles} />
                    <GraphicalStatBar label="Fouls" homeValue={match.homeStats.fouls} awayValue={match.awayStats.fouls} />
                </div>
            </div>
        </div>
    );
};

interface NewsViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}

const NewsView: React.FC<NewsViewProps> = ({ gameState, dispatch }) => {
    const [selectedNewsId, setSelectedNewsId] = useState<number | null>(
        gameState.news.length > 0 ? gameState.news[0].id : null
    );

    const handleSelectNews = (item: NewsItem) => {
        setSelectedNewsId(item.id);
        if (!item.isRead) {
            dispatch({ type: 'MARK_NEWS_AS_READ', payload: { newsItemId: item.id } });
        }
    };

    const selectedNewsItem = gameState.news.find(item => item.id === selectedNewsId);

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl h-full flex flex-col md:flex-row">
            <div className="w-full md:w-1/3 border-r border-gray-700 flex flex-col">
                <h2 className="text-2xl font-bold text-white p-4 border-b border-gray-700">Inbox</h2>
                <div className="overflow-y-auto flex-1">
                    {gameState.news.map(item => (
                        <div
                            key={item.id}
                            onClick={() => handleSelectNews(item)}
                            className={`p-4 cursor-pointer border-b border-gray-700 ${selectedNewsId === item.id ? 'bg-gray-900' : 'hover:bg-gray-700'} ${!item.isRead ? 'font-bold' : 'text-gray-400'}`}
                        >
                            <p className="text-sm text-gray-500">{item.date.toLocaleDateString()}</p>
                            <p className={`${!item.isRead ? 'text-white' : ''}`}>{item.headline}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-full md:w-2/3 p-6 overflow-y-auto">
                {selectedNewsItem ? (
                    <div>
                        <h3 className="text-2xl font-bold text-green-400 mb-2">{selectedNewsItem.headline}</h3>
                        <p className="text-sm text-gray-500 mb-4">{selectedNewsItem.date.toDateString()}</p>
                        <div className="prose prose-invert prose-p:text-gray-300 whitespace-pre-wrap">
                            {selectedNewsItem.content}
                        </div>
                         {selectedNewsItem.matchStatsSummary && (
                            <MatchStatsSummary match={selectedNewsItem.matchStatsSummary} clubs={gameState.clubs} />
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">Select a news item to read.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewsView;