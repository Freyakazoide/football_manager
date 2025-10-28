import { Player, Tactics, PlayerInstructions, ShootingInstruction, PassingInstruction, DribblingInstruction, TacklingInstruction, LineupPlayer, PlayerRole, CrossingInstruction, PositioningInstruction, PressingInstruction, MarkingInstruction } from '../types';

const defaultPositions442: { position: { x: number, y: number }, role: PlayerRole }[] = [
    // GK
    { position: { x: 50, y: 95 }, role: 'GK' },
    // DEF
    { position: { x: 20, y: 75 }, role: 'LB' },
    { position: { x: 40, y: 78 }, role: 'CB' },
    { position: { x: 60, y: 78 }, role: 'CB' },
    { position: { x: 80, y: 75 }, role: 'RB' },
    // MID
    { position: { x: 20, y: 50 }, role: 'LM' },
    { position: { x: 40, y: 55 }, role: 'CM' },
    { position: { x: 60, y: 55 }, role: 'CM' },
    { position: { x: 80, y: 50 }, role: 'RM' },
    // FWD
    { position: { x: 40, y: 25 }, role: 'ST' },
    { position: { x: 60, y: 25 }, role: 'ST' },
];

const getOverallRating = (p: Player) => {
    const attrs = p.attributes;
    const keyAttrs = attrs.shooting + attrs.passing + attrs.tackling + attrs.dribbling + attrs.pace + attrs.positioning;
    return keyAttrs / 6;
};

// FIX: Import missing instruction enums to resolve 'Cannot find name' errors.
const createDefaultInstructions = (): PlayerInstructions => ({
    shooting: ShootingInstruction.Normal,
    passing: PassingInstruction.Normal,
    dribbling: DribblingInstruction.Normal,
    crossing: CrossingInstruction.Normal,
    positioning: PositioningInstruction.Normal,
    tackling: TacklingInstruction.Normal,
    pressing: PressingInstruction.Normal,
    marking: MarkingInstruction.Normal,
});

export const generateAITactics = (clubPlayers: Player[]): Tactics => {
    // 1. Select Best XI based on positions for a 4-4-2
    const gks = clubPlayers.filter(p => p.position === 'GK').sort((a, b) => getOverallRating(b) - getOverallRating(a));
    const defs = clubPlayers.filter(p => p.position === 'DEF').sort((a, b) => getOverallRating(b) - getOverallRating(a));
    const mids = clubPlayers.filter(p => p.position === 'MID').sort((a, b) => getOverallRating(b) - getOverallRating(a));
    const fwds = clubPlayers.filter(p => p.position === 'FWD').sort((a, b) => getOverallRating(b) - getOverallRating(a));

    const lineupPlayers: Player[] = [
        ...gks.slice(0, 1),
        ...defs.slice(0, 4),
        ...mids.slice(0, 4),
        ...fwds.slice(0, 2),
    ];
    
    // Fill lineup if a position is short
    if (lineupPlayers.length < 11) {
        const remainingPlayers = clubPlayers.filter(p => !lineupPlayers.some(lp => lp.id === p.id)).sort((a, b) => getOverallRating(b) - getOverallRating(a));
        lineupPlayers.push(...remainingPlayers.slice(0, 11 - lineupPlayers.length));
    }
    
    const lineupIds = new Set(lineupPlayers.map(p => p.id));
    const benchPlayers = clubPlayers.filter(p => !lineupIds.has(p.id)).sort((a, b) => getOverallRating(b) - getOverallRating(a)).slice(0, 7);
    
    const lineup: (LineupPlayer | null)[] = lineupPlayers.map((player, index) => ({
        playerId: player.id,
        position: defaultPositions442[index]?.position || { x: 50, y: 50 },
        role: defaultPositions442[index]?.role || 'CM',
        instructions: createDefaultInstructions(),
    }));

    // 2. Assign special instructions based on standout attributes
    const bestShooter = lineupPlayers.reduce((best, p) => p.attributes.shooting > best.attributes.shooting ? p : best, lineupPlayers[0]);
    const bestPasser = lineupPlayers.reduce((best, p) => p.attributes.creativity > best.attributes.creativity ? p : best, lineupPlayers[0]);
    const bestDribbler = lineupPlayers.reduce((best, p) => p.attributes.dribbling > best.attributes.dribbling ? p : best, lineupPlayers[0]);
    const bestTackler = lineupPlayers.filter(p => p.position === 'DEF' || p.position === 'MID').reduce((best, p) => p.attributes.tackling > best.attributes.tackling ? p : best, lineupPlayers[0]);

    const setInstruction = (playerId: number, instruction: Partial<PlayerInstructions>) => {
        const lineupEntry = lineup.find(lp => lp?.playerId === playerId);
        if (lineupEntry) {
            lineupEntry.instructions = { ...lineupEntry.instructions, ...instruction };
        }
    };
    
    if (bestShooter) setInstruction(bestShooter.id, { shooting: ShootingInstruction.ShootMoreOften });
    if (bestPasser) setInstruction(bestPasser.id, { passing: PassingInstruction.Risky });
    if (bestDribbler) setInstruction(bestDribbler.id, { dribbling: DribblingInstruction.DribbleMore });
    if (bestTackler) setInstruction(bestTackler.id, { tackling: TacklingInstruction.Harder });

    return {
        mentality: 'Balanced',
        lineup,
        bench: benchPlayers.map(p => p.id),
    };
};