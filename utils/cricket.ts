import { Innings, BatsmanStats, BowlerStats, Match, OverSummary, Partnership, MVPCandidate } from '@/types/cricket';

export function createEmptyInnings(battingTeam: string, bowlingTeam: string): Innings {
    return {
        battingTeam,
        bowlingTeam,
        totalRuns: 0,
        totalWickets: 0,
        totalOvers: 0,
        totalBalls: 0,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
        ballLog: [],
        batsmen: [],
        bowlers: [],
        currentBatsmanId: '',
        nonStrikerId: '',
        currentBowlerId: '',
        isComplete: false,
    };
}

export function createBatsman(id: string, name: string): BatsmanStats {
    return {
        id,
        name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
    };
}

export function createBowler(id: string, name: string): BowlerStats {
    return {
        id,
        name,
        overs: 0,
        balls: 0,
        maidens: 0,
        runs: 0,
        wickets: 0,
        extras: 0,
    };
}

export function getOversString(balls: number): string {
    const overs = Math.floor(balls / 6);
    const remaining = balls % 6;
    return `${overs}.${remaining}`;
}

export function getStrikeRate(runs: number, balls: number): string {
    if (balls === 0) return '0.00';
    return ((runs / balls) * 100).toFixed(1);
}

export function getEconomyRate(runs: number, balls: number): string {
    if (balls === 0) return '0.00';
    return ((runs / balls) * 6).toFixed(1);
}

export function getRunRate(runs: number, balls: number): string {
    if (balls === 0) return '0.00';
    return ((runs / balls) * 6).toFixed(2);
}

export function getRequiredRunRate(target: number, currentRuns: number, ballsRemaining: number): string {
    if (ballsRemaining <= 0) return '0.00';
    const runsNeeded = target - currentRuns;
    return ((runsNeeded / ballsRemaining) * 6).toFixed(2);
}

export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function getOverByOverSummary(innings: Innings): OverSummary[] {
    const overs: OverSummary[] = [];
    let currentOver: OverSummary | null = null;
    let legalBallsInOver = 0;
    let overNumber = 0;

    for (const ball of innings.ballLog) {
        const isWide = ball.extraType === 'wide';
        const isNoBall = ball.extraType === 'no-ball';

        if (!currentOver) {
            const bowler = innings.bowlers.find(b => b.id === ball.bowlerId);
            currentOver = {
                overNumber: overNumber + 1,
                balls: [],
                runs: 0,
                wickets: 0,
                bowlerName: bowler?.name ?? 'Unknown',
            };
        }

        let display = '';
        if (ball.isWicket) {
            display = 'W';
        } else if (isWide) {
            display = ball.runs > 0 ? `${ball.runs}Wd` : 'Wd';
        } else if (isNoBall) {
            display = ball.runs > 0 ? `${ball.runs}Nb` : 'Nb';
        } else if (ball.extraType === 'bye') {
            display = `${ball.runs}B`;
        } else if (ball.extraType === 'leg-bye') {
            display = `${ball.runs}Lb`;
        } else {
            display = ball.runs.toString();
        }

        currentOver.balls.push(display);

        if (isWide || isNoBall) {
            currentOver.runs += ball.runs + 1;
        } else {
            currentOver.runs += ball.runs;
        }

        if (ball.isWicket) currentOver.wickets++;

        if (!isWide && !isNoBall) {
            legalBallsInOver++;
            if (legalBallsInOver === 6) {
                overs.push(currentOver);
                currentOver = null;
                legalBallsInOver = 0;
                overNumber++;
            }
        }
    }

    if (currentOver && currentOver.balls.length > 0) {
        overs.push(currentOver);
    }

    return overs;
}

export function calculatePartnership(innings: Innings): Partnership {
    let startIndex = 0;
    for (let i = innings.ballLog.length - 1; i >= 0; i--) {
        if (innings.ballLog[i].isWicket) {
            startIndex = i + 1;
            break;
        }
    }

    const partnershipBalls = innings.ballLog.slice(startIndex);
    let runs = 0;
    let balls = 0;

    for (const b of partnershipBalls) {
        const isWide = b.extraType === 'wide';
        const isNoBall = b.extraType === 'no-ball';
        runs += b.runs + (isWide || isNoBall ? 1 : 0);
        if (!isWide && !isNoBall) balls++;
    }

    const bat1 = innings.batsmen.find(b => b.id === innings.currentBatsmanId);
    const bat2 = innings.batsmen.find(b => b.id === innings.nonStrikerId);

    return {
        runs,
        balls,
        batsman1Name: bat1?.name ?? '',
        batsman2Name: bat2?.name ?? '',
    };
}

export function calculateMVP(match: Match): MVPCandidate | null {
    if (match.status !== 'completed') return null;

    const scores: Record<string, MVPCandidate> = {};

    match.innings.forEach(inn => {
        if (!inn) return;
        inn.batsmen.forEach(b => {
            if (b.balls === 0 && b.runs === 0) return;
            const key = b.name.toLowerCase();
            if (!scores[key]) scores[key] = { name: b.name, score: 0, runs: 0, wickets: 0, fours: 0, sixes: 0 };
            scores[key].runs += b.runs;
            scores[key].fours += b.fours;
            scores[key].sixes += b.sixes;
            scores[key].score += b.runs;
            scores[key].score += b.fours * 1;
            scores[key].score += b.sixes * 2;
            if (b.balls > 0 && (b.runs / b.balls) * 100 > 150) scores[key].score += 10;
            if (b.runs >= 50) scores[key].score += 20;
            else if (b.runs >= 30) scores[key].score += 10;
        });
        inn.bowlers.forEach(b => {
            if (b.overs === 0 && b.balls === 0) return;
            const key = b.name.toLowerCase();
            if (!scores[key]) scores[key] = { name: b.name, score: 0, runs: 0, wickets: 0, fours: 0, sixes: 0 };
            scores[key].wickets += b.wickets;
            scores[key].score += b.wickets * 25;
            const totalBalls = b.overs * 6 + b.balls;
            if (totalBalls > 0) {
                const eco = (b.runs / totalBalls) * 6;
                if (eco < 6) scores[key].score += 15;
                else if (eco < 8) scores[key].score += 5;
            }
            scores[key].score += b.maidens * 10;
            if (b.wickets >= 3) scores[key].score += 20;
        });
    });

    const sorted = Object.values(scores).sort((a, b) => b.score - a.score);
    return sorted.length > 0 ? sorted[0] : null;
}

export function calculateDLSTarget(
    team1Score: number,
    team1OversUsed: number,
    maxOvers: number,
    team2OversAvailable: number,
    team2WicketsLost: number,
): number {
    const wicketsInHand = Math.max(0, 10 - team2WicketsLost);
    const getResource = (oversAvail: number, wickets: number): number => {
        const overFraction = Math.min(oversAvail / maxOvers, 1);
        const wicketFactor = wickets / 10;
        return overFraction * (0.1 + 0.9 * wicketFactor) * 100;
    };

    const team1Resource = getResource(team1OversUsed, 10);
    const team2Resource = getResource(team2OversAvailable, wicketsInHand);

    if (team1Resource === 0) return team1Score + 1;

    const ratio = team2Resource / team1Resource;
    const target = Math.round(team1Score * ratio) + 1;
    return Math.max(target, 1);
}

export function exportMatchCSV(match: Match): string {
    let csv = `Match Summary\n`;
    csv += `Teams,${match.team1} vs ${match.team2}\n`;
    csv += `Date,${formatDate(match.date)}\n`;
    csv += `Venue,${match.venue || 'N/A'}\n`;
    csv += `Overs,${match.totalOvers}\n`;
    csv += `Toss,${match.tossWinner} elected to ${match.tossChoice}\n`;
    csv += `Result,${match.result || 'In Progress'}\n`;
    csv += `MVP,${match.mvp || 'N/A'}\n\n`;

    match.innings.forEach((inn, idx) => {
        if (!inn) return;
        csv += `Innings ${idx + 1} - ${inn.battingTeam}\n`;
        csv += `Total: ${inn.totalRuns}/${inn.totalWickets} (${getOversString(inn.totalBalls)} overs)\n\n`;

        csv += `Batter,Runs,Balls,4s,6s,SR,Dismissal\n`;
        inn.batsmen.forEach(b => {
            if (b.balls > 0 || b.runs > 0 || b.isOut) {
                const dismissal = b.isOut ? `${b.howOut}${b.bowlerName ? ' b ' + b.bowlerName : ''}` : 'not out';
                csv += `${b.name},${b.runs},${b.balls},${b.fours},${b.sixes},${getStrikeRate(b.runs, b.balls)},${dismissal}\n`;
            }
        });
        csv += `Extras,${inn.extras.total},,,,,"Wd ${inn.extras.wides} Nb ${inn.extras.noBalls} B ${inn.extras.byes} Lb ${inn.extras.legByes}"\n\n`;

        csv += `Bowler,Overs,Maidens,Runs,Wickets,Economy\n`;
        inn.bowlers.forEach(b => {
            if (b.overs > 0 || b.balls > 0) {
                csv += `${b.name},${b.overs}.${b.balls},${b.maidens},${b.runs},${b.wickets},${getEconomyRate(b.runs, b.overs * 6 + b.balls)}\n`;
            }
        });
        csv += `\n`;
    });

    if (match.notes) {
        csv += `Notes\n"${match.notes}"\n`;
    }

    return csv;
}

export function getPhaseStats(innings: Innings, maxOvers: number): { powerplay: { runs: number; wickets: number; overs: string }; middle: { runs: number; wickets: number; overs: string }; death: { runs: number; wickets: number; overs: string } } {
    const ppEnd = Math.min(6, maxOvers);
    const deathStart = Math.max(ppEnd, maxOvers - 4);

    let ppRuns = 0, ppWickets = 0, ppBalls = 0;
    let midRuns = 0, midWickets = 0, midBalls = 0;
    let deathRuns = 0, deathWickets = 0, deathBalls = 0;

    let legalBalls = 0;

    for (const ball of innings.ballLog) {
        const isWide = ball.extraType === 'wide';
        const isNoBall = ball.extraType === 'no-ball';
        const currentOver = Math.floor(legalBalls / 6);
        const totalRuns = ball.runs + (isWide || isNoBall ? 1 : 0);

        if (currentOver < ppEnd) {
            ppRuns += totalRuns;
            if (ball.isWicket) ppWickets++;
            if (!isWide && !isNoBall) ppBalls++;
        } else if (currentOver >= deathStart) {
            deathRuns += totalRuns;
            if (ball.isWicket) deathWickets++;
            if (!isWide && !isNoBall) deathBalls++;
        } else {
            midRuns += totalRuns;
            if (ball.isWicket) midWickets++;
            if (!isWide && !isNoBall) midBalls++;
        }

        if (!isWide && !isNoBall) {
            legalBalls++;
        }
    }

    return {
        powerplay: { runs: ppRuns, wickets: ppWickets, overs: getOversString(ppBalls) },
        middle: { runs: midRuns, wickets: midWickets, overs: getOversString(midBalls) },
        death: { runs: deathRuns, wickets: deathWickets, overs: getOversString(deathBalls) },
    };
}

export function getBowlerSpells(innings: Innings, bowlerId: string): { overStart: number; overEnd: number; runs: number; wickets: number; balls: number }[] {
    const spells: { overStart: number; overEnd: number; runs: number; wickets: number; balls: number }[] = [];
    let currentSpell: { overStart: number; overEnd: number; runs: number; wickets: number; balls: number } | null = null;
    let legalBalls = 0;
    let currentOverNum = 0;
    let lastBowlerOver = -2;

    for (const ball of innings.ballLog) {
        const isWide = ball.extraType === 'wide';
        const isNoBall = ball.extraType === 'no-ball';

        if (ball.bowlerId === bowlerId) {
            if (!currentSpell || currentOverNum > lastBowlerOver + 1) {
                if (currentSpell) spells.push(currentSpell);
                currentSpell = {
                    overStart: currentOverNum + 1,
                    overEnd: currentOverNum + 1,
                    runs: 0,
                    wickets: 0,
                    balls: 0,
                };
            }

            currentSpell.overEnd = currentOverNum + 1;

            if (isWide || isNoBall) {
                currentSpell.runs += ball.runs + 1;
            } else {
                currentSpell.runs += ball.runs;
                currentSpell.balls++;
            }

            if (ball.isWicket) currentSpell.wickets++;
            lastBowlerOver = currentOverNum;
        }

        if (!isWide && !isNoBall) {
            legalBalls++;
            if (legalBalls % 6 === 0) {
                currentOverNum++;
            }
        }
    }

    if (currentSpell) spells.push(currentSpell);
    return spells;
}
