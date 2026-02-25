import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Trophy, Calendar, Search, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Share } from 'react-native';
import Colors from '@/constants/colors';
import { useMatches } from '@/providers/MatchProvider';
import { Match } from '@/types/cricket';
import { getOversString, formatDate } from '@/utils/cricket';

type StatusFilter = 'all' | 'live' | 'completed' | 'abandoned';

function MatchItem({ match, onDelete, onAbandon, onDuplicate, onEdit }: {
    match: Match;
    onDelete: () => void;
    onAbandon: () => void;
    onDuplicate: () => void;
    onEdit: () => void;
}) {
    const router = useRouter();
    const { getMatchSummaryText } = useMatches();
    const firstInnings = match.innings[0];
    const secondInnings = match.innings[1];

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [];

        if (match.status === 'live') {
            buttons.push({ text: 'Continue Scoring', onPress: () => router.push(`/scoring/${match.id}` as any) });
            buttons.push({ text: 'Abandon Match', onPress: onAbandon });
        }
        buttons.push({ text: 'Edit Details', onPress: onEdit });
        buttons.push({ text: 'Rematch', onPress: onDuplicate });
        buttons.push({
            text: 'Copy Summary',
            onPress: () => {
                const text = getMatchSummaryText(match.id);
                Share.share({ message: text });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
        });
        buttons.push({ text: 'Delete', style: 'destructive', onPress: onDelete });
        buttons.push({ text: 'Cancel', style: 'cancel' });

        Alert.alert('Match Options', `${match.team1} vs ${match.team2}`, buttons);
    };

    const getStatusColor = () => {
        if (match.status === 'live') return Colors.danger;
        if (match.status === 'abandoned') return Colors.accent;
        return Colors.primary;
    };

    const getStatusLabel = () => {
        if (match.status === 'live') return 'LIVE';
        if (match.status === 'abandoned') return 'ABANDONED';
        return 'COMPLETED';
    };

    return (
        <TouchableOpacity
            style={styles.matchCard}
            onPress={() => match.status === 'live' ? router.push(`/scoring/${match.id}` as any) : router.push(`/scorecard/${match.id}` as any)}
            onLongPress={handleLongPress}
            activeOpacity={0.8}
        >
            <View style={styles.matchHeader}>
                <View style={styles.dateRow}>
                    <Calendar size={12} color={Colors.textMuted} />
                    <Text style={styles.dateText}>{formatDate(match.date)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor() }]}>
                        {getStatusLabel()}
                    </Text>
                </View>
            </View>

            <View style={styles.scoresBlock}>
                <View style={styles.scoreRow}>
                    <Text style={styles.matchTeamName} numberOfLines={1}>{firstInnings?.battingTeam ?? match.team1}</Text>
                    {firstInnings && (
                        <Text style={styles.matchScore}>
                            {firstInnings.totalRuns}/{firstInnings.totalWickets}
                            <Text style={styles.matchOvers}> ({getOversString(firstInnings.totalBalls)})</Text>
                        </Text>
                    )}
                </View>
                {secondInnings && (
                    <View style={styles.scoreRow}>
                        <Text style={styles.matchTeamName} numberOfLines={1}>{secondInnings.battingTeam}</Text>
                        <Text style={styles.matchScore}>
                            {secondInnings.totalRuns}/{secondInnings.totalWickets}
                            <Text style={styles.matchOvers}> ({getOversString(secondInnings.totalBalls)})</Text>
                        </Text>
                    </View>
                )}
            </View>

            {match.result && (
                <Text style={styles.matchResult}>{match.result}</Text>
            )}

            {match.venue && (
                <Text style={styles.matchVenue}>{match.venue}</Text>
            )}
        </TouchableOpacity>
    );
}

export default function HistoryScreen() {
    const { matches, deleteMatch, abandonMatch, duplicateMatch, editMatchDetails } = useMatches();
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [editModal, setEditModal] = useState<Match | null>(null);
    const [editTeam1, setEditTeam1] = useState('');
    const [editTeam2, setEditTeam2] = useState('');
    const [editVenue, setEditVenue] = useState('');

    const sortedMatches = useMemo(() => {
        let filtered = [...matches].sort((a, b) => b.createdAt - a.createdAt);

        if (statusFilter !== 'all') {
            filtered = filtered.filter(m => m.status === statusFilter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            filtered = filtered.filter(m =>
                m.team1.toLowerCase().includes(q) ||
                m.team2.toLowerCase().includes(q) ||
                (m.venue?.toLowerCase().includes(q) ?? false)
            );
        }

        return filtered;
    }, [matches, search, statusFilter]);

    const handleDelete = (id: string) => {
        Alert.alert('Delete Match', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    deleteMatch(id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
            },
        ]);
    };

    const handleAbandon = (id: string) => {
        Alert.alert('Abandon Match', 'This will end the match as abandoned.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Abandon',
                style: 'destructive',
                onPress: () => {
                    abandonMatch(id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                },
            },
        ]);
    };

    const handleDuplicate = (id: string) => {
        const newMatch = duplicateMatch(id);
        if (newMatch) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.push(`/scoring/${newMatch.id}` as any);
        }
    };

    const openEditModal = (match: Match) => {
        setEditTeam1(match.team1);
        setEditTeam2(match.team2);
        setEditVenue(match.venue ?? '');
        setEditModal(match);
    };

    const confirmEdit = () => {
        if (!editModal) return;
        editMatchDetails(editModal.id, {
            team1: editTeam1.trim() || editModal.team1,
            team2: editTeam2.trim() || editModal.team2,
            venue: editVenue.trim(),
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEditModal(null);
    };

    const filterCounts = useMemo(() => ({
        all: matches.length,
        live: matches.filter(m => m.status === 'live').length,
        completed: matches.filter(m => m.status === 'completed').length,
        abandoned: matches.filter(m => m.status === 'abandoned').length,
    }), [matches]);

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <View style={styles.searchRow}>
                    <Search size={16} color={Colors.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search teams or venue..."
                        placeholderTextColor={Colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <X size={16} color={Colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.filtersRow}>
                    {(['all', 'live', 'completed', 'abandoned'] as StatusFilter[]).map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
                            onPress={() => setStatusFilter(f)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>
                                {f.charAt(0).toUpperCase() + f.slice(1)} ({filterCounts[f]})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <FlatList
                data={sortedMatches}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <MatchItem
                        match={item}
                        onDelete={() => handleDelete(item.id)}
                        onAbandon={() => handleAbandon(item.id)}
                        onDuplicate={() => handleDuplicate(item.id)}
                        onEdit={() => openEditModal(item)}
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Trophy size={44} color={Colors.accent} />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {search || statusFilter !== 'all' ? 'No matches found' : 'No matches yet'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {search || statusFilter !== 'all' ? 'Try adjusting your search or filters' : 'Your match history will appear here'}
                        </Text>
                    </View>
                }
            />

            <Modal visible={editModal !== null} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Match Details</Text>
                            <TouchableOpacity onPress={() => setEditModal(null)}>
                                <X size={22} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.inputLabel}>Team 1</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editTeam1}
                            onChangeText={setEditTeam1}
                            placeholderTextColor={Colors.textMuted}
                        />
                        <Text style={styles.inputLabel}>Team 2</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editTeam2}
                            onChangeText={setEditTeam2}
                            placeholderTextColor={Colors.textMuted}
                        />
                        <Text style={styles.inputLabel}>Venue</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editVenue}
                            onChangeText={setEditVenue}
                            placeholder="Optional"
                            placeholderTextColor={Colors.textMuted}
                        />
                        <TouchableOpacity
                            style={styles.modalBtn}
                            onPress={confirmEdit}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.modalBtnText}>Save Changes</Text>
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
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        paddingHorizontal: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        color: Colors.textPrimary,
        fontSize: 14,
        paddingVertical: 12,
        fontWeight: '500' as const,
    },
    filtersRow: {
        flexDirection: 'row',
        gap: 6,
    },
    filterChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    filterChipActive: {
        backgroundColor: Colors.primary + '15',
        borderColor: Colors.primary,
    },
    filterText: {
        fontSize: 11,
        fontWeight: '600' as const,
        color: Colors.textMuted,
    },
    filterTextActive: {
        color: Colors.primary,
    },
    listContent: {
        padding: 16,
        paddingTop: 8,
        paddingBottom: 32,
    },
    matchCard: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    matchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    dateText: {
        color: Colors.textMuted,
        fontSize: 11,
        fontWeight: '500' as const,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '800' as const,
        letterSpacing: 0.5,
    },
    scoresBlock: {
        gap: 6,
        marginBottom: 8,
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    matchTeamName: {
        color: Colors.textPrimary,
        fontSize: 14,
        fontWeight: '600' as const,
        flex: 1,
    },
    matchScore: {
        color: Colors.textPrimary,
        fontSize: 15,
        fontWeight: '700' as const,
    },
    matchOvers: {
        fontSize: 12,
        color: Colors.textMuted,
        fontWeight: '500' as const,
    },
    matchResult: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: '600' as const,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    matchVenue: {
        color: Colors.textMuted,
        fontSize: 11,
        marginTop: 6,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.accent + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        color: Colors.textPrimary,
        fontSize: 18,
        fontWeight: '700' as const,
        marginBottom: 6,
    },
    emptySubtitle: {
        color: Colors.textMuted,
        fontSize: 13,
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
        marginBottom: 20,
    },
    modalTitle: {
        color: Colors.textPrimary,
        fontSize: 18,
        fontWeight: '700' as const,
    },
    inputLabel: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '600' as const,
        marginBottom: 6,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.3,
    },
    modalInput: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        padding: 14,
        color: Colors.textPrimary,
        fontSize: 15,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 14,
    },
    modalBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    modalBtnText: {
        color: Colors.white,
        fontSize: 15,
        fontWeight: '700' as const,
    },
});
