import { GameState, Player, Tactics, Match, MatchDayInfo, LiveMatchState, Mentality, PlayerRole, PlayerInstructions, TeamTrainingFocus, IndividualTrainingFocus, ScoutingAssignment, TransferOffer, ContractOffer, DepartmentType, BoardRequestType, LoanOffer, SquadStatus } from '../types';

export type Action =
    // FIX: Removed 'pressConference' from Omit as it's no longer a property of GameState.
    | { type: 'INITIALIZE_GAME'; payload: Omit<GameState, 'playerClubId' | 'currentDate' | 'liveMatch' | 'news' | 'nextNewsId' | 'matchDayFixtures' | 'matchDayResults' | 'matchStartError' | 'seasonReviewData' | 'transferNegotiations' | 'nextNegotiationId'> }
    | { type: 'SELECT_PLAYER_CLUB'; payload: number }
    | { type: 'ADVANCE_DAY' }
    | { type: 'UPDATE_TACTICS'; payload: Tactics }
    | { type: 'MARK_NEWS_AS_READ'; payload: { newsItemId: number } }
    // New Match Flow Actions
    | { type: 'CLEAR_MATCH_DAY_FIXTURES' }
    | { type: 'SET_MATCH_DAY_FIXTURES'; payload: { playerMatch: MatchDayInfo; aiMatches: Match[] } }
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
    | { type: 'END_MATCH' }
    // Player & Contract Management
    | { type: 'PLAYER_INTERACTION'; payload: { playerId: number; interactionType: 'praise' | 'criticize' | 'promise' } }
    | { type: 'PROMOTE_YOUTH_PLAYER'; payload: { playerId: number } }
    | { type: 'UPDATE_PLAYER_SQUAD_STATUS'; payload: { playerId: number, squadStatus: SquadStatus } }
    // Training & Scouting
    | { type: 'UPDATE_TRAINING_SETTINGS'; payload: { teamFocus: TeamTrainingFocus, individualFocuses: Record<number, IndividualTrainingFocus> } }
    | { type: 'CREATE_SCOUTING_ASSIGNMENT'; payload: Omit<ScoutingAssignment, 'id' | 'isComplete' | 'reportPlayerIds'> }
    // Staff & Finances
    | { type: 'HIRE_STAFF'; payload: { staffId: number, department: DepartmentType } }
    | { type: 'FIRE_STAFF'; payload: { staffId: number } }
    | { type: 'UPGRADE_DEPARTMENT'; payload: { department: DepartmentType } }
    | { type: 'ADJUST_BUDGETS'; payload: { transferBudget: number, wageBudget: number } }
    | { type: 'REQUEST_LOAN'; payload: { bankId: number; amount: number; termMonths: number } }
    | { type: 'REPAY_LOAN'; payload: { loanId: number } }
    // Season Logic
    | { type: 'START_NEW_SEASON' }
    // New Transfer Negotiation Actions
    | { type: 'TOGGLE_PLAYER_TRANSFER_LIST_STATUS'; payload: { playerId: number } }
    | { type: 'OFFER_PLAYER_TO_CLUBS'; payload: { playerId: number } }
    | { type: 'START_TRANSFER_NEGOTIATION'; payload: { playerId: number } }
    | { type: 'START_LOAN_NEGOTIATION'; payload: { playerId: number } }
    | { type: 'START_RENEWAL_NEGOTIATION'; payload: { playerId: number } }
    | { type: 'SUBMIT_CLUB_OFFER'; payload: { negotiationId: number; offer: TransferOffer | LoanOffer } }
    | { type: 'ACCEPT_CLUB_COUNTER'; payload: { negotiationId: number } }
    | { type: 'SUBMIT_AGENT_OFFER'; payload: { negotiationId: number; offer: ContractOffer } }
    | { type: 'ACCEPT_AGENT_COUNTER'; payload: { negotiationId: number } }
    | { type: 'CANCEL_NEGOTIATION'; payload: { negotiationId: number } }
    | { type: 'PROCESS_AI_NEGOTIATION_RESPONSE'; payload: { negotiationId: number } }
    // Actions for selling players
    | { type: 'ACCEPT_INCOMING_CLUB_OFFER'; payload: { negotiationId: number } }
    | { type: 'SUBMIT_COUNTER_OFFER'; payload: { negotiationId: number; offer: TransferOffer } }
    // Board Interaction
    | { type: 'MAKE_BOARD_REQUEST'; payload: { requestType: BoardRequestType } }
    ;