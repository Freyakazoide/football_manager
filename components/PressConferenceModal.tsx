import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { GameState, Match, Player } from '../types';
import { Action } from '../services/reducerTypes';

interface PressConferenceModalProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}

type Tone = 'Calm' | 'Passionate' | 'Cautious' | 'Aggressive';

const getOverallRating = (player: Player): number => {
    const attrs = player.attributes;
    const keyAttrs = [ attrs.passing, attrs.dribbling, attrs.shooting, attrs.tackling, attrs.pace, attrs.positioning, attrs.workRate, attrs.stamina ];
    return keyAttrs.reduce((a, b) => a + b, 0) / keyAttrs.length;
};

const PressConferenceModal: React.FC<PressConferenceModalProps> = ({ gameState, dispatch }) => {
    const { pressConference } = gameState;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [answer, setAnswer] = useState('');
    const [tone, setTone] = useState<Tone>('Calm');

    const match = useMemo(() => 
        gameState.schedule.find(m => m.id === pressConference?.matchId)
    , [pressConference, gameState.schedule]);

    const getForm = (clubId: number, schedule: Match[]): string => {
        const recentMatches = schedule
            .filter(m => (m.homeTeamId === clubId || m.awayTeamId === clubId) && m.homeScore !== undefined)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
        return recentMatches.map(match => {
            const isHome = match.homeTeamId === clubId;
            const scoreDiff = isHome ? match.homeScore! - match.awayScore! : match.awayScore! - match.homeScore!;
            if (scoreDiff > 0) return 'W';
            if (scoreDiff < 0) return 'L';
            return 'D';
        }).join('') || 'N/A';
    };

    const getStarPlayer = (clubId: number, players: Record<number, Player>): string => {
        const clubPlayers = Object.values(players).filter(p => p.clubId === clubId);
        if (clubPlayers.length === 0) return 'N/A';
        return clubPlayers.sort((a,b) => getOverallRating(b) - getOverallRating(a))[0]?.name || 'N/A';
    };

    useEffect(() => {
        if (!match || !pressConference || pressConference.questions.length > 0) return;

        const generateQuestions = async () => {
            setLoading(true);
            setError(null);
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                
                const playerClub = gameState.clubs[gameState.playerClubId!];
                const opponent = gameState.clubs[match.homeTeamId === playerClub.id ? match.awayTeamId : match.homeTeamId];
                
                const prompt = `You are a sports journalist in a football management game. Generate 3 press conference questions for a manager before their next match.
                - Manager's Team: ${playerClub.name} (Form: ${getForm(playerClub.id, gameState.schedule)})
                - Opponent: ${opponent.name} (Form: ${getForm(opponent.id, gameState.schedule)})
                - Star Players: ${getStarPlayer(playerClub.id, gameState.players)} vs ${getStarPlayer(opponent.id, gameState.players)}
                - Location: ${match.homeTeamId === playerClub.id ? 'Home' : 'Away'}
                Generate 3 distinct, challenging, and interesting questions based on this context. Format the output as a JSON array of strings, like ["question 1", "question 2", "question 3"].`;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });
                
                const questionsText = response.text.trim().replace(/```json|```/g, '');
                const questions = JSON.parse(questionsText);

                if (Array.isArray(questions) && questions.length > 0) {
                    dispatch({ type: 'SET_PRESS_CONFERENCE_QUESTIONS', payload: { questions } });
                } else {
                    throw new Error("AI did not return valid questions.");
                }

            } catch (e) {
                console.error("Error generating questions:", e);
                setError("Failed to generate questions. Please try again later.");
                // Fallback questions
                dispatch({ type: 'SET_PRESS_CONFERENCE_QUESTIONS', payload: { questions: ["What's your assessment of the upcoming opposition?", "How is the mood in the camp ahead of the game?", "Do you have any team news you can share?"] } });
            } finally {
                setLoading(false);
            }
        };

        generateQuestions();
    }, [match, pressConference, dispatch, gameState]);

     useEffect(() => {
        if (pressConference && pressConference.currentQuestionIndex >= pressConference.questions.length && pressConference.questions.length > 0) {
            dispatch({ type: 'END_PRESS_CONFERENCE' });
        }
    }, [pressConference, dispatch]);

    const handleSubmit = async () => {
        if (!pressConference || !answer) return;
        const currentQuestion = pressConference.questions[pressConference.currentQuestionIndex];
        setLoading(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            const prompt = `You are the game engine for a football management simulation. A manager was asked: "${currentQuestion}". They responded in a "${tone}" tone, saying: "${answer}". 
            Based on this, generate a brief narrative outcome and determine the impact on their team's morale. 
            - If the response is positive, inspiring, or confident, morale effect should be positive.
            - If the response is negative, deflective, or aggressive, morale effect might be negative or neutral.
            - The tone is very important. An "Aggressive" tone should have riskier outcomes. A "Calm" tone should be safer.
            Return a JSON object with two keys: "narrative" (a string, max 30 words, describing the media's reaction) and "teamMoraleEffect" (a number between -5 and 5). Example: {"narrative": "The manager's confident words have clearly inspired the dressing room.", "teamMoraleEffect": 3}`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                 config: { responseMimeType: 'application/json' },
            });
            const resultText = response.text.trim().replace(/```json|```/g, '');
            const result = JSON.parse(resultText);

            dispatch({
                type: 'SUBMIT_PRESS_CONFERENCE_ANSWER',
                payload: {
                    question: currentQuestion,
                    answer,
                    narrative: result.narrative,
                    teamMoraleEffect: result.teamMoraleEffect,
                }
            });
            setAnswer('');
            setTone('Calm');

        } catch (e) {
            console.error("Error processing answer:", e);
            setError("There was an issue processing your response.");
        } finally {
            setLoading(false);
        }
    };

    if (!pressConference || !match) return null;

    const currentQuestion = pressConference.questions[pressConference.currentQuestionIndex];

    const renderContent = () => {
        if (loading && pressConference.questions.length === 0) {
            return <div className="text-center p-8 animate-pulse">Generating questions from the media...</div>;
        }
        if (error) {
            return <div className="text-center p-8 text-red-400">{error}</div>;
        }
        if (!currentQuestion) {
            return <div className="text-center p-8">Preparing for press conference...</div>;
        }

        return (
            <>
                <div className="p-6 overflow-y-auto flex-1">
                    <p className="text-sm text-gray-400 mb-4">Question {pressConference.currentQuestionIndex + 1} of {pressConference.questions.length}</p>
                    <p className="text-xl italic text-gray-300 mb-6">"{currentQuestion}"</p>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-400 mb-2">Tone</label>
                        <div className="flex gap-2">
                            {(['Calm', 'Passionate', 'Cautious', 'Aggressive'] as Tone[]).map(t => (
                                <button key={t} onClick={() => setTone(t)} className={`px-3 py-1 text-sm rounded-full transition-colors ${tone === t ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Your Response</label>
                        <textarea
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                            className="w-full bg-gray-900 p-3 rounded h-32 resize-none"
                            placeholder="Type your answer here..."
                            disabled={loading}
                        />
                    </div>
                </div>
                 <div className="p-6 border-t border-gray-700">
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !answer}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Thinking...' : 'Submit Answer'}
                    </button>
                </div>
            </>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 text-center border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-green-400">Pre-Match Press Conference</h2>
                    <p className="text-gray-400">vs. {gameState.clubs[match.homeTeamId === gameState.playerClubId ? match.awayTeamId : match.homeTeamId].name}</p>
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default PressConferenceModal;
