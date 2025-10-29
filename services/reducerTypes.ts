import { GameState, Player, Tactics, Match, MatchDayInfo, LiveMatchState, Mentality, PlayerRole } from '../types';

export type Action =
    | { type: 'INITIALIZE_GAME'; payload: Omit<GameState, 'playerClubId' | 'transferResult'| 'currentDate' | 'liveMatch' | 'news' | 'nextNewsId' | 'matchDayFixtures' | 'matchDayResults'> }
    | { type: 'SELECT_PLAYER_CLUB'; payload: number }
    | { type: 'ADVANCE_DAY' }
    | { type: 'UPDATE_TACTICS'; payload: Tactics }
    | { type: 'MAKE_TRANSFER_OFFER'; payload: { player: Player; offerAmount: number } }
    | { type: 'CLEAR_TRANSFER_RESULT' }
    | { type: 'MARK_NEWS_AS_READ'; payload: { newsItemId: number } }
    // New Match Flow Actions
    | { type: 'CLEAR_MATCH_DAY_FIXTURES' }
    | { type: 'CLEAR_MATCH_RESULTS' }
    // Match Engine Actions
    | { type: 'START_MATCH'; payload: MatchDayInfo }
    | { type: 'ADVANCE_MINUTE'; payload: { newState: LiveMatchState, newEvents: any[] } }
    | { type: 'PAUSE_MATCH' }
    | { type: 'RESUME_MATCH' }
    | { type: 'MAKE_SUBSTITUTION'; payload: { playerOutId: number, playerInId: number } }
    | { type: 'CHANGE_LIVE_TACTICS'; payload: { mentality: Mentality } }
    | { type: 'UPDATE_LIVE_PLAYER_POSITION'; payload: { playerId: number; position: { x: number; y: number }; role: PlayerRole } }
    | { type: 'END_MATCH' };
