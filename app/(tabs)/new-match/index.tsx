import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Swords, MapPin, Hash, CircleDot, Coins, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useMatches } from '@/providers/MatchProvider';
import CoinToss from '@/components/CoinToss';

const OVER_PRESETS = [2, 5, 6, 10, 15, 20];

export default function NewMatchScreen() {
    const router = useRouter();
    const { createMatch } = useMatches();
    const { width } = useWindowDimensions();
    const isSmall = width < 360;

    const [team1, setTeam1] = useState('');
    const [team2, setTeam2] = useState('');
    const [overs, setOvers] = useState('');
    const [venue, setVenue] = useState('');
    const [tossWinner, setTossWinner] = useState<'team1' | 'team2' | null>(null);
    const [tossChoice, setTossChoice] = useState<'bat' | 'bowl' | null>(null);
    const [showToss, setShowToss] = useState(false);
    const [useCustomStart, setUseCustomStart] = useState(false);
    const [customRuns, setCustomRuns] = useState('');
    const [customWickets, setCustomWickets] = useState('');
    const [customOvers, setCustomOvers] = useState('');

    const canCreate = team1.trim() && team2.trim() && overs.trim() && tossWinner && tossChoice;

    const handleCreate = () => {
        if (!canCreate) {
            Alert.alert('Missing Info', 'Please fill in all required fields.');
            return;
        }

        const oversNum = parseInt(overs, 10);
        if (isNaN(oversNum) || oversNum < 1 || oversNum > 50) {
            Alert.alert('Invalid Overs', 'Please enter overs between 1 and 50.');
            return;
        }

        const winner = tossWinner === 'team1' ? team1.trim() : team2.trim();

        let customStart: { runs: number; wickets: number; overs: number } | undefined;
        if (useCustomStart) {
            const cRuns = parseInt(customRuns, 10) || 0;
            const cWickets = parseInt(customWickets, 10) || 0;
            const cOvers = parseInt(customOvers, 10) || 0;
            if (cOvers > oversNum) {
                Alert.alert('Invalid', 'Custom overs cannot exceed total overs.');
                return;
            }
            if (cWickets > 10) {
                Alert.alert('Invalid', 'Wickets cannot exceed 10.');
                return;
            }
            customStart = { runs: cRuns, wickets: cWickets, overs: cOvers };
        }

        const match = createMatch(
            team1.trim(),
            team2.trim(),
            oversNum,
            winner,
            tossChoice!,
            venue.trim() || undefined,
            customStart,
        );

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push(`/scoring/${match.id}` as any);
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
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Team 1</Text>
                        <View style={styles.inputRow}>
                            <Swords size={isSmall ? 16 : 18} color={Colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Street Warriors"
                                placeholderTextColor={Colors.textMuted}
                                value={team1}
                                onChangeText={setTeam1}
                                testID="team1-input"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Team 2</Text>
                        <View style={styles.inputRow}>
                            <Swords size={isSmall ? 16 : 18} color={Colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Gully Kings"
                                placeholderTextColor={Colors.textMuted}
                                value={team2}
                                onChangeText={setTeam2}
                                testID="team2-input"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Overs</Text>
                        <View style={styles.presetsRow}>
                            {OVER_PRESETS.map(preset => (
                                <TouchableOpacity
                                    key={preset}
                                    style={[
                                        styles.presetChip,
                                        overs === String(preset) && styles.presetChipActive,
                                    ]}
                                    onPress={() => {
                                        setOvers(String(preset));
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.presetText,
                                        overs === String(preset) && styles.presetTextActive,
                                    ]}>
                                        {preset}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.inputRow}>
                            <Hash size={isSmall ? 16 : 18} color={Colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="Or type custom overs"
                                placeholderTextColor={Colors.textMuted}
                                value={overs}
                                onChangeText={setOvers}
                                keyboardType="number-pad"
                                testID="overs-input"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Venue (optional)</Text>
                        <View style={styles.inputRow}>
                            <MapPin size={isSmall ? 16 : 18} color={Colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Local Ground"
                                placeholderTextColor={Colors.textMuted}
                                value={venue}
                                onChangeText={setVenue}
                                testID="venue-input"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <TouchableOpacity
                            style={styles.customStartToggle}
                            onPress={() => setUseCustomStart(!useCustomStart)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.toggleDot, useCustomStart && styles.toggleDotActive]} />
                            <Text style={[styles.customStartLabel, useCustomStart && styles.customStartLabelActive]}>
                                Start from custom score
                            </Text>
                        </TouchableOpacity>

                        {useCustomStart && (
                            <View style={styles.customStartFields}>
                                <Text style={styles.customStartHint}>Enter the score to resume from</Text>
                                <View style={styles.customRow}>
                                    <View style={styles.customField}>
                                        <Text style={styles.customFieldLabel}>Runs</Text>
                                        <TextInput
                                            style={styles.customInput}
                                            placeholder="0"
                                            placeholderTextColor={Colors.textMuted}
                                            value={customRuns}
                                            onChangeText={setCustomRuns}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                    <View style={styles.customField}>
                                        <Text style={styles.customFieldLabel}>Wickets</Text>
                                        <TextInput
                                            style={styles.customInput}
                                            placeholder="0"
                                            placeholderTextColor={Colors.textMuted}
                                            value={customWickets}
                                            onChangeText={setCustomWickets}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                    <View style={styles.customField}>
                                        <Text style={styles.customFieldLabel}>Overs</Text>
                                        <TextInput
                                            style={styles.customInput}
                                            placeholder="0"
                                            placeholderTextColor={Colors.textMuted}
                                            value={customOvers}
                                            onChangeText={setCustomOvers}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {team1.trim() && team2.trim() ? (
                        <>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Toss Winner</Text>
                                <View style={styles.choiceRow}>
                                    <TouchableOpacity
                                        style={[
                                            styles.choiceBtn,
                                            tossWinner === 'team1' && styles.choiceBtnActive,
                                        ]}
                                        onPress={() => {
                                            setTossWinner('team1');
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <CircleDot
                                            size={16}
                                            color={tossWinner === 'team1' ? Colors.primary : Colors.textMuted}
                                        />
                                        <Text
                                            style={[
                                                styles.choiceText,
                                                tossWinner === 'team1' && styles.choiceTextActive,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {team1.trim()}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.choiceBtn,
                                            tossWinner === 'team2' && styles.choiceBtnActive,
                                        ]}
                                        onPress={() => {
                                            setTossWinner('team2');
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <CircleDot
                                            size={16}
                                            color={tossWinner === 'team2' ? Colors.primary : Colors.textMuted}
                                        />
                                        <Text
                                            style={[
                                                styles.choiceText,
                                                tossWinner === 'team2' && styles.choiceTextActive,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {team2.trim()}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {tossWinner && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Elected to</Text>
                                    <View style={styles.choiceRow}>
                                        <TouchableOpacity
                                            style={[
                                                styles.choiceBtn,
                                                tossChoice === 'bat' && styles.choiceBtnActive,
                                            ]}
                                            onPress={() => {
                                                setTossChoice('bat');
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.choiceEmoji}>🏏</Text>
                                            <Text
                                                style={[
                                                    styles.choiceText,
                                                    tossChoice === 'bat' && styles.choiceTextActive,
                                                ]}
                                            >
                                                Bat
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.choiceBtn,
                                                tossChoice === 'bowl' && styles.choiceBtnActive,
                                            ]}
                                            onPress={() => {
                                                setTossChoice('bowl');
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.choiceEmoji}>⚾</Text>
                                            <Text
                                                style={[
                                                    styles.choiceText,
                                                    tossChoice === 'bowl' && styles.choiceTextActive,
                                                ]}
                                            >
                                                Bowl
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </>
                    ) : null}

                    <TouchableOpacity
                        style={[styles.createBtn, !canCreate && styles.createBtnDisabled]}
                        onPress={handleCreate}
                        disabled={!canCreate}
                        activeOpacity={0.8}
                        testID="create-match-btn"
                    >
                        <Zap size={18} color={!canCreate ? Colors.textMuted : Colors.white} />
                        <Text style={[styles.createBtnText, !canCreate && styles.createBtnTextDisabled]}>
                            Start Match
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
            <CoinToss
                visible={showToss}
                onClose={() => setShowToss(false)}
                team1={team1.trim() || undefined}
                team2={team2.trim() || undefined}
            />
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
        paddingBottom: 40,
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
    presetsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    presetChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.border,
        minWidth: 48,
        alignItems: 'center',
    },
    presetChipActive: {
        backgroundColor: Colors.primary + '18',
        borderColor: Colors.primary,
    },
    presetText: {
        color: Colors.textMuted,
        fontSize: 14,
        fontWeight: '700' as const,
    },
    presetTextActive: {
        color: Colors.primary,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: Colors.textSecondary,
        fontSize: 13,
        fontWeight: '600' as const,
        marginBottom: 8,
        letterSpacing: 0.3,
        textTransform: 'uppercase' as const,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        paddingHorizontal: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    input: {
        flex: 1,
        color: Colors.textPrimary,
        fontSize: 15,
        paddingVertical: 14,
        fontWeight: '500' as const,
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    choiceRow: {
        flexDirection: 'row',
        gap: 10,
    },
    choiceBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    choiceBtnActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '15',
    },
    choiceText: {
        color: Colors.textMuted,
        fontSize: 14,
        fontWeight: '600' as const,
    },
    choiceTextActive: {
        color: Colors.primary,
    },
    choiceEmoji: {
        fontSize: 18,
    },
    createBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    createBtnDisabled: {
        backgroundColor: Colors.surfaceLight,
    },
    createBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700' as const,
    },
    createBtnTextDisabled: {
        color: Colors.textMuted,
    },
    customStartToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    toggleDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: Colors.textMuted,
    },
    toggleDotActive: {
        borderColor: Colors.accent,
        backgroundColor: Colors.accent,
    },
    customStartLabel: {
        color: Colors.textMuted,
        fontSize: 14,
        fontWeight: '600' as const,
    },
    customStartLabelActive: {
        color: Colors.accent,
    },
    customStartFields: {
        marginTop: 10,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.accent + '30',
    },
    customStartHint: {
        color: Colors.textMuted,
        fontSize: 11,
        fontWeight: '500' as const,
        marginBottom: 10,
    },
    customRow: {
        flexDirection: 'row',
        gap: 10,
    },
    customField: {
        flex: 1,
    },
    customFieldLabel: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '700' as const,
        letterSpacing: 0.5,
        textTransform: 'uppercase' as const,
        marginBottom: 4,
    },
    customInput: {
        backgroundColor: Colors.card,
        borderRadius: 10,
        padding: 12,
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '700' as const,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
});
