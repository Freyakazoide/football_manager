import { Match, Club, Player } from '../types';

const templates = {
    dominantWin: [
        { headline: `Clinical ${'winner'} Dismantle ${'loser'}`, content: `${'winner'} put on a show today, dominating possession with ${'winPossession'}% of the ball and peppering the goal with ${'winShots'} shots. The final score of ${'score'} doesn't flatter them, as they thoroughly deserved the victory based on an expected goals tally of ${'winXG'} to ${'loser'}'s ${'loseXG'}.` },
        { headline: `${'winner'} Cruise to ${'score'} Victory`, content: `It was a comfortable day at the office for ${'winner'}. They controlled the tempo from start to finish, and the ${'score'} victory was a fair reflection of their superiority on the pitch.`}
    ],
    smashAndGrab: [
        { headline: `Late Drama Sees ${'winner'} Steal the Points`, content: `In a classic smash-and-grab performance, ${'winner'} weathered a storm of ${'loseShots'} shots from ${'loser'} to snatch a ${'score'} victory. Despite having only ${'winPossession'}% possession, their clinical finishing made all the difference.` },
    ],
    hardFoughtWin: [
        { headline: `${'winner'} Edge Out ${'loser'} in Tense Affair`, content: `A hard-fought battle saw ${'winner'} emerge with a narrow ${'score'} win. It was a game of fine margins, but a moment of quality decided the contest.` }
    ],
    disappointingLoss: [
         { headline: `Frustration for ${'loser'} in ${'score'} Defeat`, content: `It's a tough result to take for ${'loser'}. Despite creating several good chances (totaling ${'loseXG'} xG), they couldn't find the cutting edge and ultimately fell to a ${'score'} defeat against ${'winner'}.` }
    ],
    thrillingDraw: [
        { headline: `All Square in ${'score'} Thriller`, content: `What a match! Both ${'home'} and ${'away'} left it all on the pitch in a pulsating ${'score'} draw. A back-and-forth contest saw both sides have chances to win it.` }
    ],
    scoreDraw: [
        { headline: `Points Shared as ${'home'} and ${'away'} Draw ${'score'}`, content: `It's all square between ${'home'} and ${'away'} as the match ends ${'score'}. Both teams had their moments but neither could find a winning goal.` }
    ],
    scorelessDraw: [
        { headline: `Stalemate as ${'home'} and ${'away'} Play Out Scoreless Draw`, content: `A tactical battle ended in a stalemate today, with neither side able to break the deadlock. The match finished 0-0, a result that was probably fair given the lack of clear-cut chances for either team.`}
    ]
};

const pickRandomTemplate = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];


export const generateNarrativeReport = (match: Match, playerClubId: number | null, clubs: Record<number, Club>, players: Record<number, Player>): { headline: string, content: string, matchStatsSummary: Match } => {
    const homeTeam = clubs[match.homeTeamId];
    const awayTeam = clubs[match.awayTeamId];
    const { homeScore, awayScore, homeStats, awayStats } = match;

    if (homeScore === undefined || awayScore === undefined || !homeStats || !awayStats) {
        return { headline: "Match Report", content: "Match details are unavailable.", matchStatsSummary: match };
    }

    const playerTeam = playerClubId === homeTeam.id ? homeTeam : playerClubId === awayTeam.id ? awayTeam : null;
    
    // Determine the result from the player's perspective
    let resultType: 'win' | 'draw' | 'loss' | 'neutral' = 'neutral';
    if (playerTeam) {
        if ((playerTeam.id === homeTeam.id && homeScore > awayScore) || (playerTeam.id === awayTeam.id && awayScore > homeScore)) {
            resultType = 'win';
        } else if (homeScore === awayScore) {
            resultType = 'draw';
        } else {
            resultType = 'loss';
        }
    }

    let templateKey: keyof typeof templates = 'hardFoughtWin'; // default
    const scoreDiff = Math.abs(homeScore - awayScore);

    if (resultType === 'win') {
        const playerIsHome = playerClubId === homeTeam.id;
        const playerStats = playerIsHome ? homeStats : awayStats;
        const opponentStats = playerIsHome ? awayStats : homeStats;
        if (scoreDiff >= 2 && playerStats.possession > 60) {
            templateKey = 'dominantWin';
        } else if (playerStats.possession < 45 && playerStats.shots < opponentStats.shots) {
            templateKey = 'smashAndGrab';
        } else {
            templateKey = 'hardFoughtWin';
        }
    } else if (resultType === 'loss') {
        templateKey = 'disappointingLoss';
    } else if (resultType === 'draw') {
        if (homeScore === 0) {
            templateKey = 'scorelessDraw';
        } else if (homeScore >= 2) {
            templateKey = 'thrillingDraw';
        } else { // 1-1
            templateKey = 'scoreDraw';
        }
    } else { // Neutral match
        if (homeScore === awayScore) {
             if (homeScore === 0) templateKey = 'scorelessDraw';
             else if (homeScore >= 2) templateKey = 'thrillingDraw';
             else templateKey = 'scoreDraw';
        } else {
            templateKey = 'hardFoughtWin';
        }
    }
    
    const template = pickRandomTemplate(templates[templateKey]);
    
    const winner = homeScore > awayScore ? homeTeam : awayTeam;
    const loser = homeScore < awayScore ? homeTeam : awayTeam;
    
    const replacements: Record<string, any> = {
        home: homeTeam.name,
        away: awayTeam.name,
        score: `${homeScore}-${awayScore}`,
        winner: winner.name,
        loser: loser.name,
        winPossession: Math.round(winner.id === homeTeam.id ? homeStats.possession : awayStats.possession),
        winShots: winner.id === homeTeam.id ? homeStats.shots : awayStats.shots,
        winXG: (winner.id === homeTeam.id ? homeStats.xG : awayStats.xG).toFixed(2),
        loseShots: loser.id === homeTeam.id ? homeStats.shots : awayStats.shots,
        loseXG: (loser.id === homeTeam.id ? homeStats.xG : awayStats.xG).toFixed(2),
    };

    const finalHeadline = template.headline.replace(/\${(.*?)}/g, (_, key) => replacements[key]);
    let finalContent = template.content.replace(/\${(.*?)}/g, (_, key) => replacements[key]);

    // Add disciplinary and injury events
    let eventsContent = '';
    const yellowCards: Record<number, number> = {};
    const redCards: number[] = [];
    
    if (match.disciplinaryEvents) {
        match.disciplinaryEvents.forEach(event => {
            if (event.type === 'yellow') {
                yellowCards[event.playerId] = (yellowCards[event.playerId] || 0) + 1;
            } else if (event.type === 'red') {
                redCards.push(event.playerId);
            }
        });
    }

    if (Object.keys(yellowCards).length > 0) {
        eventsContent += `Yellow Cards: ${Object.keys(yellowCards).map(id => `${players[Number(id)].name} (${clubs[players[Number(id)].clubId].name})`).join(', ')}\n`;
    }
    if (redCards.length > 0) {
        eventsContent += `Red Cards: ${redCards.map(id => `${players[id].name} (${clubs[players[id].clubId].name})`).join(', ')}\n`;
    }
    if (match.injuryEvents && match.injuryEvents.length > 0) {
         match.injuryEvents.forEach(event => {
            const matchDate = new Date(match.date);
            const returnDate = new Date(event.returnDate);
            const diffTime = Math.abs(returnDate.getTime() - matchDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const durationText = diffDays > 10 ? `approx. ${Math.round(diffDays/7)} weeks` : `approx. ${diffDays} days`;
            eventsContent += `Injury: ${players[event.playerId].name} (${clubs[players[event.playerId].clubId].name}) is expected to be out for ${durationText}.\n`;
        });
    }

    if (eventsContent) {
        finalContent += `\n\n---\nDisciplinary & Injuries:\n${eventsContent}`;
    }
    
    return { headline: finalHeadline, content: finalContent, matchStatsSummary: match };
};