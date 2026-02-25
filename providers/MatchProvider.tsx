import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { Match, BallEntry, SavedPlayer, TeamRoster, HeadToHead, ShotZone, PlayerInningsRecord } from '@/types/cricket';
import { createEmptyInnings, createBatsman, createBowler, generateId, getOversString, getStrikeRate, getEconomyRate, calculateMVP, exportMatchCSV } from '@/utils/cricket';

const MATCHES_KEY = 'cricket_matches';
const PLAYERS_KEY = 'cricket_players';
const ROSTERS_KEY = 'cricket_rosters';

async function loadMatches(): Promise<Match[]> {
    try {
        const stored = await AsyncStorage.getItem(MATCHES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.log('Error loading matches:', e);
        return [];
    }
}

async function saveMatches(matches: Match[]): Promise<Match[]> {
    await AsyncStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
    return matches;
}

async function loadPlayers(): Promise<SavedPlayer[]> {
    try {
        const stored = await AsyncStorage.getItem(PLAYERS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.log('Error loading players:', e);
        return [];
    }
}

async function savePlayers(players: SavedPlayer[]): Promise<SavedPlayer[]> {
    await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
    return players;
}

async function loadRosters(): Promise<TeamRoster[]> {
    try {
        const stored = await AsyncStorage.getItem(ROSTERS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.log('Error loading rosters:', e);
        return [];
    }
}

async function saveRosters(rosters: TeamRoster[]): Promise<TeamRoster[]> {
    await AsyncStorage.setItem(ROSTERS_KEY, JSON.stringify(rosters));
    return rosters;
}

export const [MatchProvider, useMatches] = createContextHook(() => {
    const queryClient = useQueryClient();
    const [matches, setMatches] = useState<Match[]>([]);
    const [savedPlayers, setSavedPlayers] = useState<SavedPlayer[]>([]);
    const [rosters, setRosters] = useState<TeamRoster[]>([]);

    const matchesQuery = useQuery({
        queryKey: ['matches'],
        queryFn: loadMatches,
    });

    const playersQuery = useQuery({
        queryKey: ['players'],
        queryFn: loadPlayers,
    });

    const rostersQuery = useQuery({
        queryKey: ['rosters'],
        queryFn: loadRosters,
    });

    const saveMutation = useMutation({
        mutationFn: saveMatches,
        onSuccess: (data) => {
            queryClient.setQueryData(['matches'], data);
        },
    });

    const savePlayersMutation = useMutation({
        mutationFn: savePlayers,
        onSuccess: (data) => {
            queryClient.setQueryData(['players'], data);
        },
    });

    const saveRostersMutation = useMutation({
        mutationFn: saveRosters,
        onSuccess: (data) => {
            queryClient.setQueryData(['rosters'], data);
        },
    });

    useEffect(() => {
        if (matchesQuery.data) {
            setMatches(matchesQuery.data);
        }
    }, [matchesQuery.data]);

    useEffect(() => {
        if (playersQuery.data) {
            setSavedPlayers(playersQuery.data);
        }
    }, [playersQuery.data]);

    useEffect(() => {
        if (rostersQuery.data) {
            setRosters(rostersQuery.data);
        }
    }, [rostersQuery.data]);

    const persistMatches = useCallback((updated: Match[]) => {
        setMatches(updated);
        saveMutation.mutate(updated);
    }, [saveMutation]);

    const persistPlayers = useCallback((updated: SavedPlayer[]) => {
        setSavedPlayers(updated);
        savePlayersMutation.mutate(updated);
    }, [savePlayersMutation]);

    const persistRosters = useCallback((updated: TeamRoster[]) => {
        setRosters(updated);
        saveRostersMutation.mutate(updated);
    }, [saveRostersMutation]);

    const createMatch = useCallback((
        team1: string,
        team2: string,
        totalOvers: number,
        tossWinner: string,
        tossChoice: 'bat' | 'bowl',
        venue?: string,
        customStart?: { runs: number; wickets: number; overs: number },
    ): Match => {
        const battingFirst = tossChoice === 'bat' ? tossWinner : (tossWinner === team1 ? team2 : team1);
        const bowlingFirst = battingFirst === team1 ? team2 : team1;

        const firstInnings = createEmptyInnings(battingFirst, bowlingFirst);

        if (customStart) {
            firstInnings.totalRuns = customStart.runs;
            firstInnings.totalWickets = customStart.wickets;
            firstInnings.totalBalls = customStart.overs * 6;
            firstInnings.totalOvers = customStart.overs;
            console.log('Custom start applied:', customStart);
        }

        const newMatch: Match = {
            id: generateId(),
            team1,
            team2,
            totalOvers,
            tossWinner,
            tossChoice,
            venue,
            date: new Date().toISOString(),
            innings: [firstInnings],
            currentInnings: 0,
            status: 'live',
            createdAt: Date.now(),
        };

        const updated = [newMatch, ...matches];
        persistMatches(updated);
        console.log('Match created:', newMatch.id);
        return newMatch;
    }, [matches, persistMatches]);

    const getMatch = useCallback((id: string): Match | undefined => {
        return matches.find(m => m.id === id);
    }, [matches]);

    const updateMatch = useCallback((updatedMatch: Match) => {
        const updated = matches.map(m => m.id === updatedMatch.id ? updatedMatch : m);
        persistMatches(updated);
    }, [matches, persistMatches]);

    const deleteMatch = useCallback((id: string) => {
        const updated = matches.filter(m => m.id !== id);
        persistMatches(updated);
    }, [matches, persistMatches]);

    const editMatchDetails = useCallback((id: string, details: { team1?: string; team2?: string; venue?: string }) => {
        const match = matches.find(m => m.id === id);
        if (!match) return;

        if (details.team1 !== undefined) {
            const oldTeam1 = match.team1;
            match.team1 = details.team1;
            match.innings.forEach(inn => {
                if (inn) {
                    if (inn.battingTeam === oldTeam1) inn.battingTeam = details.team1!;
                    if (inn.bowlingTeam === oldTeam1) inn.bowlingTeam = details.team1!;
                }
            });
            if (match.tossWinner === oldTeam1) match.tossWinner = details.team1;
        }
        if (details.team2 !== undefined) {
            const oldTeam2 = match.team2;
            match.team2 = details.team2;
            match.innings.forEach(inn => {
                if (inn) {
                    if (inn.battingTeam === oldTeam2) inn.battingTeam = details.team2!;
                    if (inn.bowlingTeam === oldTeam2) inn.bowlingTeam = details.team2!;
                }
            });
            if (match.tossWinner === oldTeam2) match.tossWinner = details.team2;
        }
        if (details.venue !== undefined) match.venue = details.venue;

        updateMatch({ ...match });
    }, [matches, updateMatch]);

    const abandonMatch = useCallback((id: string) => {
        const match = matches.find(m => m.id === id);
        if (!match) return;

        match.status = 'abandoned';
        match.result = 'Match Abandoned';
        updateMatch({ ...match });
    }, [matches, updateMatch]);

    const duplicateMatch = useCallback((id: string): Match | undefined => {
        const original = matches.find(m => m.id === id);
        if (!original) return;

        const battingFirst = original.tossChoice === 'bat'
            ? original.tossWinner
            : (original.tossWinner === original.team1 ? original.team2 : original.team1);
        const bowlingFirst = battingFirst === original.team1 ? original.team2 : original.team1;

        const newMatch: Match = {
            id: generateId(),
            team1: original.team1,
            team2: original.team2,
            totalOvers: original.totalOvers,
            tossWinner: original.tossWinner,
            tossChoice: original.tossChoice,
            venue: original.venue,
            date: new Date().toISOString(),
            innings: [createEmptyInnings(battingFirst, bowlingFirst)],
            currentInnings: 0,
            status: 'live',
            createdAt: Date.now(),
        };

        const updated = [newMatch, ...matches];
        persistMatches(updated);
        console.log('Match duplicated:', newMatch.id);
        return newMatch;
    }, [matches, persistMatches]);

    const autoSavePlayer = useCallback((name: string) => {
        const existing = savedPlayers.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (!existing) {
            const newPlayer: SavedPlayer = {
                id: generateId(),
                name,
                matchesPlayed: 0,
                totalRuns: 0,
                totalBalls: 0,
                totalWickets: 0,
                totalRunsConceded: 0,
                totalBallsBowled: 0,
                highestScore: 0,
                bestBowling: '0/0',
                createdAt: Date.now(),
            };
            const updated = [...savedPlayers, newPlayer];
            persistPlayers(updated);
        }
    }, [savedPlayers, persistPlayers]);

    const addBatsmanToInnings = useCallback((matchId: string, name: string, inningsIdx?: 0 | 1) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        const idx = inningsIdx ?? match.currentInnings;
        const innings = match.innings[idx];
        if (!innings) return;

        const batsman = createBatsman(generateId(), name);
        innings.batsmen.push(batsman);

        if (!innings.currentBatsmanId) {
            innings.currentBatsmanId = batsman.id;
        } else if (!innings.nonStrikerId) {
            innings.nonStrikerId = batsman.id;
        }

        autoSavePlayer(name);
        updateMatch({ ...match });
        return batsman;
    }, [matches, updateMatch, autoSavePlayer]);

    const addBowlerToInnings = useCallback((matchId: string, name: string, inningsIdx?: 0 | 1) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        const idx = inningsIdx ?? match.currentInnings;
        const innings = match.innings[idx];
        if (!innings) return;

        const bowler = createBowler(generateId(), name);
        innings.bowlers.push(bowler);

        if (!innings.currentBowlerId) {
            innings.currentBowlerId = bowler.id;
        }

        autoSavePlayer(name);
        updateMatch({ ...match });
        return bowler;
    }, [matches, updateMatch, autoSavePlayer]);

    const addSavedPlayer = useCallback((name: string, team?: string) => {
        const existing = savedPlayers.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (existing) return existing;

        const newPlayer: SavedPlayer = {
            id: generateId(),
            name,
            team,
            matchesPlayed: 0,
            totalRuns: 0,
            totalBalls: 0,
            totalWickets: 0,
            totalRunsConceded: 0,
            totalBallsBowled: 0,
            highestScore: 0,
            bestBowling: '0/0',
            createdAt: Date.now(),
        };
        const updated = [...savedPlayers, newPlayer];
        persistPlayers(updated);
        return newPlayer;
    }, [savedPlayers, persistPlayers]);

    const editSavedPlayer = useCallback((id: string, details: { name?: string; team?: string }) => {
        const updated = savedPlayers.map(p => {
            if (p.id === id) {
                return { ...p, ...details };
            }
            return p;
        });
        persistPlayers(updated);
    }, [savedPlayers, persistPlayers]);

    const deleteSavedPlayer = useCallback((id: string) => {
        const updated = savedPlayers.filter(p => p.id !== id);
        persistPlayers(updated);
    }, [savedPlayers, persistPlayers]);

    const recordBall = useCallback((
        matchId: string,
        runs: number,
        isWicket: boolean,
        extraType?: 'wide' | 'no-ball' | 'bye' | 'leg-bye',
        wicketType?: string,
        shotZone?: ShotZone,
    ) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        const innings = match.innings[match.currentInnings];
        if (!innings || innings.isComplete) return;

        const isExtra = !!extraType;
        const isWide = extraType === 'wide';
        const isNoBall = extraType === 'no-ball';
        const isBye = extraType === 'bye';
        const isLegBye = extraType === 'leg-bye';

        const currentBatsman = innings.batsmen.find(b => b.id === innings.currentBatsmanId);
        const currentBowler = innings.bowlers.find(b => b.id === innings.currentBowlerId);
        if (!currentBatsman || !currentBowler) return;

        const ballEntry: BallEntry = {
            id: generateId(),
            over: Math.floor(innings.totalBalls / 6),
            ball: innings.totalBalls % 6,
            runs,
            extras: isExtra ? (isWide || isNoBall ? runs + 1 : runs) : 0,
            extraType,
            isWicket,
            wicketType,
            batsmanId: innings.currentBatsmanId,
            bowlerId: innings.currentBowlerId,
            outBatsmanId: isWicket ? innings.currentBatsmanId : undefined,
            timestamp: Date.now(),
            shotZone: !isExtra && !isWicket && runs > 0 ? shotZone : undefined,
        };

        innings.ballLog.push(ballEntry);

        if (isWide) {
            innings.totalRuns += runs + 1;
            innings.extras.wides += runs + 1;
            innings.extras.total += runs + 1;
            currentBowler.runs += runs + 1;
            currentBowler.extras += runs + 1;
        } else if (isNoBall) {
            innings.totalRuns += runs + 1;
            innings.extras.noBalls += 1;
            innings.extras.total += 1;
            currentBatsman.runs += runs;
            currentBatsman.balls += 1;
            if (runs === 4) currentBatsman.fours += 1;
            if (runs === 6) currentBatsman.sixes += 1;
            currentBowler.runs += runs + 1;
            currentBowler.extras += 1;
        } else if (isBye || isLegBye) {
            innings.totalRuns += runs;
            if (isBye) {
                innings.extras.byes += runs;
            } else {
                innings.extras.legByes += runs;
            }
            innings.extras.total += runs;
            currentBatsman.balls += 1;
            innings.totalBalls += 1;
            currentBowler.balls += 1;
            if (currentBowler.balls === 6) {
                currentBowler.overs += 1;
                currentBowler.balls = 0;
            }
        } else {
            innings.totalRuns += runs;
            currentBatsman.runs += runs;
            currentBatsman.balls += 1;
            if (runs === 4) currentBatsman.fours += 1;
            if (runs === 6) currentBatsman.sixes += 1;
            currentBowler.runs += runs;
            innings.totalBalls += 1;
            currentBowler.balls += 1;
            if (currentBowler.balls === 6) {
                currentBowler.overs += 1;
                currentBowler.balls = 0;
            }
        }

        if (!isWide && !isNoBall && !isBye && !isLegBye) {
            innings.totalOvers = Math.floor(innings.totalBalls / 6);
        } else if (isBye || isLegBye) {
            innings.totalOvers = Math.floor(innings.totalBalls / 6);
        }

        if (isWicket) {
            innings.totalWickets += 1;
            currentBatsman.isOut = true;
            currentBatsman.howOut = wicketType || 'out';
            currentBatsman.bowlerName = currentBowler.name;
            currentBowler.wickets += 1;

            // Clear the appropriate batsman ID so the UI prompts for a new one
            if (innings.currentBatsmanId === currentBatsman.id) {
                innings.currentBatsmanId = '';
            } else if (innings.nonStrikerId === currentBatsman.id) {
                innings.nonStrikerId = '';
            }
        }

        const shouldRotateStrike =
            (!isWide && !isNoBall && runs % 2 !== 0) ||
            (isBye && runs % 2 !== 0) ||
            (isLegBye && runs % 2 !== 0);

        if (shouldRotateStrike) {
            const temp = innings.currentBatsmanId;
            innings.currentBatsmanId = innings.nonStrikerId;
            innings.nonStrikerId = temp;
        }

        const isEndOfOver = !isWide && !isNoBall && innings.totalBalls % 6 === 0 && innings.totalBalls > 0;
        if (isEndOfOver) {
            const temp = innings.currentBatsmanId;
            innings.currentBatsmanId = innings.nonStrikerId;
            innings.nonStrikerId = temp;

            // Clear the bowler ID at the end of the over
            if (!innings.isComplete) {
                innings.currentBowlerId = '';
            }
        }

        if (innings.totalBalls >= match.totalOvers * 6 || innings.totalWickets >= 10) {
            innings.isComplete = true;
        }

        if (match.currentInnings === 1 && match.innings[0]) {
            const target = match.innings[0].totalRuns + 1;
            if (innings.totalRuns >= target) {
                innings.isComplete = true;
                const wicketsLeft = 10 - innings.totalWickets;
                match.result = `${innings.battingTeam} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
                match.status = 'completed';
                const mvp = calculateMVP(match);
                if (mvp) match.mvp = mvp.name;
            }
        }

        if (innings.isComplete && match.currentInnings === 0) {
            match.innings[1] = createEmptyInnings(innings.bowlingTeam, innings.battingTeam);
            match.currentInnings = 1;
        } else if (innings.isComplete && match.currentInnings === 1 && match.status !== 'completed') {
            const firstInnings = match.innings[0]!;
            if (innings.totalRuns < firstInnings.totalRuns + 1) {
                const runDiff = firstInnings.totalRuns - innings.totalRuns;
                match.result = `${firstInnings.battingTeam} won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`;
            } else if (innings.totalRuns === firstInnings.totalRuns) {
                match.result = 'Match Tied';
            }
            match.status = 'completed';
            const mvp = calculateMVP(match);
            if (mvp) match.mvp = mvp.name;
        }

        updateMatch({ ...match });
    }, [matches, updateMatch]);

    const switchBowler = useCallback((matchId: string, bowlerId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        const innings = match.innings[match.currentInnings];
        if (!innings) return;

        innings.currentBowlerId = bowlerId;
        updateMatch({ ...match });
    }, [matches, updateMatch]);

    const swapStrike = useCallback((matchId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        const innings = match.innings[match.currentInnings];
        if (!innings) return;

        const temp = innings.currentBatsmanId;
        innings.currentBatsmanId = innings.nonStrikerId;
        innings.nonStrikerId = temp;
        updateMatch({ ...match });
    }, [matches, updateMatch]);

    const retireBatsman = useCallback((matchId: string, batsmanId: string, isHurt: boolean) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        const innings = match.innings[match.currentInnings];
        if (!innings) return;

        const batsman = innings.batsmen.find(b => b.id === batsmanId);
        if (!batsman) return;

        batsman.isOut = true;
        batsman.howOut = isHurt ? 'retired hurt' : 'retired out';

        if (batsmanId === innings.currentBatsmanId) {
            innings.currentBatsmanId = '';
        } else if (batsmanId === innings.nonStrikerId) {
            innings.nonStrikerId = '';
        }

        updateMatch({ ...match });
    }, [matches, updateMatch]);

    const undoLastBall = useCallback((matchId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        const innings = match.innings[match.currentInnings];
        if (!innings || innings.ballLog.length === 0) return;

        const lastBall = innings.ballLog.pop()!;
        const batsman = innings.batsmen.find(b => b.id === lastBall.batsmanId);
        const bowler = innings.bowlers.find(b => b.id === lastBall.bowlerId);

        if (!batsman || !bowler) return;

        const isWide = lastBall.extraType === 'wide';
        const isNoBall = lastBall.extraType === 'no-ball';
        const isBye = lastBall.extraType === 'bye';
        const isLegBye = lastBall.extraType === 'leg-bye';

        if (isWide) {
            innings.totalRuns -= lastBall.runs + 1;
            innings.extras.wides -= lastBall.runs + 1;
            innings.extras.total -= lastBall.runs + 1;
            bowler.runs -= lastBall.runs + 1;
            bowler.extras -= lastBall.runs + 1;
        } else if (isNoBall) {
            innings.totalRuns -= lastBall.runs + 1;
            innings.extras.noBalls -= 1;
            innings.extras.total -= 1;
            batsman.runs -= lastBall.runs;
            batsman.balls -= 1;
            if (lastBall.runs === 4) batsman.fours -= 1;
            if (lastBall.runs === 6) batsman.sixes -= 1;
            bowler.runs -= lastBall.runs + 1;
            bowler.extras -= 1;
        } else if (isBye || isLegBye) {
            innings.totalRuns -= lastBall.runs;
            if (isBye) innings.extras.byes -= lastBall.runs;
            else innings.extras.legByes -= lastBall.runs;
            innings.extras.total -= lastBall.runs;
            batsman.balls -= 1;
            innings.totalBalls -= 1;
            bowler.balls -= 1;
            if (bowler.balls < 0) {
                bowler.overs -= 1;
                bowler.balls = 5;
            }
        } else {
            innings.totalRuns -= lastBall.runs;
            batsman.runs -= lastBall.runs;
            batsman.balls -= 1;
            if (lastBall.runs === 4) batsman.fours -= 1;
            if (lastBall.runs === 6) batsman.sixes -= 1;
            bowler.runs -= lastBall.runs;
            innings.totalBalls -= 1;
            bowler.balls -= 1;
            if (bowler.balls < 0) {
                bowler.overs -= 1;
                bowler.balls = 5;
            }
        }

        if (lastBall.isWicket) {
            innings.totalWickets -= 1;
            batsman.isOut = false;
            batsman.howOut = undefined;
            batsman.bowlerName = undefined;
            bowler.wickets -= 1;

            // Note: The below logic correctly restores currentBatsmanId to the batsman who incorrectly got out
        }

        innings.totalOvers = Math.floor(innings.totalBalls / 6);
        innings.isComplete = false;

        // Restore the active elements from the last ball
        if (!innings.currentBatsmanId || innings.currentBatsmanId === '') {
            innings.currentBatsmanId = lastBall.outBatsmanId === lastBall.batsmanId ? lastBall.batsmanId : innings.currentBatsmanId;
        }

        // If a new batsman was added after the wicket but before the undo, we might need to handle it 
        // For simplicity, we strictly force the currentBatsmanId and currentBowlerId to what it was
        if (lastBall.isWicket && lastBall.outBatsmanId) {
            // Find if they were striker or non-striker. The ballLog records batsmanId as the striker.
            if (lastBall.outBatsmanId === lastBall.batsmanId) {
                innings.currentBatsmanId = lastBall.batsmanId;
            } else {
                innings.nonStrikerId = lastBall.outBatsmanId;
            }
        } else {
            innings.currentBatsmanId = lastBall.batsmanId;
        }

        innings.currentBowlerId = lastBall.bowlerId;

        if (match.status === 'completed') {
            match.status = 'live';
            match.result = undefined;
            match.mvp = undefined;
        }

        updateMatch({ ...match });
    }, [matches, updateMatch]);

    const endInnings = useCallback((matchId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        const innings = match.innings[match.currentInnings];
        if (!innings) return;

        innings.isComplete = true;

        if (match.currentInnings === 0) {
            match.innings[1] = createEmptyInnings(innings.bowlingTeam, innings.battingTeam);
            match.currentInnings = 1;
        } else {
            const firstInnings = match.innings[0]!;
            if (innings.totalRuns > firstInnings.totalRuns) {
                const wicketsLeft = 10 - innings.totalWickets;
                match.result = `${innings.battingTeam} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
            } else if (innings.totalRuns < firstInnings.totalRuns) {
                const runDiff = firstInnings.totalRuns - innings.totalRuns;
                match.result = `${firstInnings.battingTeam} won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`;
            } else {
                match.result = 'Match Tied';
            }
            match.status = 'completed';
            const mvp = calculateMVP(match);
            if (mvp) match.mvp = mvp.name;
        }

        updateMatch({ ...match });
    }, [matches, updateMatch]);

    const addMatchNote = useCallback((matchId: string, note: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;
        match.notes = note;
        updateMatch({ ...match });
    }, [matches, updateMatch]);

    const setMatchMVP = useCallback((matchId: string, mvpName: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;
        match.mvp = mvpName;
        updateMatch({ ...match });
    }, [matches, updateMatch]);

    const getHeadToHead = useCallback((team1: string, team2: string): HeadToHead => {
        const h2hMatches = matches.filter(m =>
            (m.team1.toLowerCase() === team1.toLowerCase() && m.team2.toLowerCase() === team2.toLowerCase()) ||
            (m.team1.toLowerCase() === team2.toLowerCase() && m.team2.toLowerCase() === team1.toLowerCase())
        );

        let team1Wins = 0;
        let team2Wins = 0;
        let ties = 0;
        let noResults = 0;

        h2hMatches.forEach(m => {
            if (m.status === 'completed' && m.result) {
                if (m.result === 'Match Tied') {
                    ties++;
                } else if (m.result.toLowerCase().includes(team1.toLowerCase())) {
                    team1Wins++;
                } else if (m.result.toLowerCase().includes(team2.toLowerCase())) {
                    team2Wins++;
                }
            } else if (m.status === 'abandoned') {
                noResults++;
            }
        });

        return {
            totalPlayed: h2hMatches.filter(m => m.status === 'completed' || m.status === 'abandoned').length,
            team1Wins,
            team2Wins,
            ties,
            noResults,
            matches: h2hMatches,
        };
    }, [matches]);

    const getMatchCSV = useCallback((matchId: string): string => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return '';
        return exportMatchCSV(match);
    }, [matches]);

    const getMatchSummaryText = useCallback((matchId: string): string => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return '';

        const first = match.innings[0];
        const second = match.innings[1];
        let text = `${match.team1} vs ${match.team2}\n`;
        if (match.venue) text += `Venue: ${match.venue}\n`;
        text += `${match.totalOvers} overs match\n`;
        text += `Toss: ${match.tossWinner} elected to ${match.tossChoice}\n\n`;

        if (first) {
            text += `${first.battingTeam}: ${first.totalRuns}/${first.totalWickets} (${getOversString(first.totalBalls)} ov)\n`;
            first.batsmen.filter(b => b.balls > 0 || b.runs > 0).forEach(b => {
                text += `  ${b.name}: ${b.runs}(${b.balls}) ${b.isOut ? b.howOut : 'not out'}\n`;
            });
            text += `  Extras: ${first.extras.total}\n\n`;
        }

        if (second) {
            text += `${second.battingTeam}: ${second.totalRuns}/${second.totalWickets} (${getOversString(second.totalBalls)} ov)\n`;
            second.batsmen.filter(b => b.balls > 0 || b.runs > 0).forEach(b => {
                text += `  ${b.name}: ${b.runs}(${b.balls}) ${b.isOut ? b.howOut : 'not out'}\n`;
            });
            text += `  Extras: ${second.extras.total}\n\n`;
        }

        if (match.result) text += `Result: ${match.result}\n`;
        if (match.mvp) text += `MVP: ${match.mvp}\n`;
        if (match.notes) text += `\nNotes: ${match.notes}\n`;

        return text;
    }, [matches]);

    const deleteAllMatches = useCallback(() => {
        persistMatches([]);
    }, [persistMatches]);

    const addRoster = useCallback((name: string, players: string[]) => {
        const roster: TeamRoster = {
            id: generateId(),
            name,
            players,
            createdAt: Date.now(),
        };
        const updated = [...rosters, roster];
        persistRosters(updated);
        players.forEach(p => autoSavePlayer(p));
        return roster;
    }, [rosters, persistRosters, autoSavePlayer]);

    const editRoster = useCallback((id: string, details: { name?: string; players?: string[] }) => {
        const updated = rosters.map(r => {
            if (r.id === id) {
                return { ...r, ...details };
            }
            return r;
        });
        persistRosters(updated);
        if (details.players) {
            details.players.forEach(p => autoSavePlayer(p));
        }
    }, [rosters, persistRosters, autoSavePlayer]);

    const deleteRoster = useCallback((id: string) => {
        const updated = rosters.filter(r => r.id !== id);
        persistRosters(updated);
    }, [rosters, persistRosters]);

    const liveMatches = useMemo(() => matches.filter(m => m.status === 'live'), [matches]);
    const completedMatches = useMemo(() => matches.filter(m => m.status === 'completed'), [matches]);
    const abandonedMatches = useMemo(() => matches.filter(m => m.status === 'abandoned'), [matches]);

    const getPlayerStats = useCallback(() => {
        const playerMap: Record<string, { name: string; runs: number; balls: number; wickets: number; runsConceded: number; ballsBowled: number; matches: Set<string>; highScore: number; fours: number; sixes: number; bestWickets: number; bestRuns: number }> = {};

        matches.forEach(match => {
            match.innings.forEach(inn => {
                if (!inn) return;
                inn.batsmen.forEach(b => {
                    if (b.balls === 0 && b.runs === 0) return;
                    const key = b.name.toLowerCase();
                    if (!playerMap[key]) {
                        playerMap[key] = { name: b.name, runs: 0, balls: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, matches: new Set(), highScore: 0, fours: 0, sixes: 0, bestWickets: 0, bestRuns: 999 };
                    }
                    playerMap[key].runs += b.runs;
                    playerMap[key].balls += b.balls;
                    playerMap[key].fours += b.fours;
                    playerMap[key].sixes += b.sixes;
                    playerMap[key].matches.add(match.id);
                    if (b.runs > playerMap[key].highScore) playerMap[key].highScore = b.runs;
                });
                inn.bowlers.forEach(b => {
                    if (b.overs === 0 && b.balls === 0) return;
                    const key = b.name.toLowerCase();
                    if (!playerMap[key]) {
                        playerMap[key] = { name: b.name, runs: 0, balls: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, matches: new Set(), highScore: 0, fours: 0, sixes: 0, bestWickets: 0, bestRuns: 999 };
                    }
                    playerMap[key].wickets += b.wickets;
                    playerMap[key].runsConceded += b.runs;
                    playerMap[key].ballsBowled += b.overs * 6 + b.balls;
                    playerMap[key].matches.add(match.id);
                    if (b.wickets > playerMap[key].bestWickets || (b.wickets === playerMap[key].bestWickets && b.runs < playerMap[key].bestRuns)) {
                        playerMap[key].bestWickets = b.wickets;
                        playerMap[key].bestRuns = b.runs;
                    }
                });
            });
        });

        return Object.values(playerMap).map(p => ({
            name: p.name,
            matches: p.matches.size,
            runs: p.runs,
            balls: p.balls,
            wickets: p.wickets,
            runsConceded: p.runsConceded,
            ballsBowled: p.ballsBowled,
            highScore: p.highScore,
            fours: p.fours,
            sixes: p.sixes,
            bestBowling: `${p.bestWickets}/${p.bestRuns === 999 ? 0 : p.bestRuns}`,
            strikeRate: p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0',
            average: p.matches.size > 0 ? (p.runs / p.matches.size).toFixed(1) : '0.0',
            economy: p.ballsBowled > 0 ? ((p.runsConceded / p.ballsBowled) * 6).toFixed(1) : '0.0',
        })).sort((a, b) => b.runs - a.runs);
    }, [matches]);

    const getTeamStats = useCallback(() => {
        const teamMap: Record<string, { name: string; played: number; wins: number; losses: number; ties: number; abandoned: number; totalRuns: number; totalWickets: number }> = {};

        matches.forEach(match => {
            [match.team1, match.team2].forEach(team => {
                const key = team.toLowerCase();
                if (!teamMap[key]) {
                    teamMap[key] = { name: team, played: 0, wins: 0, losses: 0, ties: 0, abandoned: 0, totalRuns: 0, totalWickets: 0 };
                }
                teamMap[key].played += 1;

                if (match.status === 'abandoned') {
                    teamMap[key].abandoned += 1;
                } else if (match.status === 'completed' && match.result) {
                    if (match.result === 'Match Tied') {
                        teamMap[key].ties += 1;
                    } else if (match.result.startsWith(team)) {
                        teamMap[key].wins += 1;
                    } else {
                        teamMap[key].losses += 1;
                    }
                }

                match.innings.forEach(inn => {
                    if (inn && inn.battingTeam === team) {
                        teamMap[key].totalRuns += inn.totalRuns;
                        teamMap[key].totalWickets += inn.totalWickets;
                    }
                });
            });
        });

        return Object.values(teamMap).sort((a, b) => b.wins - a.wins);
    }, [matches]);

    const updateLastBallZone = useCallback((matchId: string, zone: ShotZone) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;
        const innings = match.innings[match.currentInnings];
        if (!innings || innings.ballLog.length === 0) return;
        const lastBall = innings.ballLog[innings.ballLog.length - 1];
        if (lastBall && lastBall.runs > 0 && !lastBall.extraType && !lastBall.isWicket) {
            lastBall.shotZone = zone;
            updateMatch({ ...match });
        }
    }, [matches, updateMatch]);

    const getPlayerInningsHistory = useCallback((playerName: string): PlayerInningsRecord[] => {
        const records: PlayerInningsRecord[] = [];
        const nameLower = playerName.toLowerCase();

        matches.forEach(match => {
            let runs = 0, balls = 0, fours = 0, sixes = 0, isOut = false, howOut: string | undefined;
            let wickets = 0, runsConceded = 0, oversBowled = '0.0', economy = '0.0';
            let opponent = '';
            let found = false;

            match.innings.forEach(inn => {
                if (!inn) return;
                const bat = inn.batsmen.find(b => b.name.toLowerCase() === nameLower);
                if (bat && (bat.balls > 0 || bat.runs > 0 || bat.isOut)) {
                    runs = bat.runs;
                    balls = bat.balls;
                    fours = bat.fours;
                    sixes = bat.sixes;
                    isOut = bat.isOut;
                    howOut = bat.howOut;
                    opponent = inn.bowlingTeam;
                    found = true;
                }
                const bowl = inn.bowlers.find(b => b.name.toLowerCase() === nameLower);
                if (bowl && (bowl.overs > 0 || bowl.balls > 0)) {
                    wickets = bowl.wickets;
                    runsConceded = bowl.runs;
                    const totalBowlBalls = bowl.overs * 6 + bowl.balls;
                    oversBowled = `${bowl.overs}.${bowl.balls}`;
                    economy = getEconomyRate(bowl.runs, totalBowlBalls);
                    if (!opponent) opponent = inn.battingTeam;
                    found = true;
                }
            });

            if (found) {
                records.push({
                    matchId: match.id,
                    matchDate: match.date,
                    opponent,
                    venue: match.venue,
                    runs,
                    balls,
                    fours,
                    sixes,
                    isOut,
                    howOut,
                    strikeRate: getStrikeRate(runs, balls),
                    wickets,
                    runsConceded,
                    oversBowled,
                    economy,
                });
            }
        });

        return records.sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());
    }, [matches]);

    const getAllTeamNames = useMemo(() => {
        const names = new Set<string>();
        matches.forEach(m => {
            names.add(m.team1);
            names.add(m.team2);
        });
        return Array.from(names).sort();
    }, [matches]);

    return {
        matches,
        savedPlayers,
        rosters,
        liveMatches,
        completedMatches,
        abandonedMatches,
        isLoading: matchesQuery.isLoading,
        createMatch,
        getMatch,
        updateMatch,
        deleteMatch,
        editMatchDetails,
        abandonMatch,
        duplicateMatch,
        addBatsmanToInnings,
        addBowlerToInnings,
        recordBall,
        switchBowler,
        swapStrike,
        updateLastBallZone,
        getPlayerInningsHistory,
        retireBatsman,
        undoLastBall,
        endInnings,
        addMatchNote,
        setMatchMVP,
        getHeadToHead,
        getMatchCSV,
        getMatchSummaryText,
        deleteAllMatches,
        addSavedPlayer,
        editSavedPlayer,
        deleteSavedPlayer,
        addRoster,
        editRoster,
        deleteRoster,
        getPlayerStats,
        getTeamStats,
        getAllTeamNames,
    };
});
