import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { X, TrendingUp, Target, Award } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { PlayerInningsRecord } from '@/types/cricket';
import { formatDate } from '@/utils/cricket';

interface PlayerStats {
    name: string;
    matches: number;
    runs: number;
    balls: number;
    wickets: number;
    runsConceded: number;
    ballsBowled: number;
    highScore: number;
    fours: number;
    sixes: number;
    bestBowling: string;
    strikeRate: string;
    average: string;
    economy: string;
}

interface PlayerDetailModalProps {
    visible: boolean;
    onClose: () => void;
    player: PlayerStats | null;
    inningsHistory: PlayerInningsRecord[];
}

function FormDot({ runs, isOut }: { runs: number; isOut: boolean }) {
    let bg = Colors.primary + '30';
    let color = Colors.primary;

    if (isOut && runs < 10) {
        bg = Colors.danger + '30';
        color = Colors.danger;
    } else if (runs >= 50) {
        bg = Colors.accent + '30';
        color = Colors.accent;
    } else if (runs >= 30) {
        bg = Colors.primary + '40';
        color = Colors.primaryLight;
    } else if (runs >= 15) {
        bg = Colors.primary + '25';
        color = Colors.primary;
    }

    return (
        <View style={[styles.formDot, { backgroundColor: bg }]}>
            <Text style={[styles.formDotText, { color }]}>{runs}</Text>
            {isOut && <View style={[styles.formOutIndicator, { backgroundColor: color }]} />}
        </View>
    );
}

export default function PlayerDetailModal({ visible, onClose, player, inningsHistory }: PlayerDetailModalProps) {
    const last5 = useMemo(() => {
        return inningsHistory.filter(r => r.balls > 0 || r.runs > 0).slice(0, 5);
    }, [inningsHistory]);

    const last5BowlingPerfs = useMemo(() => {
        return inningsHistory.filter(r => r.oversBowled !== '0.0').slice(0, 5);
    }, [inningsHistory]);

    if (!player) return null;

    const battingAvg = player.matches > 0 ? (player.runs / player.matches).toFixed(1) : '0.0';
    const bowlingAvg = player.wickets > 0 ? (player.runsConceded / player.wickets).toFixed(1) : '-';

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.headerInfo}>
                            <Text style={styles.playerName}>{player.name}</Text>
                            <Text style={styles.matchCount}>{player.matches} match{player.matches !== 1 ? 'es' : ''}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{player.runs}</Text>
                                <Text style={styles.statLabel}>Runs</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{player.highScore}</Text>
                                <Text style={styles.statLabel}>HS</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{battingAvg}</Text>
                                <Text style={styles.statLabel}>Avg</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{player.strikeRate}</Text>
                                <Text style={styles.statLabel}>SR</Text>
                            </View>
                        </View>

                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{player.fours}</Text>
                                <Text style={styles.statLabel}>4s</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{player.sixes}</Text>
                                <Text style={styles.statLabel}>6s</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={[styles.statValue, { color: Colors.danger }]}>{player.wickets}</Text>
                                <Text style={styles.statLabel}>Wkts</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{player.economy}</Text>
                                <Text style={styles.statLabel}>Eco</Text>
                            </View>
                        </View>

                        {player.wickets > 0 && (
                            <View style={styles.bowlingCard}>
                                <View style={styles.bowlingRow}>
                                    <Target size={14} color={Colors.danger} />
                                    <Text style={styles.bowlingTitle}>Bowling</Text>
                                </View>
                                <Text style={styles.bowlingDetail}>
                                    Best: {player.bestBowling} | Avg: {bowlingAvg} | Eco: {player.economy}
                                </Text>
                            </View>
                        )}

                        {last5.length > 0 && (
                            <View style={styles.formSection}>
                                <View style={styles.sectionHeader}>
                                    <TrendingUp size={14} color={Colors.accent} />
                                    <Text style={styles.sectionTitle}>BATTING FORM (Last 5)</Text>
                                </View>
                                <View style={styles.formRow}>
                                    {last5.map((rec, idx) => (
                                        <FormDot key={idx} runs={rec.runs} isOut={rec.isOut} />
                                    ))}
                                </View>
                                <View style={styles.formLegend}>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: Colors.accent + '50' }]} />
                                        <Text style={styles.legendText}>50+</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: Colors.primary + '50' }]} />
                                        <Text style={styles.legendText}>15+</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: Colors.danger + '50' }]} />
                                        <Text style={styles.legendText}>{'<10 & out'}</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {last5BowlingPerfs.length > 0 && (
                            <View style={styles.formSection}>
                                <View style={styles.sectionHeader}>
                                    <Target size={14} color={Colors.danger} />
                                    <Text style={styles.sectionTitle}>BOWLING FORM (Last 5)</Text>
                                </View>
                                <View style={styles.bowlingFormRow}>
                                    {last5BowlingPerfs.map((rec, idx) => (
                                        <View key={idx} style={styles.bowlingFormItem}>
                                            <Text style={[styles.bowlingFormWickets, rec.wickets >= 3 && { color: Colors.accent }]}>
                                                {rec.wickets}/{rec.runsConceded}
                                            </Text>
                                            <Text style={styles.bowlingFormOvers}>{rec.oversBowled}ov</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        <View style={styles.historySection}>
                            <View style={styles.sectionHeader}>
                                <Award size={14} color={Colors.primary} />
                                <Text style={styles.sectionTitle}>INNINGS HISTORY</Text>
                            </View>

                            {inningsHistory.length === 0 ? (
                                <Text style={styles.noHistory}>No innings recorded yet</Text>
                            ) : (
                                inningsHistory.map((rec, idx) => (
                                    <View key={idx} style={styles.inningsItem}>
                                        <View style={styles.inningsLeft}>
                                            <Text style={styles.inningsOpponent}>vs {rec.opponent}</Text>
                                            <Text style={styles.inningsDate}>{formatDate(rec.matchDate)}</Text>
                                            {rec.venue && <Text style={styles.inningsVenue}>{rec.venue}</Text>}
                                        </View>
                                        <View style={styles.inningsRight}>
                                            {(rec.balls > 0 || rec.runs > 0) && (
                                                <View style={styles.inningsStatRow}>
                                                    <Text style={[styles.inningsRuns, rec.runs >= 50 && { color: Colors.accent }]}>
                                                        {rec.runs}{rec.isOut ? '' : '*'}
                                                    </Text>
                                                    <Text style={styles.inningsBalls}>({rec.balls}b)</Text>
                                                </View>
                                            )}
                                            {rec.oversBowled !== '0.0' && (
                                                <Text style={styles.inningsBowling}>
                                                    {rec.wickets}/{rec.runsConceded} ({rec.oversBowled}ov)
                                                </Text>
                                            )}
                                            {rec.isOut && rec.howOut && (
                                                <Text style={styles.inningsHowOut}>{rec.howOut}</Text>
                                            )}
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerInfo: {
        flex: 1,
    },
    playerName: {
        color: Colors.textPrimary,
        fontSize: 20,
        fontWeight: '800' as const,
    },
    matchCount: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '500' as const,
        marginTop: 2,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    statBox: {
        flex: 1,
        backgroundColor: Colors.card,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statValue: {
        color: Colors.primary,
        fontSize: 18,
        fontWeight: '800' as const,
    },
    statLabel: {
        color: Colors.textMuted,
        fontSize: 9,
        fontWeight: '700' as const,
        letterSpacing: 0.3,
        textTransform: 'uppercase' as const,
        marginTop: 2,
    },
    bowlingCard: {
        backgroundColor: Colors.card,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    bowlingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    bowlingTitle: {
        color: Colors.textMuted,
        fontSize: 11,
        fontWeight: '700' as const,
        textTransform: 'uppercase' as const,
    },
    bowlingDetail: {
        color: Colors.textSecondary,
        fontSize: 13,
        fontWeight: '500' as const,
    },
    formSection: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    sectionTitle: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '800' as const,
        letterSpacing: 1,
    },
    formRow: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        marginBottom: 10,
    },
    formDot: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    formDotText: {
        fontSize: 14,
        fontWeight: '800' as const,
    },
    formOutIndicator: {
        position: 'absolute',
        bottom: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    formLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        color: Colors.textMuted,
        fontSize: 9,
        fontWeight: '500' as const,
    },
    bowlingFormRow: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
    },
    bowlingFormItem: {
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    bowlingFormWickets: {
        color: Colors.textPrimary,
        fontSize: 13,
        fontWeight: '700' as const,
    },
    bowlingFormOvers: {
        color: Colors.textMuted,
        fontSize: 9,
        fontWeight: '500' as const,
        marginTop: 1,
    },
    historySection: {
        marginTop: 4,
    },
    noHistory: {
        color: Colors.textMuted,
        fontSize: 13,
        textAlign: 'center',
        paddingVertical: 20,
    },
    inningsItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        backgroundColor: Colors.card,
        borderRadius: 12,
        padding: 12,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    inningsLeft: {
        flex: 1,
    },
    inningsOpponent: {
        color: Colors.textPrimary,
        fontSize: 13,
        fontWeight: '600' as const,
    },
    inningsDate: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '500' as const,
        marginTop: 2,
    },
    inningsVenue: {
        color: Colors.textMuted,
        fontSize: 10,
        marginTop: 1,
    },
    inningsRight: {
        alignItems: 'flex-end',
    },
    inningsStatRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    inningsRuns: {
        color: Colors.textPrimary,
        fontSize: 18,
        fontWeight: '800' as const,
    },
    inningsBalls: {
        color: Colors.textMuted,
        fontSize: 11,
        fontWeight: '500' as const,
    },
    inningsBowling: {
        color: Colors.textSecondary,
        fontSize: 11,
        fontWeight: '500' as const,
        marginTop: 2,
    },
    inningsHowOut: {
        color: Colors.danger,
        fontSize: 9,
        fontWeight: '500' as const,
        marginTop: 2,
    },
});
