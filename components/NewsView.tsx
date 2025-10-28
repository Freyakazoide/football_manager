import React, { useState } from 'react';
import { GameState, NewsItem } from '../types';
import { Action } from '../services/reducerTypes';

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