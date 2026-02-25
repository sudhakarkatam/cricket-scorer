import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Copy, Trash2, RefreshCw, Award, FileText, ChevronDown, ChevronUp, X, Download, MessageSquare } from 'lucide-react-native';
import { Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useMatches } from '@/providers/MatchProvider';
import { getOversString, getStrikeRate, getEconomyRate, formatDate, getOverByOverSummary, getPhaseStats, getBowlerSpells, calculateMVP } from '@/utils/cricket';
import { Innings } from '@/types/cricket';

function InningsScorecard({ innings, label, totalOvers }: { innings: Innings; label: string; totalOvers: number }) {
    const [showOvers, setShowOvers] = useState(false);
    const [showSpells, setShowSpells] = useState(false);

    const activeBatsmen = innings.batsmen.filter(b => b.balls > 0 || b.runs > 0 || b.isOut);
    const activeBowlers = innings.bowlers.filter(b => b.balls > 0 || b.overs > 0);
    const overSummaries = useMemo(() => getOverByOverSummary(innings), [innings]);
    const phaseStats = useMemo(() => getPhaseStats(innings, totalOvers), [innings, totalOvers]);

    return (
        <View style={styles.inningsBlock}>
            <View style={styles.inningsHeader}>
                <Text style={styles.inningsLabel}>{label}</Text>
                <Text style={styles.inningsTeam}>{innings.battingTeam}</Text>
                <Text style={styles.inningsScore}>
                    {innings.totalRuns}/{innings.totalWickets} ({getOversString(innings.totalBalls)})
                </Text>
            </View>

            {totalOvers >= 6 && (
                <View style={styles.phaseCard}>
                    <Text style={styles.phaseTitle}>MATCH PHASES</Text>
                    <View style={styles.phaseRow}>
                        <View style={styles.phaseItem}>
                            <Text style={styles.phaseLabel}>Powerplay</Text>
                            <Text style={styles.phaseValue}>{phaseStats.powerplay.runs}/{phaseStats.powerplay.wickets}</Text>
                            <Text style={styles.phaseOvers}>{phaseStats.powerplay.overs} ov</Text>
                        </View>
                        <View style={[styles.phaseItem, styles.phaseMid]}>
                            <Text style={styles.phaseLabel}>Middle</Text>
                            <Text style={styles.phaseValue}>{phaseStats.middle.runs}/{phaseStats.middle.wickets}</Text>
                            <Text style={styles.phaseOvers}>{phaseStats.middle.overs} ov</Text>
                        </View>
                        <View style={styles.phaseItem}>
                            <Text style={styles.phaseLabel}>Death</Text>
                            <Text style={styles.phaseValue}>{phaseStats.death.runs}/{phaseStats.death.wickets}</Text>
                            <Text style={styles.phaseOvers}>{phaseStats.death.overs} ov</Text>
                        </View>
                    </View>
                </View>
            )}

            <View style={styles.tableSection}>
                <Text style={styles.tableTitle}>BATTING</Text>
                <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderCell, styles.nameCell]}>Batter</Text>
                    <Text style={styles.tableHeaderCell}>R</Text>
                    <Text style={styles.tableHeaderCell}>B</Text>
                    <Text style={styles.tableHeaderCell}>4s</Text>
                    <Text style={styles.tableHeaderCell}>6s</Text>
                    <Text style={[styles.tableHeaderCell, styles.srCell]}>SR</Text>
                </View>
                {activeBatsmen.map((b) => (
                    <View key={b.id} style={styles.tableRow}>
                        <View style={styles.nameCell}>
                            <Text style={styles.playerName} numberOfLines={1}>{b.name}</Text>
                            {b.isOut && (
                                <Text style={styles.howOut} numberOfLines={1}>
                                    {b.howOut}{b.bowlerName ? ` b ${b.bowlerName}` : ''}
                                </Text>
                            )}
                            {!b.isOut && b.balls > 0 && (
                                <Text style={styles.notOut}>not out</Text>
                            )}
                        </View>
                        <Text style={[styles.tableCell, styles.runsCell]}>{b.runs}</Text>
                        <Text style={styles.tableCell}>{b.balls}</Text>
                        <Text style={styles.tableCell}>{b.fours}</Text>
                        <Text style={styles.tableCell}>{b.sixes}</Text>
                        <Text style={[styles.tableCell, styles.srCell]}>{getStrikeRate(b.runs, b.balls)}</Text>
                    </View>
                ))}
                <View style={styles.extrasRow}>
                    <Text style={styles.extrasLabel}>Extras</Text>
                    <Text style={styles.extrasValue}>
                        {innings.extras.total} (Wd {innings.extras.wides}, Nb {innings.extras.noBalls}, B {innings.extras.byes}, Lb {innings.extras.legByes})
                    </Text>
                </View>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                        {innings.totalRuns}/{innings.totalWickets} ({getOversString(innings.totalBalls)} ov)
                    </Text>
                </View>
            </View>

            <View style={styles.tableSection}>
                <Text style={styles.tableTitle}>BOWLING</Text>
                <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderCell, styles.nameCell]}>Bowler</Text>
                    <Text style={styles.tableHeaderCell}>O</Text>
                    <Text style={styles.tableHeaderCell}>M</Text>
                    <Text style={styles.tableHeaderCell}>R</Text>
                    <Text style={styles.tableHeaderCell}>W</Text>
                    <Text style={[styles.tableHeaderCell, styles.srCell]}>Eco</Text>
                </View>
                {activeBowlers.map((b) => (
                    <View key={b.id} style={styles.tableRow}>
                        <View style={styles.nameCell}>
                            <Text style={styles.playerName} numberOfLines={1}>{b.name}</Text>
                        </View>
                        <Text style={styles.tableCell}>{b.overs}.{b.balls}</Text>
                        <Text style={styles.tableCell}>{b.maidens}</Text>
                        <Text style={styles.tableCell}>{b.runs}</Text>
                        <Text style={[styles.tableCell, styles.wicketsCell]}>{b.wickets}</Text>
                        <Text style={[styles.tableCell, styles.srCell]}>
                            {getEconomyRate(b.runs, b.overs * 6 + b.balls)}
                        </Text>
                    </View>
                ))}

                <TouchableOpacity
                    style={styles.expandBtn}
                    onPress={() => setShowSpells(!showSpells)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.expandBtnText}>Bowling Spells</Text>
                    {showSpells ? <ChevronUp size={14} color={Colors.textMuted} /> : <ChevronDown size={14} color={Colors.textMuted} />}
                </TouchableOpacity>

                {showSpells && activeBowlers.map(b => {
                    const spells = getBowlerSpells(innings, b.id);
                    if (spells.length === 0) return null;
                    return (
                        <View key={b.id + '-spell'} style={styles.spellRow}>
                            <Text style={styles.spellBowlerName}>{b.name}</Text>
                            <View style={styles.spellChips}>
                                {spells.map((s, i) => (
                                    <View key={i} style={styles.spellChip}>
                                        <Text style={styles.spellText}>
                                            Ov {s.overStart}{s.overEnd !== s.overStart ? `-${s.overEnd}` : ''}: {Math.floor(s.balls / 6)}.{s.balls % 6}-{s.runs}-{s.wickets}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    );
                })}
            </View>

            <TouchableOpacity
                style={styles.expandBtn}
                onPress={() => setShowOvers(!showOvers)}
                activeOpacity={0.7}
            >
                <Text style={styles.expandBtnText}>Over by Over ({overSummaries.length} overs)</Text>
                {showOvers ? <ChevronUp size={14} color={Colors.textMuted} /> : <ChevronDown size={14} color={Colors.textMuted} />}
            </TouchableOpacity>

            {showOvers && (
                <View style={styles.overSummaryCard}>
                    {overSummaries.map(over => (
                        <View key={over.overNumber} style={styles.overSummaryRow}>
                            <View style={styles.overNumBadge}>
                                <Text style={styles.overNumText}>{over.overNumber}</Text>
                            </View>
                            <Text style={styles.overBowler} numberOfLines={1}>{over.bowlerName}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.overBallsScroll}>
                                <View style={styles.overBallsRow}>
                                    {over.balls.map((ball, i) => (
                                        <Text key={i} style={[styles.overBallText, getBallStyle(ball)]}>
                                            {ball}
                                        </Text>
                                    ))}
                                </View>
                            </ScrollView>
                            <Text style={styles.overRunsTotal}>{over.runs}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

function getBallStyle(ball: string) {
    if (ball === 'W') return { color: Colors.wicket };
    if (ball === '4') return { color: Colors.four };
    if (ball === '6') return { color: Colors.six };
    if (ball === '0') return { color: Colors.textMuted };
    if (ball.includes('Wd') || ball.includes('Nb') || ball.includes('B') || ball.includes('Lb')) return { color: Colors.extras };
    return { color: Colors.textSecondary };
}

export default function ScorecardScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { getMatch, getMatchSummaryText, deleteMatch, duplicateMatch, addMatchNote, getMatchCSV } = useMatches();
    const router = useRouter();
    const match = getMatch(id ?? '');

    const [activeTab, setActiveTab] = useState<0 | 1>(0);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteText, setNoteText] = useState('');

    if (!match) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: 'Scorecard' }} />
                <Text style={styles.errorText}>Match not found</Text>
            </View>
        );
    }

    const firstInnings = match.innings[0];
    const secondInnings = match.innings[1];

    const mvpData = useMemo(() => {
        if (match.status !== 'completed') return null;
        return calculateMVP(match);
    }, [match]);

    const handleCopy = async () => {
        const text = getMatchSummaryText(match.id);
        await Share.share({ message: text });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleExportCSV = async () => {
        const csv = getMatchCSV(match.id);
        await Share.share({ message: csv });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleDelete = () => {
        Alert.alert('Delete Match', 'Are you sure you want to delete this match?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    deleteMatch(match.id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    router.back();
                },
            },
        ]);
    };

    const handleRematch = () => {
        const newMatch = duplicateMatch(match.id);
        if (newMatch) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace(`/scoring/${newMatch.id}` as any);
        }
    };

    const openNoteModal = () => {
        setNoteText(match.notes ?? '');
        setShowNoteModal(true);
    };

    const saveNote = () => {
        addMatchNote(match.id, noteText.trim());
        setShowNoteModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: `${match.team1} vs ${match.team2}` }} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.matchInfo}>
                    <Text style={styles.matchDate}>{formatDate(match.date)}</Text>
                    {match.venue && <Text style={styles.matchVenue}>{match.venue}</Text>}
                    <Text style={styles.tossInfo}>
                        Toss: {match.tossWinner} elected to {match.tossChoice}
                    </Text>
                    <View style={styles.matchActions}>
                        <TouchableOpacity style={styles.actionChip} onPress={handleCopy} activeOpacity={0.7}>
                            <Copy size={14} color={Colors.primary} />
                            <Text style={styles.actionChipText}>Copy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionChip} onPress={handleExportCSV} activeOpacity={0.7}>
                            <Download size={14} color={Colors.accent} />
                            <Text style={[styles.actionChipText, { color: Colors.accent }]}>CSV</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionChip} onPress={handleRematch} activeOpacity={0.7}>
                            <RefreshCw size={14} color={Colors.primary} />
                            <Text style={styles.actionChipText}>Rematch</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionChip, styles.deleteChip]} onPress={handleDelete} activeOpacity={0.7}>
                            <Trash2 size={14} color={Colors.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                {match.result && (
                    <View style={styles.resultBanner}>
                        <Text style={styles.resultText}>{match.result}</Text>
                    </View>
                )}

                {(match.mvp || mvpData) && (
                    <View style={styles.mvpBanner}>
                        <Award size={18} color={Colors.accent} />
                        <View style={styles.mvpInfo}>
                            <Text style={styles.mvpTitle}>Man of the Match</Text>
                            <Text style={styles.mvpName}>{match.mvp || mvpData?.name}</Text>
                            {mvpData && (
                                <Text style={styles.mvpStats}>
                                    {mvpData.runs > 0 ? `${mvpData.runs} runs` : ''}
                                    {mvpData.runs > 0 && mvpData.wickets > 0 ? ' & ' : ''}
                                    {mvpData.wickets > 0 ? `${mvpData.wickets} wickets` : ''}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                <TouchableOpacity style={styles.noteBtn} onPress={openNoteModal} activeOpacity={0.7}>
                    <MessageSquare size={14} color={Colors.textMuted} />
                    <Text style={styles.noteBtnText}>
                        {match.notes ? 'View/Edit Notes' : 'Add Match Notes'}
                    </Text>
                </TouchableOpacity>

                {match.notes && (
                    <View style={styles.notePreview}>
                        <Text style={styles.notePreviewText} numberOfLines={3}>{match.notes}</Text>
                    </View>
                )}

                {secondInnings && (
                    <View style={styles.tabsRow}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 0 && styles.tabActive]}
                            onPress={() => setActiveTab(0)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}>
                                1st Innings
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 1 && styles.tabActive]}
                            onPress={() => setActiveTab(1)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}>
                                2nd Innings
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {activeTab === 0 && firstInnings && (
                    <InningsScorecard innings={firstInnings} label="1st Innings" totalOvers={match.totalOvers} />
                )}
                {activeTab === 1 && secondInnings && (
                    <InningsScorecard innings={secondInnings} label="2nd Innings" totalOvers={match.totalOvers} />
                )}
            </ScrollView>

            <Modal visible={showNoteModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Match Notes</Text>
                            <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                                <X size={22} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.noteInput}
                            placeholder="Add notes about the match..."
                            placeholderTextColor={Colors.textMuted}
                            value={noteText}
                            onChangeText={setNoteText}
                            multiline
                            numberOfLines={6}
                            textAlignVertical="top"
                        />
                        <TouchableOpacity style={styles.saveNoteBtn} onPress={saveNote} activeOpacity={0.8}>
                            <Text style={styles.saveNoteBtnText}>Save Notes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    matchInfo: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        gap: 4,
    },
    matchDate: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '500' as const,
    },
    matchVenue: {
        color: Colors.textSecondary,
        fontSize: 13,
        fontWeight: '500' as const,
    },
    tossInfo: {
        color: Colors.textMuted,
        fontSize: 11,
        marginTop: 2,
    },
    matchActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    actionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: Colors.primary + '12',
        borderWidth: 1,
        borderColor: Colors.primary + '30',
    },
    actionChipText: {
        fontSize: 12,
        fontWeight: '600' as const,
        color: Colors.primary,
    },
    deleteChip: {
        backgroundColor: Colors.danger + '12',
        borderColor: Colors.danger + '30',
    },
    resultBanner: {
        backgroundColor: Colors.primary + '15',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primary + '30',
    },
    resultText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '700' as const,
    },
    mvpBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: Colors.accent + '12',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.accent + '25',
    },
    mvpInfo: {
        flex: 1,
    },
    mvpTitle: {
        color: Colors.accent,
        fontSize: 10,
        fontWeight: '800' as const,
        letterSpacing: 0.5,
        textTransform: 'uppercase' as const,
    },
    mvpName: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '700' as const,
        marginTop: 2,
    },
    mvpStats: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '500' as const,
        marginTop: 2,
    },
    noteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: Colors.card,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    noteBtnText: {
        color: Colors.textMuted,
        fontSize: 13,
        fontWeight: '500' as const,
    },
    notePreview: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: Colors.accent,
    },
    notePreviewText: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '400' as const,
        lineHeight: 18,
    },
    tabsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    tabActive: {
        backgroundColor: Colors.primary + '20',
        borderColor: Colors.primary,
    },
    tabText: {
        color: Colors.textMuted,
        fontSize: 13,
        fontWeight: '600' as const,
    },
    tabTextActive: {
        color: Colors.primary,
    },
    inningsBlock: {
        gap: 12,
    },
    inningsHeader: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    inningsLabel: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '800' as const,
        letterSpacing: 1,
        marginBottom: 4,
    },
    inningsTeam: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '700' as const,
        marginBottom: 2,
    },
    inningsScore: {
        color: Colors.primary,
        fontSize: 22,
        fontWeight: '800' as const,
    },
    phaseCard: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    phaseTitle: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '800' as const,
        letterSpacing: 1.5,
        marginBottom: 10,
    },
    phaseRow: {
        flexDirection: 'row',
    },
    phaseItem: {
        flex: 1,
        alignItems: 'center',
    },
    phaseMid: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: Colors.border,
    },
    phaseLabel: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '600' as const,
        marginBottom: 4,
        textTransform: 'uppercase' as const,
    },
    phaseValue: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '800' as const,
    },
    phaseOvers: {
        color: Colors.textSecondary,
        fontSize: 10,
        fontWeight: '500' as const,
        marginTop: 2,
    },
    tableSection: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    tableTitle: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '800' as const,
        letterSpacing: 1.5,
        marginBottom: 10,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        marginBottom: 4,
    },
    tableHeaderCell: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '700' as const,
        width: 32,
        textAlign: 'center',
    },
    nameCell: {
        flex: 1,
    },
    srCell: {
        width: 42,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border + '40',
    },
    playerName: {
        color: Colors.textPrimary,
        fontSize: 13,
        fontWeight: '600' as const,
    },
    howOut: {
        color: Colors.textMuted,
        fontSize: 10,
        marginTop: 1,
    },
    notOut: {
        color: Colors.primary,
        fontSize: 10,
        marginTop: 1,
        fontWeight: '500' as const,
    },
    tableCell: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '500' as const,
        width: 32,
        textAlign: 'center',
    },
    runsCell: {
        color: Colors.textPrimary,
        fontWeight: '700' as const,
    },
    wicketsCell: {
        color: Colors.primary,
        fontWeight: '700' as const,
    },
    extrasRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border + '40',
    },
    extrasLabel: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '600' as const,
    },
    extrasValue: {
        color: Colors.textSecondary,
        fontSize: 12,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 10,
    },
    totalLabel: {
        color: Colors.textPrimary,
        fontSize: 13,
        fontWeight: '700' as const,
    },
    totalValue: {
        color: Colors.textPrimary,
        fontSize: 13,
        fontWeight: '700' as const,
    },
    expandBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        marginTop: 8,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    expandBtnText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '600' as const,
    },
    spellRow: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border + '30',
    },
    spellBowlerName: {
        color: Colors.textPrimary,
        fontSize: 12,
        fontWeight: '600' as const,
        marginBottom: 4,
    },
    spellChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    spellChip: {
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    spellText: {
        color: Colors.textSecondary,
        fontSize: 10,
        fontWeight: '500' as const,
    },
    overSummaryCard: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    overSummaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border + '30',
        gap: 8,
    },
    overNumBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    overNumText: {
        color: Colors.textSecondary,
        fontSize: 10,
        fontWeight: '800' as const,
    },
    overBowler: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '500' as const,
        width: 50,
    },
    overBallsScroll: {
        flex: 1,
    },
    overBallsRow: {
        flexDirection: 'row',
        gap: 4,
    },
    overBallText: {
        fontSize: 11,
        fontWeight: '600' as const,
        minWidth: 18,
        textAlign: 'center',
    },
    overRunsTotal: {
        color: Colors.textPrimary,
        fontSize: 12,
        fontWeight: '800' as const,
        width: 24,
        textAlign: 'right',
    },
    errorText: {
        color: Colors.textPrimary,
        fontSize: 16,
        textAlign: 'center',
        marginTop: 100,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 36,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        color: Colors.textPrimary,
        fontSize: 18,
        fontWeight: '700' as const,
    },
    noteInput: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        padding: 14,
        color: Colors.textPrimary,
        fontSize: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        minHeight: 120,
        marginBottom: 14,
    },
    saveNoteBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    saveNoteBtnText: {
        color: Colors.white,
        fontSize: 15,
        fontWeight: '700' as const,
    },
});
