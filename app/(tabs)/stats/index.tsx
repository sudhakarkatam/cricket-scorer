import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { BarChart3, Users, Shield, Search, TrendingUp, Target, Award, Swords, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useMatches } from '@/providers/MatchProvider';
import { getOversString, formatDate } from '@/utils/cricket';
import { PlayerInningsRecord } from '@/types/cricket';
import PlayerDetailModal from '@/components/PlayerDetailModal';

type StatsTab = 'players' | 'teams' | 'overview' | 'h2h';

export default function StatsScreen() {
    const { matches, getPlayerStats, getTeamStats, getHeadToHead, getAllTeamNames, getPlayerInningsHistory } = useMatches();
    const [activeTab, setActiveTab] = useState<StatsTab>('overview');
    const [search, setSearch] = useState('');
    const [h2hTeam1, setH2hTeam1] = useState('');
    const [h2hTeam2, setH2hTeam2] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const [playerHistory, setPlayerHistory] = useState<PlayerInningsRecord[]>([]);

    const playerStats = useMemo(() => getPlayerStats(), [getPlayerStats]);
    const teamStats = useMemo(() => getTeamStats(), [getTeamStats]);

    const filteredPlayers = useMemo(() => {
        if (!search.trim()) return playerStats;
        return playerStats.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }, [playerStats, search]);

    const handlePlayerTap = useCallback((playerName: string) => {
        const history = getPlayerInningsHistory(playerName);
        setPlayerHistory(history);
        setSelectedPlayer(playerName);
    }, [getPlayerInningsHistory]);

    const selectedPlayerStats = useMemo(() => {
        if (!selectedPlayer) return null;
        return playerStats.find(p => p.name.toLowerCase() === selectedPlayer.toLowerCase()) ?? null;
    }, [selectedPlayer, playerStats]);

    const filteredTeams = useMemo(() => {
        if (!search.trim()) return teamStats;
        return teamStats.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    }, [teamStats, search]);

    const h2hData = useMemo(() => {
        if (!h2hTeam1 || !h2hTeam2 || h2hTeam1 === h2hTeam2) return null;
        return getHeadToHead(h2hTeam1, h2hTeam2);
    }, [h2hTeam1, h2hTeam2, getHeadToHead]);

    const totalMatches = matches.length;
    const completedCount = matches.filter(m => m.status === 'completed').length;
    const liveCount = matches.filter(m => m.status === 'live').length;

    const highestTeamScore = useMemo(() => {
        let best = { team: '-', score: 0, wickets: 0, overs: '' };
        matches.forEach(m => {
            m.innings.forEach(inn => {
                if (inn && inn.totalRuns > best.score) {
                    best = { team: inn.battingTeam, score: inn.totalRuns, wickets: inn.totalWickets, overs: `${Math.floor(inn.totalBalls / 6)}.${inn.totalBalls % 6}` };
                }
            });
        });
        return best;
    }, [matches]);

    const topScorer = playerStats.length > 0 ? playerStats[0] : null;
    const topWicketTaker = useMemo(() => {
        const sorted = [...playerStats].sort((a, b) => b.wickets - a.wickets);
        return sorted.length > 0 ? sorted[0] : null;
    }, [playerStats]);

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
                {([
                    { key: 'overview' as StatsTab, label: 'Overview', icon: BarChart3 },
                    { key: 'players' as StatsTab, label: 'Players', icon: Users },
                    { key: 'teams' as StatsTab, label: 'Teams', icon: Shield },
                    { key: 'h2h' as StatsTab, label: 'Head to Head', icon: Swords },
                ]).map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
                        onPress={() => { setActiveTab(tab.key); setSearch(''); }}
                        activeOpacity={0.7}
                    >
                        <tab.icon size={14} color={activeTab === tab.key ? Colors.primary : Colors.textMuted} />
                        <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView contentContainerStyle={styles.content}>
                {activeTab === 'overview' && (
                    <>
                        <View style={styles.overviewGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{totalMatches}</Text>
                                <Text style={styles.statLabel}>Total Matches</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{completedCount}</Text>
                                <Text style={styles.statLabel}>Completed</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={[styles.statNumber, { color: Colors.danger }]}>{liveCount}</Text>
                                <Text style={styles.statLabel}>Live</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{playerStats.length}</Text>
                                <Text style={styles.statLabel}>Players</Text>
                            </View>
                        </View>

                        {highestTeamScore.score > 0 && (
                            <View style={styles.highlightCard}>
                                <View style={styles.highlightHeader}>
                                    <TrendingUp size={16} color={Colors.accent} />
                                    <Text style={styles.highlightTitle}>Highest Team Score</Text>
                                </View>
                                <Text style={styles.highlightValue}>
                                    {highestTeamScore.team}: {highestTeamScore.score}/{highestTeamScore.wickets} ({highestTeamScore.overs})
                                </Text>
                            </View>
                        )}

                        {topScorer && (
                            <View style={styles.highlightCard}>
                                <View style={styles.highlightHeader}>
                                    <Award size={16} color={Colors.primary} />
                                    <Text style={styles.highlightTitle}>Top Run Scorer</Text>
                                </View>
                                <Text style={styles.highlightValue}>
                                    {topScorer.name}: {topScorer.runs} runs ({topScorer.matches} matches)
                                </Text>
                                <Text style={styles.highlightSub}>
                                    HS: {topScorer.highScore} | SR: {topScorer.strikeRate} | 4s: {topScorer.fours} | 6s: {topScorer.sixes}
                                </Text>
                            </View>
                        )}

                        {topWicketTaker && topWicketTaker.wickets > 0 && (
                            <View style={styles.highlightCard}>
                                <View style={styles.highlightHeader}>
                                    <Target size={16} color={Colors.danger} />
                                    <Text style={styles.highlightTitle}>Top Wicket Taker</Text>
                                </View>
                                <Text style={styles.highlightValue}>
                                    {topWicketTaker.name}: {topWicketTaker.wickets} wickets ({topWicketTaker.matches} matches)
                                </Text>
                                <Text style={styles.highlightSub}>
                                    Best: {topWicketTaker.bestBowling} | Eco: {topWicketTaker.economy}
                                </Text>
                            </View>
                        )}

                        {totalMatches === 0 && (
                            <View style={styles.emptyState}>
                                <BarChart3 size={48} color={Colors.textMuted} />
                                <Text style={styles.emptyTitle}>No stats yet</Text>
                                <Text style={styles.emptySub}>Play some matches to see statistics here</Text>
                            </View>
                        )}
                    </>
                )}

                {activeTab === 'players' && (
                    <>
                        <View style={styles.searchRow}>
                            <Search size={16} color={Colors.textMuted} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search player..."
                                placeholderTextColor={Colors.textMuted}
                                value={search}
                                onChangeText={setSearch}
                            />
                        </View>

                        {filteredPlayers.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Users size={40} color={Colors.textMuted} />
                                <Text style={styles.emptyTitle}>No player data</Text>
                                <Text style={styles.emptySub}>Player stats appear after scoring matches</Text>
                            </View>
                        ) : (
                            filteredPlayers.map((player, idx) => (
                                <TouchableOpacity
                                    key={player.name + idx}
                                    style={styles.playerCard}
                                    onPress={() => handlePlayerTap(player.name)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.playerHeader}>
                                        <View style={styles.playerRank}>
                                            <Text style={styles.rankText}>#{idx + 1}</Text>
                                        </View>
                                        <View style={styles.playerInfo}>
                                            <Text style={styles.playerName}>{player.name}</Text>
                                            <Text style={styles.playerMatchCount}>{player.matches} match{player.matches !== 1 ? 'es' : ''}</Text>
                                        </View>
                                        <ChevronRight size={16} color={Colors.textMuted} />
                                    </View>
                                    <View style={styles.playerStatsGrid}>
                                        <View style={styles.miniStat}>
                                            <Text style={styles.miniStatValue}>{player.runs}</Text>
                                            <Text style={styles.miniStatLabel}>Runs</Text>
                                        </View>
                                        <View style={styles.miniStat}>
                                            <Text style={styles.miniStatValue}>{player.highScore}</Text>
                                            <Text style={styles.miniStatLabel}>HS</Text>
                                        </View>
                                        <View style={styles.miniStat}>
                                            <Text style={styles.miniStatValue}>{player.strikeRate}</Text>
                                            <Text style={styles.miniStatLabel}>SR</Text>
                                        </View>
                                        <View style={styles.miniStat}>
                                            <Text style={styles.miniStatValue}>{player.wickets}</Text>
                                            <Text style={styles.miniStatLabel}>Wkts</Text>
                                        </View>
                                        <View style={styles.miniStat}>
                                            <Text style={styles.miniStatValue}>{player.economy}</Text>
                                            <Text style={styles.miniStatLabel}>Eco</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </>
                )}

                {activeTab === 'teams' && (
                    <>
                        <View style={styles.searchRow}>
                            <Search size={16} color={Colors.textMuted} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search team..."
                                placeholderTextColor={Colors.textMuted}
                                value={search}
                                onChangeText={setSearch}
                            />
                        </View>

                        {filteredTeams.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Shield size={40} color={Colors.textMuted} />
                                <Text style={styles.emptyTitle}>No team data</Text>
                                <Text style={styles.emptySub}>Team stats appear after completing matches</Text>
                            </View>
                        ) : (
                            filteredTeams.map((team, idx) => (
                                <View key={team.name + idx} style={styles.teamCard}>
                                    <Text style={styles.teamName}>{team.name}</Text>
                                    <View style={styles.teamStatsRow}>
                                        <View style={styles.teamStatItem}>
                                            <Text style={styles.teamStatValue}>{team.played}</Text>
                                            <Text style={styles.teamStatLabel}>P</Text>
                                        </View>
                                        <View style={styles.teamStatItem}>
                                            <Text style={[styles.teamStatValue, { color: Colors.primary }]}>{team.wins}</Text>
                                            <Text style={styles.teamStatLabel}>W</Text>
                                        </View>
                                        <View style={styles.teamStatItem}>
                                            <Text style={[styles.teamStatValue, { color: Colors.danger }]}>{team.losses}</Text>
                                            <Text style={styles.teamStatLabel}>L</Text>
                                        </View>
                                        <View style={styles.teamStatItem}>
                                            <Text style={styles.teamStatValue}>{team.ties}</Text>
                                            <Text style={styles.teamStatLabel}>T</Text>
                                        </View>
                                        <View style={styles.teamStatItem}>
                                            <Text style={styles.teamStatValue}>{team.totalRuns}</Text>
                                            <Text style={styles.teamStatLabel}>Runs</Text>
                                        </View>
                                    </View>
                                    {team.played > 0 && (
                                        <View style={styles.winRateBar}>
                                            <View style={[styles.winRateFill, { width: `${(team.wins / team.played) * 100}%` }]} />
                                        </View>
                                    )}
                                    <Text style={styles.winRateText}>
                                        Win rate: {team.played > 0 ? ((team.wins / team.played) * 100).toFixed(0) : 0}%
                                    </Text>
                                </View>
                            ))
                        )}
                    </>
                )}

                {activeTab === 'h2h' && (
                    <>
                        <View style={styles.h2hPickerCard}>
                            <Text style={styles.h2hPickerLabel}>Select two teams to compare</Text>
                            <Text style={styles.h2hInputLabel}>Team 1</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.h2hChipsScroll}>
                                <View style={styles.h2hChips}>
                                    {getAllTeamNames.map(name => (
                                        <TouchableOpacity
                                            key={name}
                                            style={[styles.h2hChip, h2hTeam1 === name && styles.h2hChipActive]}
                                            onPress={() => setH2hTeam1(name)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.h2hChipText, h2hTeam1 === name && styles.h2hChipTextActive]} numberOfLines={1}>
                                                {name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>

                            <Text style={styles.h2hInputLabel}>Team 2</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.h2hChipsScroll}>
                                <View style={styles.h2hChips}>
                                    {getAllTeamNames.filter(n => n !== h2hTeam1).map(name => (
                                        <TouchableOpacity
                                            key={name}
                                            style={[styles.h2hChip, h2hTeam2 === name && styles.h2hChipActive]}
                                            onPress={() => setH2hTeam2(name)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.h2hChipText, h2hTeam2 === name && styles.h2hChipTextActive]} numberOfLines={1}>
                                                {name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>

                        {h2hData && (
                            <View style={styles.h2hResultCard}>
                                <Text style={styles.h2hTitle}>{h2hTeam1} vs {h2hTeam2}</Text>
                                <Text style={styles.h2hSubtitle}>{h2hData.totalPlayed} match{h2hData.totalPlayed !== 1 ? 'es' : ''} played</Text>

                                <View style={styles.h2hScoreRow}>
                                    <View style={styles.h2hTeamBlock}>
                                        <Text style={styles.h2hTeamName} numberOfLines={1}>{h2hTeam1}</Text>
                                        <Text style={[styles.h2hWins, { color: Colors.primary }]}>{h2hData.team1Wins}</Text>
                                        <Text style={styles.h2hWinsLabel}>Wins</Text>
                                    </View>
                                    <View style={styles.h2hDivider}>
                                        <Text style={styles.h2hVsText}>vs</Text>
                                        {h2hData.ties > 0 && <Text style={styles.h2hTies}>{h2hData.ties} tied</Text>}
                                        {h2hData.noResults > 0 && <Text style={styles.h2hTies}>{h2hData.noResults} NR</Text>}
                                    </View>
                                    <View style={styles.h2hTeamBlock}>
                                        <Text style={styles.h2hTeamName} numberOfLines={1}>{h2hTeam2}</Text>
                                        <Text style={[styles.h2hWins, { color: Colors.accent }]}>{h2hData.team2Wins}</Text>
                                        <Text style={styles.h2hWinsLabel}>Wins</Text>
                                    </View>
                                </View>

                                {h2hData.totalPlayed > 0 && (
                                    <View style={styles.h2hBar}>
                                        <View style={[styles.h2hBarFill, styles.h2hBarTeam1, { flex: Math.max(h2hData.team1Wins, 0.1) }]} />
                                        {h2hData.ties > 0 && <View style={[styles.h2hBarFill, styles.h2hBarTie, { flex: h2hData.ties }]} />}
                                        <View style={[styles.h2hBarFill, styles.h2hBarTeam2, { flex: Math.max(h2hData.team2Wins, 0.1) }]} />
                                    </View>
                                )}

                                {h2hData.matches.length > 0 && (
                                    <View style={styles.h2hMatchList}>
                                        <Text style={styles.h2hMatchListTitle}>RECENT MATCHES</Text>
                                        {h2hData.matches.slice(0, 5).map(m => (
                                            <View key={m.id} style={styles.h2hMatchItem}>
                                                <Text style={styles.h2hMatchDate}>{formatDate(m.date)}</Text>
                                                <View style={styles.h2hMatchScores}>
                                                    {m.innings[0] && (
                                                        <Text style={styles.h2hMatchScore}>
                                                            {m.innings[0].battingTeam}: {m.innings[0].totalRuns}/{m.innings[0].totalWickets}
                                                        </Text>
                                                    )}
                                                    {m.innings[1] && (
                                                        <Text style={styles.h2hMatchScore}>
                                                            {m.innings[1].battingTeam}: {m.innings[1].totalRuns}/{m.innings[1].totalWickets}
                                                        </Text>
                                                    )}
                                                </View>
                                                {m.result && <Text style={styles.h2hMatchResult}>{m.result}</Text>}
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {(!h2hTeam1 || !h2hTeam2) && getAllTeamNames.length >= 2 && (
                            <View style={styles.emptyState}>
                                <Swords size={40} color={Colors.textMuted} />
                                <Text style={styles.emptyTitle}>Select both teams</Text>
                                <Text style={styles.emptySub}>Choose two teams above to see head-to-head records</Text>
                            </View>
                        )}

                        {getAllTeamNames.length < 2 && (
                            <View style={styles.emptyState}>
                                <Swords size={40} color={Colors.textMuted} />
                                <Text style={styles.emptyTitle}>Not enough teams</Text>
                                <Text style={styles.emptySub}>Play matches with at least 2 different teams</Text>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            <PlayerDetailModal
                visible={!!selectedPlayer}
                onClose={() => setSelectedPlayer(null)}
                player={selectedPlayerStats ? {
                    name: selectedPlayerStats.name,
                    matches: selectedPlayerStats.matches,
                    runs: selectedPlayerStats.runs,
                    balls: selectedPlayerStats.balls,
                    wickets: selectedPlayerStats.wickets,
                    runsConceded: selectedPlayerStats.runsConceded,
                    ballsBowled: selectedPlayerStats.ballsBowled,
                    highScore: selectedPlayerStats.highScore,
                    fours: selectedPlayerStats.fours,
                    sixes: selectedPlayerStats.sixes,
                    bestBowling: selectedPlayerStats.bestBowling,
                    strikeRate: selectedPlayerStats.strikeRate,
                    average: selectedPlayerStats.average,
                    economy: selectedPlayerStats.economy,
                } : null}
                inningsHistory={playerHistory}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    tabsScroll: {
        flexGrow: 0,
        paddingTop: 12,
        paddingBottom: 8,
    },
    tabsContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    tabBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    tabBtnActive: {
        backgroundColor: Colors.primary + '15',
        borderColor: Colors.primary,
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '600' as const,
        color: Colors.textMuted,
    },
    tabLabelActive: {
        color: Colors.primary,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    overviewGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16,
    },
    statBox: {
        flexGrow: 1,
        flexBasis: '46%' as unknown as number,
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statNumber: {
        fontSize: 28,
        fontWeight: '900' as const,
        color: Colors.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600' as const,
        color: Colors.textMuted,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
    },
    highlightCard: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    highlightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    highlightTitle: {
        fontSize: 12,
        fontWeight: '700' as const,
        color: Colors.textMuted,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
    },
    highlightValue: {
        fontSize: 15,
        fontWeight: '700' as const,
        color: Colors.textPrimary,
    },
    highlightSub: {
        fontSize: 12,
        fontWeight: '500' as const,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        paddingHorizontal: 14,
        gap: 10,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    searchInput: {
        flex: 1,
        color: Colors.textPrimary,
        fontSize: 14,
        paddingVertical: 12,
        fontWeight: '500' as const,
    },
    playerCard: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    playerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    playerRank: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        fontSize: 12,
        fontWeight: '800' as const,
        color: Colors.primary,
    },
    playerInfo: {
        flex: 1,
    },
    playerName: {
        fontSize: 15,
        fontWeight: '700' as const,
        color: Colors.textPrimary,
    },
    playerMatchCount: {
        fontSize: 11,
        color: Colors.textMuted,
        marginTop: 1,
    },
    playerStatsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    miniStat: {
        alignItems: 'center',
        flex: 1,
    },
    miniStatValue: {
        fontSize: 15,
        fontWeight: '800' as const,
        color: Colors.textPrimary,
    },
    miniStatLabel: {
        fontSize: 10,
        fontWeight: '600' as const,
        color: Colors.textMuted,
        marginTop: 2,
        textTransform: 'uppercase' as const,
    },
    teamCard: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    teamName: {
        fontSize: 16,
        fontWeight: '700' as const,
        color: Colors.textPrimary,
        marginBottom: 12,
    },
    teamStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    teamStatItem: {
        alignItems: 'center',
        flex: 1,
    },
    teamStatValue: {
        fontSize: 16,
        fontWeight: '800' as const,
        color: Colors.textPrimary,
    },
    teamStatLabel: {
        fontSize: 10,
        fontWeight: '600' as const,
        color: Colors.textMuted,
        marginTop: 2,
    },
    winRateBar: {
        height: 4,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 2,
        marginBottom: 6,
        overflow: 'hidden',
    },
    winRateFill: {
        height: 4,
        backgroundColor: Colors.primary,
        borderRadius: 2,
    },
    winRateText: {
        fontSize: 11,
        color: Colors.textSecondary,
        fontWeight: '500' as const,
    },
    h2hPickerCard: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    h2hPickerLabel: {
        color: Colors.textSecondary,
        fontSize: 13,
        fontWeight: '500' as const,
        marginBottom: 12,
    },
    h2hInputLabel: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '700' as const,
        letterSpacing: 0.5,
        textTransform: 'uppercase' as const,
        marginBottom: 6,
        marginTop: 4,
    },
    h2hChipsScroll: {
        marginBottom: 8,
    },
    h2hChips: {
        flexDirection: 'row',
        gap: 6,
    },
    h2hChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    h2hChipActive: {
        backgroundColor: Colors.primary + '18',
        borderColor: Colors.primary,
    },
    h2hChipText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '600' as const,
    },
    h2hChipTextActive: {
        color: Colors.primary,
    },
    h2hResultCard: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    h2hTitle: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '700' as const,
        textAlign: 'center',
    },
    h2hSubtitle: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '500' as const,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 16,
    },
    h2hScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    h2hTeamBlock: {
        flex: 1,
        alignItems: 'center',
    },
    h2hTeamName: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '600' as const,
        marginBottom: 6,
    },
    h2hWins: {
        fontSize: 32,
        fontWeight: '900' as const,
    },
    h2hWinsLabel: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '600' as const,
        textTransform: 'uppercase' as const,
        marginTop: 2,
    },
    h2hDivider: {
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    h2hVsText: {
        color: Colors.textMuted,
        fontSize: 14,
        fontWeight: '600' as const,
    },
    h2hTies: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '500' as const,
        marginTop: 4,
    },
    h2hBar: {
        flexDirection: 'row',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 16,
    },
    h2hBarFill: {
        height: 6,
    },
    h2hBarTeam1: {
        backgroundColor: Colors.primary,
    },
    h2hBarTie: {
        backgroundColor: Colors.textMuted,
    },
    h2hBarTeam2: {
        backgroundColor: Colors.accent,
    },
    h2hMatchList: {
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: 12,
    },
    h2hMatchListTitle: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '800' as const,
        letterSpacing: 1,
        marginBottom: 10,
    },
    h2hMatchItem: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border + '40',
    },
    h2hMatchDate: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '500' as const,
        marginBottom: 4,
    },
    h2hMatchScores: {
        gap: 2,
        marginBottom: 4,
    },
    h2hMatchScore: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '500' as const,
    },
    h2hMatchResult: {
        color: Colors.primary,
        fontSize: 11,
        fontWeight: '600' as const,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700' as const,
        color: Colors.textPrimary,
        marginTop: 8,
    },
    emptySub: {
        fontSize: 13,
        color: Colors.textMuted,
        textAlign: 'center',
    },
});
