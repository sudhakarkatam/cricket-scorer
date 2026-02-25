import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { Users, Plus, X, Trash2, Edit3, UserPlus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useMatches } from '@/providers/MatchProvider';
import { TeamRoster } from '@/types/cricket';

export default function RosterScreen() {
    const { rosters, addRoster, editRoster, deleteRoster, savedPlayers } = useMatches();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingRoster, setEditingRoster] = useState<TeamRoster | null>(null);
    const [rosterName, setRosterName] = useState('');
    const [playerInput, setPlayerInput] = useState('');
    const [players, setPlayers] = useState<string[]>([]);

    const openCreate = () => {
        setRosterName('');
        setPlayers([]);
        setPlayerInput('');
        setEditingRoster(null);
        setShowCreateModal(true);
    };

    const openEdit = (roster: TeamRoster) => {
        setRosterName(roster.name);
        setPlayers([...roster.players]);
        setPlayerInput('');
        setEditingRoster(roster);
        setShowCreateModal(true);
    };

    const addPlayer = () => {
        const name = playerInput.trim();
        if (!name) return;
        if (players.some(p => p.toLowerCase() === name.toLowerCase())) return;
        setPlayers([...players, name]);
        setPlayerInput('');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const removePlayer = (index: number) => {
        setPlayers(players.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!rosterName.trim()) {
            Alert.alert('Error', 'Please enter a team name');
            return;
        }

        if (editingRoster) {
            editRoster(editingRoster.id, { name: rosterName.trim(), players });
        } else {
            addRoster(rosterName.trim(), players);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowCreateModal(false);
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert('Delete Roster', `Delete "${name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    deleteRoster(id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
            },
        ]);
    };

    const suggestions = savedPlayers
        .filter(p => {
            if (!playerInput.trim()) return false;
            const q = playerInput.toLowerCase();
            return p.name.toLowerCase().includes(q) && !players.some(pl => pl.toLowerCase() === p.name.toLowerCase());
        })
        .slice(0, 5);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Team Rosters' }} />
            <ScrollView contentContainerStyle={styles.content}>
                <TouchableOpacity style={styles.createBtn} onPress={openCreate} activeOpacity={0.8}>
                    <Plus size={18} color={Colors.white} />
                    <Text style={styles.createBtnText}>Create New Roster</Text>
                </TouchableOpacity>

                {rosters.length === 0 && (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Users size={40} color={Colors.textMuted} />
                        </View>
                        <Text style={styles.emptyTitle}>No rosters yet</Text>
                        <Text style={styles.emptySub}>Create team rosters to quickly add players when starting a match</Text>
                    </View>
                )}

                {rosters.map(roster => (
                    <View key={roster.id} style={styles.rosterCard}>
                        <View style={styles.rosterHeader}>
                            <View style={styles.rosterNameRow}>
                                <Users size={16} color={Colors.primary} />
                                <Text style={styles.rosterName}>{roster.name}</Text>
                            </View>
                            <View style={styles.rosterActions}>
                                <TouchableOpacity onPress={() => openEdit(roster)} style={styles.rosterActionBtn} activeOpacity={0.7}>
                                    <Edit3 size={14} color={Colors.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(roster.id, roster.name)} style={styles.rosterActionBtn} activeOpacity={0.7}>
                                    <Trash2 size={14} color={Colors.danger} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={styles.playerCount}>{roster.players.length} player{roster.players.length !== 1 ? 's' : ''}</Text>
                        {roster.players.length > 0 && (
                            <View style={styles.playerChips}>
                                {roster.players.map((p, i) => (
                                    <View key={i} style={styles.playerChip}>
                                        <Text style={styles.playerChipText}>{p}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                ))}
            </ScrollView>

            <Modal visible={showCreateModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingRoster ? 'Edit Roster' : 'Create Roster'}</Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <X size={22} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Team Name</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. Street Warriors"
                            placeholderTextColor={Colors.textMuted}
                            value={rosterName}
                            onChangeText={setRosterName}
                        />

                        <Text style={styles.inputLabel}>Players ({players.length})</Text>
                        <View style={styles.addPlayerRow}>
                            <TextInput
                                style={styles.playerInputField}
                                placeholder="Player name"
                                placeholderTextColor={Colors.textMuted}
                                value={playerInput}
                                onChangeText={setPlayerInput}
                                onSubmitEditing={addPlayer}
                                returnKeyType="done"
                            />
                            <TouchableOpacity style={styles.addPlayerIconBtn} onPress={addPlayer} activeOpacity={0.7}>
                                <UserPlus size={18} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>

                        {suggestions.length > 0 && (
                            <View style={styles.suggestionsBlock}>
                                {suggestions.map(s => (
                                    <TouchableOpacity
                                        key={s.id}
                                        style={styles.suggestionItem}
                                        onPress={() => {
                                            setPlayers([...players, s.name]);
                                            setPlayerInput('');
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.suggestionText}>{s.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <ScrollView style={styles.playersList} nestedScrollEnabled>
                            {players.map((p, i) => (
                                <View key={i} style={styles.playerListItem}>
                                    <Text style={styles.playerListNumber}>{i + 1}.</Text>
                                    <Text style={styles.playerListName}>{p}</Text>
                                    <TouchableOpacity onPress={() => removePlayer(i)}>
                                        <X size={16} color={Colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
                            <Text style={styles.saveBtnText}>{editingRoster ? 'Save Changes' : 'Create Roster'}</Text>
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
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        marginBottom: 20,
    },
    createBtnText: {
        color: Colors.white,
        fontSize: 15,
        fontWeight: '700' as const,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        color: Colors.textPrimary,
        fontSize: 17,
        fontWeight: '700' as const,
        marginBottom: 6,
    },
    emptySub: {
        color: Colors.textMuted,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 20,
    },
    rosterCard: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    rosterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    rosterNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    rosterName: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '700' as const,
    },
    rosterActions: {
        flexDirection: 'row',
        gap: 8,
    },
    rosterActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playerCount: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '500' as const,
        marginBottom: 10,
    },
    playerChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    playerChip: {
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    playerChipText: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '500' as const,
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
        maxHeight: '85%',
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
        fontSize: 11,
        fontWeight: '700' as const,
        letterSpacing: 0.5,
        textTransform: 'uppercase' as const,
        marginBottom: 6,
        marginTop: 4,
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
    addPlayerRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    playerInputField: {
        flex: 1,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        padding: 12,
        color: Colors.textPrimary,
        fontSize: 14,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    addPlayerIconBtn: {
        width: 46,
        height: 46,
        borderRadius: 12,
        backgroundColor: Colors.primary + '18',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.primary + '40',
    },
    suggestionsBlock: {
        marginBottom: 8,
        borderRadius: 10,
        overflow: 'hidden',
    },
    suggestionItem: {
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    suggestionText: {
        color: Colors.textPrimary,
        fontSize: 13,
        fontWeight: '500' as const,
    },
    playersList: {
        maxHeight: 200,
        marginBottom: 14,
    },
    playerListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border + '40',
    },
    playerListNumber: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '600' as const,
        width: 24,
    },
    playerListName: {
        color: Colors.textPrimary,
        fontSize: 14,
        fontWeight: '500' as const,
        flex: 1,
    },
    saveBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    saveBtnText: {
        color: Colors.white,
        fontSize: 15,
        fontWeight: '700' as const,
    },
});
