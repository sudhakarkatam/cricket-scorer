export type BallOutcome = 'dot' | '1' | '2' | '3' | '4' | '6' | 'wide' | 'no-ball' | 'bye' | 'leg-bye' | 'wicket';

export type ShotZone = 'off' | 'cover' | 'straight' | 'midwicket' | 'leg' | 'fine';

export interface BallEntry {
    id: string;
    over: number;
    ball: number;
    runs: number;
    extras: number;
    extraType?: 'wide' | 'no-ball' | 'bye' | 'leg-bye';
    isWicket: boolean;
    wicketType?: string;
    batsmanId: string;
    bowlerId: string;
    outBatsmanId?: string;
    timestamp: number;
    shotZone?: ShotZone;
}

export interface BatsmanStats {
    id: string;
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    isOut: boolean;
    howOut?: string;
    bowlerName?: string;
}

export interface BowlerStats {
    id: string;
    name: string;
    overs: number;
    balls: number;
    maidens: number;
    runs: number;
    wickets: number;
    extras: number;
}

export interface Innings {
    battingTeam: string;
    bowlingTeam: string;
    totalRuns: number;
    totalWickets: number;
    totalOvers: number;
    totalBalls: number;
    extras: {
        wides: number;
        noBalls: number;
        byes: number;
        legByes: number;
        total: number;
    };
    ballLog: BallEntry[];
    batsmen: BatsmanStats[];
    bowlers: BowlerStats[];
    currentBatsmanId: string;
    nonStrikerId: string;
    currentBowlerId: string;
    isComplete: boolean;
}

export interface Match {
    id: string;
    team1: string;
    team2: string;
    totalOvers: number;
    tossWinner: string;
    tossChoice: 'bat' | 'bowl';
    venue?: string;
    date: string;
    innings: [Innings, Innings?];
    currentInnings: 0 | 1;
    status: 'live' | 'completed' | 'abandoned';
    result?: string;
    notes?: string;
    mvp?: string;
    createdAt: number;
}

export interface Player {
    id: string;
    name: string;
    team?: string;
}

export interface SavedPlayer {
    id: string;
    name: string;
    team?: string;
    matchesPlayed: number;
    totalRuns: number;
    totalBalls: number;
    totalWickets: number;
    totalRunsConceded: number;
    totalBallsBowled: number;
    highestScore: number;
    bestBowling: string;
    createdAt: number;
}

export interface TeamRecord {
    name: string;
    matchesPlayed: number;
    wins: number;
    losses: number;
    ties: number;
    abandoned: number;
    totalRuns: number;
    totalWickets: number;
}

export interface TeamRoster {
    id: string;
    name: string;
    players: string[];
    createdAt: number;
}

export interface OverSummary {
    overNumber: number;
    balls: string[];
    runs: number;
    wickets: number;
    bowlerName: string;
}

export interface Partnership {
    runs: number;
    balls: number;
    batsman1Name: string;
    batsman2Name: string;
}

export interface HeadToHead {
    totalPlayed: number;
    team1Wins: number;
    team2Wins: number;
    ties: number;
    noResults: number;
    matches: Match[];
}

export interface MVPCandidate {
    name: string;
    score: number;
    runs: number;
    wickets: number;
    fours: number;
    sixes: number;
}

export interface PlayerInningsRecord {
    matchId: string;
    matchDate: string;
    opponent: string;
    venue?: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    isOut: boolean;
    howOut?: string;
    strikeRate: string;
    wickets: number;
    runsConceded: number;
    oversBowled: string;
    economy: string;
}
