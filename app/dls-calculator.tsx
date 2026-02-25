import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Calculator, CloudRain, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { calculateDLSTarget } from '@/utils/cricket';

export default function DLSCalculatorScreen() {
    const [team1Score, setTeam1Score] = useState('');
    const [team1Overs, setTeam1Overs] = useState('');
    const [maxOvers, setMaxOvers] = useState('');
    const [team2Overs, setTeam2Overs] = useState('');
    const [team2Wickets, setTeam2Wickets] = useState('');
    const [calculated, setCalculated] = useState(false);

    const revisedTarget = useMemo(() => {
        const t1Score = parseInt(team1Score, 10);
        const t1Overs = parseFloat(team1Overs);
        const mOvers = parseInt(maxOvers, 10);
        const t2Overs = parseFloat(team2Overs);
        const t2Wkts = parseInt(team2Wickets, 10);

        if (isNaN(t1Score) || isNaN(t1Overs) || isNaN(mOvers) || isNaN(t2Overs) || isNaN(t2Wkts)) {
            return null;
        }

        if (t1Score < 0 || t1Overs <= 0 || mOvers <= 0 || t2Overs <= 0 || t2Wkts < 0 || t2Wkts > 10) {
            return null;
        }

        return calculateDLSTarget(t1Score, t1Overs, mOvers, t2Overs, t2Wkts);
    }, [team1Score, team1Overs, maxOvers, team2Overs, team2Wickets]);

    const handleCalculate = () => {
        setCalculated(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleReset = () => {
        setTeam1Score('');
        setTeam1Overs('');
        setMaxOvers('');
        setTeam2Overs('');
        setTeam2Wickets('');
        setCalculated(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'DLS Calculator' }} />
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.headerCard}>
                        <CloudRain size={28} color={Colors.accent} />
                        <Text style={styles.headerTitle}>Rain Revised Target</Text>
                        <Text style={styles.headerSub}>
                            Simplified DLS calculator for interrupted gully cricket matches
                        </Text>
                    </View>

                    <View style={styles.infoCard}>
                        <Info size={14} color={Colors.textMuted} />
                        <Text style={styles.infoText}>
                            This is a simplified version for casual matches. For official matches, use the full DLS method.
                        </Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Team 1 Score (1st Innings)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 150"
                            placeholderTextColor={Colors.textMuted}
                            value={team1Score}
                            onChangeText={setTeam1Score}
                            keyboardType="number-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Team 1 Overs Used</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 20"
                            placeholderTextColor={Colors.textMuted}
                            value={team1Overs}
                            onChangeText={setTeam1Overs}
                            keyboardType="decimal-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Maximum Overs in Match</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 20"
                            placeholderTextColor={Colors.textMuted}
                            value={maxOvers}
                            onChangeText={setMaxOvers}
                            keyboardType="number-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Team 2 Overs Available (Revised)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 12"
                            placeholderTextColor={Colors.textMuted}
                            value={team2Overs}
                            onChangeText={setTeam2Overs}
                            keyboardType="decimal-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Team 2 Wickets Lost (at interruption)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 2"
                            placeholderTextColor={Colors.textMuted}
                            value={team2Wickets}
                            onChangeText={setTeam2Wickets}
                            keyboardType="number-pad"
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.calcBtn}
                        onPress={handleCalculate}
                        activeOpacity={0.8}
                    >
                        <Calculator size={18} color={Colors.white} />
                        <Text style={styles.calcBtnText}>Calculate Target</Text>
                    </TouchableOpacity>

                    {calculated && revisedTarget !== null && (
                        <View style={styles.resultCard}>
                            <Text style={styles.resultLabel}>REVISED TARGET</Text>
                            <Text style={styles.resultValue}>{revisedTarget}</Text>
                            <Text style={styles.resultSub}>
                                Team 2 needs {revisedTarget} runs in {team2Overs} overs
                            </Text>
                        </View>
                    )}

                    {calculated && revisedTarget === null && (
                        <View style={styles.errorCard}>
                            <Text style={styles.errorText}>Please fill all fields with valid values</Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
                        <Text style={styles.resetBtnText}>Reset</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    flex: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    headerCard: {
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.accent + '25',
    },
    headerTitle: {
        color: Colors.textPrimary,
        fontSize: 18,
        fontWeight: '700' as const,
        marginTop: 10,
    },
    headerSub: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '500' as const,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 18,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    infoText: {
        color: Colors.textMuted,
        fontSize: 11,
        fontWeight: '500' as const,
        flex: 1,
        lineHeight: 16,
    },
    inputGroup: {
        marginBottom: 14,
    },
    label: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '600' as const,
        marginBottom: 6,
    },
    input: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        padding: 14,
        color: Colors.textPrimary,
        fontSize: 15,
        fontWeight: '600' as const,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    calcBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.accent,
        borderRadius: 14,
        paddingVertical: 16,
        marginTop: 8,
        marginBottom: 16,
    },
    calcBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700' as const,
    },
    resultCard: {
        alignItems: 'center',
        backgroundColor: Colors.primary + '15',
        borderRadius: 16,
        padding: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
    },
    resultLabel: {
        color: Colors.primary,
        fontSize: 11,
        fontWeight: '800' as const,
        letterSpacing: 1,
        marginBottom: 8,
    },
    resultValue: {
        color: Colors.textPrimary,
        fontSize: 48,
        fontWeight: '900' as const,
    },
    resultSub: {
        color: Colors.textSecondary,
        fontSize: 13,
        fontWeight: '500' as const,
        marginTop: 8,
        textAlign: 'center',
    },
    errorCard: {
        backgroundColor: Colors.danger + '15',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.danger + '30',
    },
    errorText: {
        color: Colors.danger,
        fontSize: 13,
        fontWeight: '600' as const,
    },
    resetBtn: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    resetBtnText: {
        color: Colors.textMuted,
        fontSize: 14,
        fontWeight: '600' as const,
    },
});
