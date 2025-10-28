import { GameState, Player, Tactics, Match, TransferResult, MatchDayInfo, LiveMatchState, Mentality } from '../types';

export type Action =
    | { type: 'INITIALIZE_GAME'; payload: Omit<GameState, 'playerClubId' | 'playerMatch' | 'transferResult'| 'currentDate' | 'liveMatch' | 'news' | 'nextNewsId'> }
    | { type: 'SELECT_PLAYER_CLUB'; payload: number }
    | { type: 'ADVANCE_DAY' }
    | { type: 'CLEAR_PLAYER_MATCH' }
    | { type: 'UPDATE_TACTICS'; payload: Tactics }
    | { type: 'MAKE_TRANSFER_OFFER'; payload: { player: Player; offerAmount: number } }
    | { type: 'CLEAR_TRANSFER_RESULT' }
    | { type: 'MARK_NEWS_AS_READ'; payload: { newsItemId: number } }
    // New Match Engine Actions
    | { type: 'START_MATCH'; payload: MatchDayInfo }
    | { type: 'ADVANCE_MINUTE'; payload: { newState: LiveMatchState, newEvents: any[] } }
    | { type: 'PAUSE_MATCH' }
    | { type: 'RESUME_MATCH' }
    | { type: 'MAKE_SUBSTITUTION'; payload: { playerOutId: number, playerInId: number } }
    | { type: 'CHANGE_LIVE_TACTICS'; payload: { mentality: Mentality } }
    | { type: 'END_MATCH' };