import { GameState, Player, Tactics, Match, MatchDayInfo, LiveMatchState, Mentality, PlayerRole, PlayerInstructions } from '../types';

export type Action =
    | { type: 'INITIALIZE_GAME'; payload: Omit<GameState, 'playerClubId' | 'transferResult'| 'currentDate' | 'liveMatch' | 'news' | 'nextNewsId' | 'matchDayFixtures' | 'matchDayResults' | 'matchStartError'> }
    | { type: 'SELECT_PLAYER_CLUB'; payload: number }
    | { type: 'ADVANCE_DAY' }
    | { type: 'UPDATE_TACTICS'; payload: Tactics }
    | { type: 'MAKE_TRANSFER_OFFER'; payload: { player: Player; offerAmount: number } }
    | { type: 'CLEAR_TRANSFER_RESULT' }
    | { type: 'MARK_NEWS_AS_READ'; payload: { newsItemId: number } }
    // New Match Flow Actions
    | { type: 'CLEAR_MATCH_DAY_FIXTURES' }
    | { type: 'CLEAR_MATCH_RESULTS' }
    | { type: 'CLEAR_MATCH_START_ERROR' }
    // Match Engine Actions
    | { type: 'START_MATCH'; payload: MatchDayInfo }
    | { type: 'ADVANCE_MINUTE'; payload: { newState: LiveMatchState, newEvents: any[] } }
    | { type: 'PAUSE_MATCH' }
    | { type: 'RESUME_MATCH' }
    | { type: 'MAKE_SUBSTITUTION'; payload: { playerOutId: number, playerInId: number } }
    | { type: 'DISMISS_FORCED_SUBSTITUTION' }
    | { type: 'CHANGE_LIVE_TACTICS'; payload: { mentality: Mentality } }
    | { type: 'UPDATE_TEAM_INSTRUCTIONS'; payload: { shout: 'press_more' | 'hold_position' | 'attack_flanks' | 'short_passes' | 'go_direct' } }
    | { type: 'UPDATE_LIVE_PLAYER_POSITION'; payload: { playerId: number; position: { x: number; y: number }; role: PlayerRole } }
    | { type: 'UPDATE_LIVE_PLAYER_INSTRUCTIONS'; payload: { playerId: number; instructions: PlayerInstructions } }
    | { type: 'END_MATCH' };
