import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Easing,
    useWindowDimensions,
} from 'react-native';
import { X, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface CoinTossProps {
    visible: boolean;
    onClose: () => void;
    team1?: string;
    team2?: string;
}

export default function CoinToss({ visible, onClose, team1, team2 }: CoinTossProps) {
    const { width } = useWindowDimensions();
    const coinSize = Math.min(width * 0.4, 180);
    const [result, setResult] = useState<'heads' | 'tails' | null>(null);
    const [isFlipping, setIsFlipping] = useState(false);
    const flipAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const flipCoin = useCallback(() => {
        if (isFlipping) return;
        setIsFlipping(true);
        setResult(null);
        flipAnim.setValue(0);

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        const outcome = Math.random() < 0.5 ? 'heads' : 'tails';

        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 1.15,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.parallel([
                Animated.timing(flipAnim, {
                    toValue: 1,
                    duration: 1800,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 0.85,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                ]),
            ]),
        ]).start(() => {
            setResult(outcome);
            setIsFlipping(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        });
    }, [isFlipping, flipAnim, scaleAnim]);

    const spin = flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '1800deg'],
    });

    const handleClose = () => {
        setResult(null);
        flipAnim.setValue(0);
        scaleAnim.setValue(1);
        onClose();
    };

    const winnerName = result === 'heads' ? (team1 || 'Heads') : (team2 || 'Tails');

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={[styles.container, { maxWidth: Math.min(width - 40, 380) }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Coin Toss</Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
                            <X size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {(team1 || team2) && (
                        <View style={styles.teamsLabel}>
                            <Text style={styles.teamLabelText}>
                                Heads = <Text style={styles.teamHighlight}>{team1 || 'Team 1'}</Text>
                                {'  |  '}
                                Tails = <Text style={styles.teamHighlight}>{team2 || 'Team 2'}</Text>
                            </Text>
                        </View>
                    )}

                    <View style={styles.coinArea}>
                        <Animated.View
                            style={[
                                styles.coin,
                                {
                                    width: coinSize,
                                    height: coinSize,
                                    borderRadius: coinSize / 2,
                                    transform: [{ rotateY: spin }, { scale: scaleAnim }],
                                },
                            ]}
                        >
                            <Text style={[styles.coinFace, { fontSize: coinSize * 0.2 }]}>
                                {result === null ? '🪙' : result === 'heads' ? '👑' : '🦁'}
                            </Text>
                            <Text style={[styles.coinLabel, { fontSize: coinSize * 0.1 }]}>
                                {result === null ? 'TAP TO FLIP' : result.toUpperCase()}
                            </Text>
                        </Animated.View>
                    </View>

                    {result && (
                        <View style={styles.resultBlock}>
                            <Text style={styles.resultWinner}>{winnerName}</Text>
                            <Text style={styles.resultSubtext}>won the toss!</Text>
                        </View>
                    )}

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.flipBtn, isFlipping && styles.flipBtnDisabled]}
                            onPress={flipCoin}
                            disabled={isFlipping}
                            activeOpacity={0.8}
                        >
                            <RotateCcw size={18} color={Colors.white} />
                            <Text style={styles.flipBtnText}>
                                {result ? 'Flip Again' : 'Flip Coin'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        backgroundColor: Colors.surface,
        borderRadius: 24,
        padding: 20,
        paddingBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        color: Colors.textPrimary,
        fontSize: 20,
        fontWeight: '800' as const,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    teamsLabel: {
        alignItems: 'center',
        marginBottom: 8,
    },
    teamLabelText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '500' as const,
    },
    teamHighlight: {
        color: Colors.primary,
        fontWeight: '700' as const,
    },
    coinArea: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 28,
    },
    coin: {
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 4,
        borderColor: '#D97706',
    },
    coinFace: {
        marginBottom: 4,
    },
    coinLabel: {
        color: '#78350F',
        fontWeight: '900' as const,
        letterSpacing: 1,
    },
    resultBlock: {
        alignItems: 'center',
        marginBottom: 16,
    },
    resultWinner: {
        color: Colors.primary,
        fontSize: 22,
        fontWeight: '800' as const,
    },
    resultSubtext: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontWeight: '500' as const,
        marginTop: 2,
    },
    actions: {
        gap: 10,
    },
    flipBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
    },
    flipBtnDisabled: {
        opacity: 0.5,
    },
    flipBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700' as const,
    },
});
