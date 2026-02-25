import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Animated,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { CircleDot, ChevronRight, Zap, Clock, Coins, Calculator, Users, FileDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Share } from 'react-native';
import Colors from '@/constants/colors';
import { useMatches } from '@/providers/MatchProvider';
import { Match } from '@/types/cricket';
import { getOversString, exportMatchCSV } from '@/utils/cricket';
import CoinToss from '@/components/CoinToss';

function LiveMatchCard({ match }: { match: Match }) {
    const router = useRouter();
    const innings = match.innings[match.currentInnings];

    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [pulseAnim]);

    return (
        <TouchableOpacity
            style={styles.liveCard}
            onPress={() => router.push(`/scoring/${match.id}` as any)}
            activeOpacity={0.8}
            testID="live-match-card"
        >
            <View style={styles.liveHeader}>
                <View style={styles.liveBadge}>
                    <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
                <Text style={styles.oversText}>
                    {match.totalOvers} overs
                </Text>
            </View>

            <View style={styles.teamsRow}>
                <View style={styles.teamBlock}>
                    <Text style={styles.teamName} numberOfLines={1}>
                        {innings?.battingTeam ?? match.team1}
                    </Text>
                    {innings && (
                        <Text style={styles.scoreText}>
                            {innings.totalRuns}/{innings.totalWickets}
                            <Text style={styles.oversSmall}> ({getOversString(innings.totalBalls)})</Text>
                        </Text>
                    )}
                </View>
                <Text style={styles.vsText}>vs</Text>
                <View style={[styles.teamBlock, styles.teamBlockRight]}>
                    <Text style={[styles.teamName, styles.teamNameRight]} numberOfLines={1}>
                        {innings?.bowlingTeam ?? match.team2}
                    </Text>
                    {match.currentInnings === 1 && match.innings[0] && (
                        <Text style={[styles.scoreText, styles.scoreTextRight]}>
                            {match.innings[0].totalRuns}/{match.innings[0].totalWickets}
                            <Text style={styles.oversSmall}> ({getOversString(match.innings[0].totalBalls)})</Text>
                        </Text>
                    )}
                </View>
            </View>

            {match.currentInnings === 1 && match.innings[0] && innings && (
                <View style={styles.targetRow}>
                    <Text style={styles.targetText}>
                        Need {match.innings[0].totalRuns + 1 - innings.totalRuns} from{' '}
                        {match.totalOvers * 6 - innings.totalBalls} balls
                    </Text>
                </View>
            )}

            <View style={styles.cardFooter}>
                <Text style={styles.tapText}>Tap to score</Text>
                <ChevronRight size={16} color={Colors.primary} />
            </View>
        </TouchableOpacity>
    );
}

function CompletedMatchCard({ match }: { match: Match }) {
    const router = useRouter();
    const firstInnings = match.innings[0];
    const secondInnings = match.innings[1];

    return (
        <TouchableOpacity
            style={styles.completedCard}
            onPress={() => router.push(`/scorecard/${match.id}` as any)}
            activeOpacity={0.8}
            testID="completed-match-card"
        >
            <View style={styles.completedHeader}>
                <Text style={styles.completedDate}>{new Date(match.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                {match.mvp && <Text style={styles.mvpBadge}>MVP: {match.mvp}</Text>}
            </View>

            <View style={styles.completedTeams}>
                <View style={styles.completedTeamRow}>
                    <Text style={styles.completedTeamName} numberOfLines={1}>{firstInnings?.battingTeam}</Text>
                    <Text style={styles.completedScore}>
                        {firstInnings?.totalRuns}/{firstInnings?.totalWickets}
                        <Text style={styles.oversSmall}> ({getOversString(firstInnings?.totalBalls ?? 0)})</Text>
                    </Text>
                </View>
                {secondInnings && (
                    <View style={styles.completedTeamRow}>
                        <Text style={styles.completedTeamName} numberOfLines={1}>{secondInnings.battingTeam}</Text>
                        <Text style={styles.completedScore}>
                            {secondInnings.totalRuns}/{secondInnings.totalWickets}
                            <Text style={styles.oversSmall}> ({getOversString(secondInnings.totalBalls)})</Text>
                        </Text>
                    </View>
                )}
            </View>

            {match.result && (
                <Text style={styles.resultText}>{match.result}</Text>
            )}
        </TouchableOpacity>
    );
}

export default function HomeScreen() {
    const { liveMatches, completedMatches, matches } = useMatches();
    const router = useRouter();
    const [refreshing, setRefreshing] = React.useState(false);
    const [showToss, setShowToss] = useState(false);

    const recentCompleted = completedMatches.slice(0, 5);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 500);
    }, []);

    const handleExportAll = async () => {
        if (matches.length === 0) return;
        let allCsv = '';
        matches.filter(m => m.status === 'completed').forEach(m => {
            allCsv += exportMatchCSV(m) + '\n---\n\n';
        });
        if (allCsv) {
            await Share.share({ message: allCsv });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <TouchableOpacity
                            style={styles.tossHeaderBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setShowToss(true);
                            }}
                            activeOpacity={0.7}
                        >
                            <Coins size={20} color={Colors.accent} />
                        </TouchableOpacity>
                    ),
                }}
            />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                }
            >
                {liveMatches.length === 0 && recentCompleted.length === 0 && (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Zap size={48} color={Colors.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>No matches yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Start a new match and begin scoring!
                        </Text>
                        <TouchableOpacity
                            style={styles.startButton}
                            onPress={() => router.push('/new-match' as any)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.startButtonText}>Start New Match</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.toolsSection}>
                    <Text style={styles.toolsSectionTitle}>Quick Tools</Text>
                    <View style={styles.toolsRow}>
                        <TouchableOpacity
                            style={styles.toolCard}
                            onPress={() => router.push('/dls-calculator' as any)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.toolIcon, { backgroundColor: Colors.accent + '18' }]}>
                                <Calculator size={18} color={Colors.accent} />
                            </View>
                            <Text style={styles.toolLabel}>DLS Calc</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.toolCard}
                            onPress={() => router.push('/roster' as any)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.toolIcon, { backgroundColor: Colors.primary + '18' }]}>
                                <Users size={18} color={Colors.primary} />
                            </View>
                            <Text style={styles.toolLabel}>Rosters</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.toolCard}
                            onPress={handleExportAll}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.toolIcon, { backgroundColor: Colors.four + '18' }]}>
                                <FileDown size={18} color={Colors.four} />
                            </View>
                            <Text style={styles.toolLabel}>Export</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {liveMatches.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <CircleDot size={18} color={Colors.danger} />
                            <Text style={styles.sectionTitle}>Live Matches</Text>
                        </View>
                        {liveMatches.map(match => (
                            <LiveMatchCard key={match.id} match={match} />
                        ))}
                    </View>
                )}

                {recentCompleted.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Clock size={18} color={Colors.textSecondary} />
                            <Text style={styles.sectionTitle}>Recent</Text>
                        </View>
                        {recentCompleted.map(match => (
                            <CompletedMatchCard key={match.id} match={match} />
                        ))}
                    </View>
                )}
            </ScrollView>
            <CoinToss visible={showToss} onClose={() => setShowToss(false)} />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    tossHeaderBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: Colors.accent + '18',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
    },
    toolsSection: {
        marginBottom: 20,
    },
    toolsSectionTitle: {
        color: Colors.textMuted,
        fontSize: 11,
        fontWeight: '700' as const,
        letterSpacing: 0.5,
        textTransform: 'uppercase' as const,
        marginBottom: 10,
    },
    toolsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    toolCard: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    toolIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    toolLabel: {
        color: Colors.textSecondary,
        fontSize: 10,
        fontWeight: '600' as const,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700' as const,
        color: Colors.textPrimary,
        letterSpacing: 0.3,
    },
    liveCard: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
    },
    liveHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.danger + '20',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.danger,
    },
    liveText: {
        color: Colors.danger,
        fontSize: 11,
        fontWeight: '800' as const,
        letterSpacing: 1,
    },
    oversText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '500' as const,
    },
    teamsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    teamBlock: {
        flex: 1,
    },
    teamBlockRight: {
        alignItems: 'flex-end',
    },
    teamName: {
        color: Colors.textPrimary,
        fontSize: 15,
        fontWeight: '700' as const,
        marginBottom: 4,
    },
    teamNameRight: {
        textAlign: 'right' as const,
    },
    scoreText: {
        color: Colors.primary,
        fontSize: 24,
        fontWeight: '800' as const,
    },
    scoreTextRight: {
        textAlign: 'right' as const,
    },
    oversSmall: {
        fontSize: 13,
        color: Colors.textMuted,
        fontWeight: '500' as const,
    },
    vsText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '600' as const,
        marginHorizontal: 12,
    },
    targetRow: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    targetText: {
        color: Colors.accent,
        fontSize: 13,
        fontWeight: '600' as const,
        textAlign: 'center',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 12,
        gap: 4,
    },
    tapText: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: '600' as const,
    },
    completedCard: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    completedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    completedDate: {
        color: Colors.textMuted,
        fontSize: 11,
        fontWeight: '500' as const,
    },
    mvpBadge: {
        color: Colors.accent,
        fontSize: 10,
        fontWeight: '700' as const,
        backgroundColor: Colors.accent + '15',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        overflow: 'hidden',
    },
    completedTeams: {
        gap: 6,
        marginBottom: 10,
    },
    completedTeamRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    completedTeamName: {
        color: Colors.textPrimary,
        fontSize: 14,
        fontWeight: '600' as const,
        flex: 1,
    },
    completedScore: {
        color: Colors.textPrimary,
        fontSize: 15,
        fontWeight: '700' as const,
    },
    resultText: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: '600' as const,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: Colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        color: Colors.textPrimary,
        fontSize: 20,
        fontWeight: '700' as const,
        marginBottom: 8,
    },
    emptySubtitle: {
        color: Colors.textMuted,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 28,
    },
    startButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 12,
    },
    startButtonText: {
        color: Colors.white,
        fontSize: 15,
        fontWeight: '700' as const,
    },
});
