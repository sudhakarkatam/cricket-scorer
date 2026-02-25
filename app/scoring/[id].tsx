import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    Modal,
    Animated,
    useWindowDimensions,
} from 'react-native';
import { RelativePathString, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft,
    RotateCcw,
    UserPlus,
    X,
    SkipForward,
    FileText,
    Trophy,
    ArrowLeftRight,
    LogOut,
    Ban,
    Handshake,
    Crosshair,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useMatches } from '@/providers/MatchProvider';
import { ShotZone, BatsmanStats, BowlerStats } from '@/types/cricket';
import { getOversString, getRunRate, getRequiredRunRate, getOverByOverSummary, calculatePartnership, getStrikeRate } from '@/utils/cricket';
import WagonWheel from '@/components/WagonWheel';

type ModalType = 'batsman' | 'bowler' | 'wicket' | 'extras' | 'retire' | 'bowlerChange' | 'shotZone' | null;

const SHOT_ZONES: { key: ShotZone; label: string; angle: number }[] = [
    { key: 'straight', label: 'Straight', angle: -90 },
    { key: 'cover', label: 'Cover', angle: -30 },
    { key: 'off', label: 'Off', angle: 30 },
    { key: 'fine', label: 'Fine', angle: 90 },
    { key: 'leg', label: 'Leg', angle: 150 },
    { key: 'midwicket', label: 'Mid-W', angle: 210 },
];

export default function ScoringScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const {
        getMatch,
        recordBall,
        addBatsmanToInnings,
        addBowlerToInnings,
        switchBowler,
        swapStrike,
        retireBatsman,
        undoLastBall,
        endInnings,
        abandonMatch,
        savedPlayers,
        updateLastBallZone,
    } = useMatches();

    const match = getMatch(id ?? '');
    const { width: screenWidth } = useWindowDimensions();
    const [modalType, setModalType] = useState<ModalType>(null);
    const [playerName, setPlayerName] = useState('');
    const [wicketType, setWicketType] = useState('bowled');
    const [selectedExtraType, setSelectedExtraType] = useState<'wide' | 'no-ball' | 'bye' | 'leg-bye'>('wide');
    const [extraRuns, setExtraRuns] = useState(0);
    const [lastAction, setLastAction] = useState('');
    const [showWagonWheel, setShowWagonWheel] = useState(false);
    const [pendingZoneRuns, setPendingZoneRuns] = useState<number | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const prevBallsRef = useRef<number>(0);
    const lastBowlerIdRef = useRef<string>('');

    const showActionFeedback = useCallback((action: string) => {
        setLastAction(action);
        fadeAnim.setValue(1);
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const innings = match?.innings[match?.currentInnings ?? 0];

    const currentBatsman = innings?.batsmen.find((b: BatsmanStats) => b.id === innings.currentBatsmanId);
    const nonStriker = innings?.batsmen.find((b: BatsmanStats) => b.id === innings.nonStrikerId);
    const currentBowler = innings?.bowlers.find((b: BowlerStats) => b.id === innings.currentBowlerId);

    const needsBatsman = !currentBatsman || !nonStriker;
    const needsBowler = !currentBowler;
    const canScore = !needsBatsman && !needsBowler && !innings?.isComplete && match?.status === 'live';

    const target = match?.currentInnings === 1 && match?.innings[0]
        ? match.innings[0].totalRuns + 1
        : null;

    const partnership = useMemo(() => {
        if (!innings || innings.ballLog.length === 0) return null;
        return calculatePartnership(innings);
    }, [innings, innings?.ballLog?.length, innings?.totalRuns]);

    const overSummaries = useMemo(() => {
        if (!innings) return [];
        return getOverByOverSummary(innings);
    }, [innings, innings?.ballLog?.length]);

    const activeBatsmen = useMemo(() => {
        if (!innings) return [];
        return innings.batsmen.filter((b: BatsmanStats) => b.balls > 0 || b.runs > 0 || b.isOut || b.id === innings.currentBatsmanId || b.id === innings.nonStrikerId);
    }, [innings, innings?.batsmen?.length, innings?.totalRuns, innings?.totalWickets]);

    useEffect(() => {
        if (!innings) return;
        const curBalls = innings.totalBalls;
        const prevBalls = prevBallsRef.current;

        if (curBalls > prevBalls && curBalls % 6 === 0 && curBalls > 0 && !innings.isComplete) {
            lastBowlerIdRef.current = innings.currentBowlerId;
            setTimeout(() => {
                setModalType('bowlerChange');
            }, 300);
        }

        prevBallsRef.current = curBalls;
    }, [innings?.totalBalls, innings?.isComplete, innings?.currentBowlerId, innings]);

    if (!match) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>Match not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (!innings) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>Innings data not available</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const handleRun = (runs: number) => {
        if (!canScore) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        recordBall(match.id, runs, false);
        const labels: Record<number, string> = { 0: 'Dot', 1: '1 Run', 2: '2 Runs', 3: '3 Runs', 4: 'FOUR!', 6: 'SIX!' };
        showActionFeedback(labels[runs] ?? `${runs} Runs`);

        if (runs >= 4) {
            setPendingZoneRuns(runs);
            setTimeout(() => setModalType('shotZone'), 200);
        }
    };

    const handleShotZone = (zone: ShotZone) => {
        updateLastBallZone(match.id, zone);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPendingZoneRuns(null);
        setModalType(null);
    };

    const handleSkipZone = () => {
        setPendingZoneRuns(null);
        setModalType(null);
    };

    const handleWicket = () => {
        if (!canScore) return;
        setWicketType('bowled');
        setModalType('wicket');
    };

    const confirmWicket = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        recordBall(match.id, 0, true, undefined, wicketType);
        showActionFeedback('WICKET!');
        setModalType(null);
    };

    const handleExtras = () => {
        if (!canScore) return;
        setSelectedExtraType('wide');
        setExtraRuns(0);
        setModalType('extras');
    };

    const confirmExtras = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        recordBall(match.id, extraRuns, false, selectedExtraType);
        showActionFeedback(`${selectedExtraType.toUpperCase()} +${extraRuns}`);
        setModalType(null);
    };

    const getDefaultPlayerName = (type: 'batsman' | 'bowler') => {
        if (type === 'batsman') {
            const count = innings.batsmen.length + 1;
            return `Player ${count}`;
        } else {
            const count = innings.bowlers.length + 1;
            return `Bowler ${count}`;
        }
    };

    const handleAddPlayer = (type: 'batsman' | 'bowler') => {
        setPlayerName('');
        setModalType(type);
    };

    const isNameDuplicate = (name: string, type: 'batsman' | 'bowler'): boolean => {
        const nameLower = name.toLowerCase();
        if (type === 'batsman') {
            return innings.batsmen.some(b => b.name.toLowerCase() === nameLower);
        }
        return innings.bowlers.some(b => b.name.toLowerCase() === nameLower);
    };

    const confirmAddPlayer = () => {
        const name = playerName.trim() || getDefaultPlayerName(modalType as 'batsman' | 'bowler');
        const type = modalType as 'batsman' | 'bowler';

        if (isNameDuplicate(name, type)) {
            Alert.alert('Duplicate Name', `A ${type} named "${name}" already exists in this innings. Please use a unique name.`);
            return;
        }

        if (type === 'batsman') {
            addBatsmanToInnings(match.id, name);
        } else if (type === 'bowler') {
            addBowlerToInnings(match.id, name);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setModalType(null);
        setPlayerName('');
    };

    const handleBowlerChange = (bowlerId: string) => {
        switchBowler(match.id, bowlerId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setModalType(null);
        const bowler = innings.bowlers.find(b => b.id === bowlerId);
        if (bowler) showActionFeedback(`${bowler.name} bowling`);
    };

    const handleAddNewBowlerFromChange = () => {
        setModalType('bowler');
    };

    const handleContinueSameBowler = () => {
        setModalType(null);
    };

    const handleSwapStrike = () => {
        if (!currentBatsman || !nonStriker) return;
        swapStrike(match.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        showActionFeedback('Strike Swapped');
    };

    const handleRetire = () => {
        if (!currentBatsman && !nonStriker) return;
        setModalType('retire');
    };

    const confirmRetire = (batsmanId: string, isHurt: boolean) => {
        retireBatsman(match.id, batsmanId, isHurt);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showActionFeedback(isHurt ? 'Retired Hurt' : 'Retired Out');
        setModalType(null);
    };

    const handleUndo = () => {
        Alert.alert('Undo', 'Undo last ball?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Undo',
                onPress: () => {
                    undoLastBall(match.id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    showActionFeedback('Undone');
                },
            },
        ]);
    };

    const handleEndInnings = () => {
        Alert.alert('End Innings', 'Are you sure you want to end this innings?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'End Innings',
                style: 'destructive',
                onPress: () => {
                    endInnings(match.id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
            },
        ]);
    };

    const handleAbandon = () => {
        Alert.alert('Abandon Match', 'This will end the match as abandoned. Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Abandon',
                style: 'destructive',
                onPress: () => {
                    abandonMatch(match.id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    router.back();
                },
            },
        ]);
    };

    const isMatchOver = match.status === 'completed' || match.status === 'abandoned';

    const getBallColor = (ball: string) => {
        if (ball === 'W') return Colors.wicket;
        if (ball === '4') return Colors.four;
        if (ball === '6') return Colors.six;
        if (ball === '0') return Colors.textMuted;
        if (ball.includes('Wd') || ball.includes('Nb') || ball.includes('B') || ball.includes('Lb')) return Colors.extras;
        return Colors.textPrimary;
    };

    const playerSuggestions = savedPlayers
        .filter(p => {
            if (!playerName.trim()) return false;
            const q = playerName.toLowerCase();
            const nameMatch = p.name.toLowerCase().includes(q);
            const alreadyAdded = innings.batsmen.some(b => b.name.toLowerCase() === p.name.toLowerCase()) ||
                innings.bowlers.some(b => b.name.toLowerCase() === p.name.toLowerCase());
            return nameMatch && !alreadyAdded;
        })
        .slice(0, 5);

    const availableBowlersForChange = innings.bowlers.filter(b => b.id !== lastBowlerIdRef.current);

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.topBtn} activeOpacity={0.7}>
                        <ArrowLeft size={20} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.topTitle} numberOfLines={1}>
                        {innings.battingTeam} vs {innings.bowlingTeam}
                    </Text>
                    <View style={styles.topRightBtns}>
                        <TouchableOpacity
                            onPress={() => setShowWagonWheel(!showWagonWheel)}
                            style={[styles.topBtn, showWagonWheel && styles.topBtnActive]}
                            activeOpacity={0.7}
                        >
                            <Crosshair size={18} color={showWagonWheel ? Colors.primary : Colors.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.push(`/scorecard/${match.id}` as any)}
                            style={styles.topBtn}
                            activeOpacity={0.7}
                        >
                            <FileText size={20} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.scoreBoard}>
                        <View style={styles.mainScore}>
                            <Text style={styles.battingTeam}>{innings.battingTeam}</Text>
                            <View style={styles.scoreDisplayRow}>
                                <Text style={styles.bigScore}>
                                    {innings.totalRuns}/{innings.totalWickets}
                                </Text>
                                <Text style={styles.oversDisplay}>
                                    ({getOversString(innings.totalBalls)}/{match.totalOvers})
                                </Text>
                            </View>
                            <Text style={styles.runRateText}>
                                CRR: {getRunRate(innings.totalRuns, innings.totalBalls)}
                                {target && (
                                    <>
                                        {'  |  '}RRR: {getRequiredRunRate(target, innings.totalRuns, match.totalOvers * 6 - innings.totalBalls)}
                                    </>
                                )}
                            </Text>
                        </View>

                        {target && (
                            <View style={styles.targetBanner}>
                                <Text style={styles.targetText}>
                                    Target: {target} | Need {Math.max(0, target - innings.totalRuns)} from {Math.max(0, match.totalOvers * 6 - innings.totalBalls)} balls
                                </Text>
                            </View>
                        )}
                    </View>

                    {partnership && partnership.runs > 0 && currentBatsman && nonStriker && (
                        <View style={styles.partnershipBanner}>
                            <Handshake size={14} color={Colors.accent} />
                            <Text style={styles.partnershipText}>
                                Partnership: {partnership.runs} ({partnership.balls}b)
                            </Text>
                        </View>
                    )}

                    {showWagonWheel && (
                        <View style={styles.wagonWheelCard}>
                            <Text style={styles.cardTitle}>WAGON WHEEL</Text>
                            <View style={styles.wagonWheelCenter}>
                                <WagonWheel innings={innings} size={Math.min(screenWidth - 64, 220)} />
                            </View>
                        </View>
                    )}

                    <View style={styles.battingCard}>
                        <View style={styles.cardTitleRow}>
                            <Text style={styles.cardTitle}>BATTING</Text>
                            {currentBatsman && nonStriker && (
                                <TouchableOpacity style={styles.swapBtn} onPress={handleSwapStrike} activeOpacity={0.7}>
                                    <ArrowLeftRight size={12} color={Colors.accent} />
                                    <Text style={styles.swapText}>Swap</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.tableHeader}>
                            <Text style={[styles.thCell, styles.nameCol]}>Batter</Text>
                            <Text style={styles.thCell}>R</Text>
                            <Text style={styles.thCell}>B</Text>
                            <Text style={styles.thCell}>4s</Text>
                            <Text style={styles.thCell}>6s</Text>
                            <Text style={[styles.thCell, styles.srCol]}>SR</Text>
                        </View>

                        {activeBatsmen.map(b => {
                            const isStriker = b.id === innings.currentBatsmanId;
                            const isNonStriker = b.id === innings.nonStrikerId;
                            const isActive = isStriker || isNonStriker;

                            return (
                                <View key={b.id} style={[styles.tableRow, isActive && styles.activeRow]}>
                                    <View style={styles.nameCol}>
                                        <Text style={[styles.tdName, isStriker && styles.strikerName]} numberOfLines={1}>
                                            {b.name}{isStriker ? ' *' : ''}
                                        </Text>
                                        {b.isOut && (
                                            <Text style={styles.howOut} numberOfLines={1}>
                                                {b.howOut}{b.bowlerName ? ` b ${b.bowlerName}` : ''}
                                            </Text>
                                        )}
                                        {!b.isOut && !isActive && b.balls > 0 && (
                                            <Text style={styles.notOutLabel}>not out</Text>
                                        )}
                                    </View>
                                    <Text style={[styles.tdCell, styles.runsCol]}>{b.runs}</Text>
                                    <Text style={styles.tdCell}>{b.balls}</Text>
                                    <Text style={styles.tdCell}>{b.fours}</Text>
                                    <Text style={styles.tdCell}>{b.sixes}</Text>
                                    <Text style={[styles.tdCell, styles.srCol]}>{b.balls > 0 ? getStrikeRate(b.runs, b.balls) : '-'}</Text>
                                </View>
                            );
                        })}

                        {needsBatsman && (
                            <TouchableOpacity
                                style={styles.addPlayerBtn}
                                onPress={() => handleAddPlayer('batsman')}
                                activeOpacity={0.7}
                            >
                                <UserPlus size={16} color={Colors.primary} />
                                <Text style={styles.addPlayerText}>Add Batsman</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.bowlerCard}>
                        <Text style={styles.cardTitle}>BOWLING</Text>
                        {currentBowler && (
                            <View style={styles.bowlerRow}>
                                <Text style={styles.bowlerName}>{currentBowler.name}</Text>
                                <Text style={styles.bowlerStats}>
                                    {currentBowler.overs}.{currentBowler.balls}-{currentBowler.maidens}-{currentBowler.runs}-{currentBowler.wickets}
                                </Text>
                            </View>
                        )}

                        {innings.bowlers.length > 1 && (
                            <View style={styles.allBowlersSection}>
                                {innings.bowlers.filter(b => b.id !== innings.currentBowlerId && (b.overs > 0 || b.balls > 0)).map(b => (
                                    <View key={b.id} style={styles.prevBowlerRow}>
                                        <Text style={styles.prevBowlerName}>{b.name}</Text>
                                        <Text style={styles.prevBowlerStats}>
                                            {b.overs}.{b.balls}-{b.maidens}-{b.runs}-{b.wickets}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {needsBowler && (
                            <TouchableOpacity
                                style={styles.addPlayerBtn}
                                onPress={() => handleAddPlayer('bowler')}
                                activeOpacity={0.7}
                            >
                                <UserPlus size={16} color={Colors.primary} />
                                <Text style={styles.addPlayerText}>Add Bowler</Text>
                            </TouchableOpacity>
                        )}
                        {!needsBowler && innings.bowlers.length > 1 && (
                            <TouchableOpacity
                                style={styles.changeBowlerBtn}
                                onPress={() => {
                                    lastBowlerIdRef.current = innings.currentBowlerId;
                                    setModalType('bowlerChange');
                                }}
                                activeOpacity={0.7}
                            >
                                <RotateCcw size={14} color={Colors.accent} />
                                <Text style={styles.changeBowlerText}>Change Bowler</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {overSummaries.length > 0 && (
                        <View style={styles.oversCard}>
                            <Text style={styles.cardTitle}>OVER BY OVER</Text>
                            {overSummaries.slice(-6).map((over, idx) => {
                                const isCurrentOver = idx === overSummaries.slice(-6).length - 1 && over.balls.length < 6;
                                return (
                                    <View key={over.overNumber} style={[styles.overRow, isCurrentOver && styles.currentOverRow]}>
                                        <View style={styles.overHeader}>
                                            <View style={styles.overNumberBadge}>
                                                <Text style={styles.overNumberText}>{over.overNumber}</Text>
                                            </View>
                                            <Text style={styles.overBowlerName} numberOfLines={1}>{over.bowlerName}</Text>
                                            <Text style={styles.overTotal}>{over.runs} runs</Text>
                                            {over.wickets > 0 && (
                                                <View style={styles.overWicketBadge}>
                                                    <Text style={styles.overWicketText}>{over.wickets}W</Text>
                                                </View>
                                            )}
                                        </View>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            <View style={styles.overBalls}>
                                                {over.balls.map((ball, ballIdx) => (
                                                    <View
                                                        key={ballIdx}
                                                        style={[
                                                            styles.ballBubble,
                                                            { borderColor: getBallColor(ball) + '50' },
                                                        ]}
                                                    >
                                                        <Text style={[styles.ballText, { color: getBallColor(ball) }]}>
                                                            {ball}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </ScrollView>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    <Animated.View style={[styles.feedbackBanner, { opacity: fadeAnim }]}>
                        <Text style={styles.feedbackText}>{lastAction}</Text>
                    </Animated.View>

                    {isMatchOver && (
                        <View style={styles.matchOverBanner}>
                            <Trophy size={24} color={Colors.accent} />
                            <Text style={styles.matchOverText}>
                                {match.status === 'abandoned' ? 'Match Abandoned' : 'Match Over'}
                            </Text>
                            {match.result && <Text style={styles.matchResultText}>{match.result}</Text>}
                            {match.mvp && (
                                <View style={styles.mvpRow}>
                                    <Text style={styles.mvpLabel}>MVP</Text>
                                    <Text style={styles.mvpName}>{match.mvp}</Text>
                                </View>
                            )}
                            <TouchableOpacity
                                style={styles.viewScorecardBtn}
                                onPress={() => router.push(`/scorecard/${match.id}` as any)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.viewScorecardText}>View Full Scorecard</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>

                {!isMatchOver && (
                    <View style={styles.scoringPanel}>
                        <View style={styles.runsRow}>
                            {[0, 1, 2, 3].map(runs => (
                                <TouchableOpacity
                                    key={runs}
                                    style={[styles.runBtn, runs === 0 && styles.dotBtn]}
                                    onPress={() => handleRun(runs)}
                                    disabled={!canScore}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.runBtnText, runs === 0 && styles.dotBtnText]}>
                                        {runs === 0 ? '•' : runs}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.runsRow}>
                            <TouchableOpacity
                                style={[styles.runBtn, styles.fourBtn]}
                                onPress={() => handleRun(4)}
                                disabled={!canScore}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.specialBtnText}>4</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.runBtn, styles.sixBtn]}
                                onPress={() => handleRun(6)}
                                disabled={!canScore}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.specialBtnText}>6</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.runBtn, styles.wicketBtn]}
                                onPress={handleWicket}
                                disabled={!canScore}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.wicketBtnText}>W</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.runBtn, styles.extrasBtn]}
                                onPress={handleExtras}
                                disabled={!canScore}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.extrasBtnText}>Ex</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={handleUndo}
                                disabled={innings.ballLog.length === 0}
                                activeOpacity={0.7}
                            >
                                <RotateCcw size={14} color={Colors.textSecondary} />
                                <Text style={styles.actionText}>Undo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => handleAddPlayer('bowler')}
                                activeOpacity={0.7}
                            >
                                <UserPlus size={14} color={Colors.textSecondary} />
                                <Text style={styles.actionText}>New Bowler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={handleRetire}
                                disabled={!currentBatsman && !nonStriker}
                                activeOpacity={0.7}
                            >
                                <LogOut size={14} color={Colors.textSecondary} />
                                <Text style={styles.actionText}>Retire</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={handleEndInnings}
                                activeOpacity={0.7}
                            >
                                <SkipForward size={14} color={Colors.accent} />
                                <Text style={[styles.actionText, { color: Colors.accent }]}>End Inn.</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={styles.abandonBtn}
                            onPress={handleAbandon}
                            activeOpacity={0.7}
                        >
                            <Ban size={12} color={Colors.danger} />
                            <Text style={styles.abandonText}>Abandon Match</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>

            <Modal visible={modalType === 'batsman' || modalType === 'bowler'} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Add {modalType === 'batsman' ? 'Batsman' : 'Bowler'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalType(null)}>
                                <X size={22} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.modalInput}
                            placeholder={modalType === 'batsman' ? `Default: Player ${innings.batsmen.length + 1}` : `Default: Bowler ${innings.bowlers.length + 1}`}
                            placeholderTextColor={Colors.textMuted}
                            value={playerName}
                            onChangeText={setPlayerName}
                            autoFocus
                            testID="player-name-input"
                        />
                        <Text style={styles.defaultNameHint}>
                            Leave empty to use default name
                        </Text>
                        {playerName.trim() && isNameDuplicate(playerName.trim(), modalType as 'batsman' | 'bowler') && (
                            <View style={styles.duplicateWarning}>
                                <Text style={styles.duplicateWarningText}>This name already exists in this innings</Text>
                            </View>
                        )}
                        {playerSuggestions.length > 0 && (
                            <View style={styles.suggestionsContainer}>
                                {playerSuggestions.map(p => (
                                    <TouchableOpacity
                                        key={p.id}
                                        style={styles.suggestionItem}
                                        onPress={() => setPlayerName(p.name)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.suggestionName}>{p.name}</Text>
                                        {p.team && <Text style={styles.suggestionTeam}>{p.team}</Text>}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.modalBtn}
                            onPress={confirmAddPlayer}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.modalBtnText}>
                                {playerName.trim() ? 'Add' : `Add as ${modalType === 'batsman' ? `Player ${innings.batsmen.length + 1}` : `Bowler ${innings.bowlers.length + 1}`}`}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={modalType === 'bowlerChange'} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Over Complete — Select Bowler</Text>
                            <TouchableOpacity onPress={handleContinueSameBowler}>
                                <X size={22} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.bowlerChangeHint}>
                            Same bowler can&apos;t bowl consecutive overs. Select next bowler:
                        </Text>

                        {availableBowlersForChange.length > 0 ? (
                            <View style={styles.bowlerChangeList}>
                                {availableBowlersForChange.map(b => (
                                    <TouchableOpacity
                                        key={b.id}
                                        style={styles.bowlerChangeItem}
                                        onPress={() => handleBowlerChange(b.id)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.bowlerChangeName}>{b.name}</Text>
                                        <Text style={styles.bowlerChangeStats}>
                                            {b.overs}.{b.balls}-{b.maidens}-{b.runs}-{b.wickets}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.noBowlersText}>No other bowlers available</Text>
                        )}

                        <TouchableOpacity
                            style={styles.addNewBowlerBtn}
                            onPress={handleAddNewBowlerFromChange}
                            activeOpacity={0.7}
                        >
                            <UserPlus size={16} color={Colors.primary} />
                            <Text style={styles.addNewBowlerText}>Add New Bowler</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.continueSameBtn}
                            onPress={handleContinueSameBowler}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.continueSameText}>Continue with same bowler</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={modalType === 'shotZone'} transparent animationType="fade">
                <TouchableOpacity style={styles.zoneOverlay} onPress={handleSkipZone} activeOpacity={1}>
                    <View style={styles.zonePickerContainer}>
                        <Text style={styles.zoneTitle}>Where did the shot go?</Text>
                        <View style={styles.zoneGrid}>
                            {SHOT_ZONES.map(zone => (
                                <TouchableOpacity
                                    key={zone.key}
                                    style={styles.zoneBtn}
                                    onPress={() => handleShotZone(zone.key)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.zoneBtnText}>{zone.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.zoneSkipBtn} onPress={handleSkipZone} activeOpacity={0.7}>
                            <Text style={styles.zoneSkipText}>Skip</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal visible={modalType === 'wicket'} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Wicket Type</Text>
                            <TouchableOpacity onPress={() => setModalType(null)}>
                                <X size={22} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.wicketTypes}>
                            {['bowled', 'caught', 'lbw', 'run out', 'stumped', 'hit wicket'].map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.wicketTypeBtn,
                                        wicketType === type && styles.wicketTypeBtnActive,
                                    ]}
                                    onPress={() => setWicketType(type)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.wicketTypeText,
                                        wicketType === type && styles.wicketTypeTextActive,
                                    ]}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={[styles.modalBtn, styles.wicketConfirmBtn]}
                            onPress={confirmWicket}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.modalBtnText}>Confirm Wicket</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={modalType === 'extras'} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Extras</Text>
                            <TouchableOpacity onPress={() => setModalType(null)}>
                                <X size={22} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.extraTypes}>
                            {(['wide', 'no-ball', 'bye', 'leg-bye'] as const).map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.extraTypeBtn,
                                        selectedExtraType === type && styles.extraTypeBtnActive,
                                    ]}
                                    onPress={() => setSelectedExtraType(type)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.extraTypeText,
                                        selectedExtraType === type && styles.extraTypeTextActive,
                                    ]}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.extraRunsLabel}>Additional Runs</Text>
                        <View style={styles.extraRunsRow}>
                            {[0, 1, 2, 3, 4].map(r => (
                                <TouchableOpacity
                                    key={r}
                                    style={[
                                        styles.extraRunBtn,
                                        extraRuns === r && styles.extraRunBtnActive,
                                    ]}
                                    onPress={() => setExtraRuns(r)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.extraRunText,
                                        extraRuns === r && styles.extraRunTextActive,
                                    ]}>
                                        {r}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={styles.modalBtn}
                            onPress={confirmExtras}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.modalBtnText}>Add Extra</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={modalType === 'retire'} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Retire Batsman</Text>
                            <TouchableOpacity onPress={() => setModalType(null)}>
                                <X size={22} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.retireSubtitle}>Select batsman to retire:</Text>
                        {currentBatsman && (
                            <View style={styles.retirePlayerBlock}>
                                <Text style={styles.retirePlayerName}>{currentBatsman.name} * (striker)</Text>
                                <View style={styles.retireActions}>
                                    <TouchableOpacity
                                        style={styles.retireHurtBtn}
                                        onPress={() => confirmRetire(currentBatsman.id, true)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.retireHurtText}>Retire Hurt</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.retireOutBtn}
                                        onPress={() => confirmRetire(currentBatsman.id, false)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.retireOutText}>Retire Out</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        {nonStriker && (
                            <View style={styles.retirePlayerBlock}>
                                <Text style={styles.retirePlayerName}>{nonStriker.name} (non-striker)</Text>
                                <View style={styles.retireActions}>
                                    <TouchableOpacity
                                        style={styles.retireHurtBtn}
                                        onPress={() => confirmRetire(nonStriker.id, true)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.retireHurtText}>Retire Hurt</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.retireOutBtn}
                                        onPress={() => confirmRetire(nonStriker.id, false)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.retireOutText}>Retire Out</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
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
    safeArea: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    topBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: Colors.surfaceLight,
    },
    topBtnActive: {
        backgroundColor: Colors.primary + '20',
        borderWidth: 1,
        borderColor: Colors.primary + '40',
    },
    topRightBtns: {
        flexDirection: 'row',
        gap: 6,
    },
    topTitle: {
        color: Colors.textPrimary,
        fontSize: 15,
        fontWeight: '700' as const,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 8,
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 12,
        paddingBottom: 8,
    },
    scoreBoard: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.primary + '25',
    },
    mainScore: {
        alignItems: 'center',
    },
    battingTeam: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '600' as const,
        letterSpacing: 0.5,
        textTransform: 'uppercase' as const,
        marginBottom: 2,
    },
    scoreDisplayRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    bigScore: {
        color: Colors.textPrimary,
        fontSize: 36,
        fontWeight: '900' as const,
        letterSpacing: -1,
    },
    oversDisplay: {
        color: Colors.textMuted,
        fontSize: 15,
        fontWeight: '600' as const,
    },
    runRateText: {
        color: Colors.textSecondary,
        fontSize: 11,
        fontWeight: '500' as const,
        marginTop: 4,
    },
    targetBanner: {
        backgroundColor: Colors.accent + '15',
        borderRadius: 10,
        padding: 8,
        marginTop: 10,
        alignItems: 'center',
    },
    targetText: {
        color: Colors.accent,
        fontSize: 12,
        fontWeight: '700' as const,
    },
    partnershipBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: Colors.accent + '10',
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.accent + '20',
    },
    partnershipText: {
        color: Colors.accent,
        fontSize: 12,
        fontWeight: '700' as const,
    },
    wagonWheelCard: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    wagonWheelCenter: {
        alignItems: 'center',
        marginTop: 8,
    },
    battingCard: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '800' as const,
        letterSpacing: 1.5,
    },
    swapBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: Colors.accent + '15',
    },
    swapText: {
        fontSize: 11,
        fontWeight: '600' as const,
        color: Colors.accent,
    },
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        marginBottom: 2,
    },
    thCell: {
        color: Colors.textMuted,
        fontSize: 9,
        fontWeight: '700' as const,
        width: 28,
        textAlign: 'center',
    },
    nameCol: {
        flex: 1,
    },
    srCol: {
        width: 38,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border + '30',
    },
    activeRow: {
        backgroundColor: Colors.primary + '08',
    },
    tdName: {
        color: Colors.textPrimary,
        fontSize: 12,
        fontWeight: '600' as const,
    },
    strikerName: {
        color: Colors.primary,
        fontWeight: '700' as const,
    },
    howOut: {
        color: Colors.textMuted,
        fontSize: 9,
        marginTop: 1,
    },
    notOutLabel: {
        color: Colors.primary,
        fontSize: 9,
        marginTop: 1,
        fontWeight: '500' as const,
    },
    tdCell: {
        color: Colors.textSecondary,
        fontSize: 11,
        fontWeight: '500' as const,
        width: 28,
        textAlign: 'center',
    },
    runsCol: {
        color: Colors.textPrimary,
        fontWeight: '700' as const,
    },
    addPlayerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.primary + '40',
        borderStyle: 'dashed',
        marginTop: 6,
    },
    addPlayerText: {
        color: Colors.primary,
        fontSize: 13,
        fontWeight: '600' as const,
    },
    bowlerCard: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    bowlerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
    },
    bowlerName: {
        color: Colors.textPrimary,
        fontSize: 13,
        fontWeight: '600' as const,
    },
    bowlerStats: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '500' as const,
    },
    allBowlersSection: {
        marginTop: 6,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: Colors.border + '40',
    },
    prevBowlerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 3,
    },
    prevBowlerName: {
        color: Colors.textMuted,
        fontSize: 11,
        fontWeight: '500' as const,
    },
    prevBowlerStats: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '500' as const,
    },
    changeBowlerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 8,
        alignSelf: 'flex-end',
    },
    changeBowlerText: {
        color: Colors.accent,
        fontSize: 12,
        fontWeight: '600' as const,
    },
    oversCard: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    overRow: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border + '40',
    },
    currentOverRow: {
        backgroundColor: Colors.primary + '08',
        borderRadius: 10,
        paddingHorizontal: 8,
        marginHorizontal: -4,
        borderBottomWidth: 0,
    },
    overHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 8,
    },
    overNumberBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    overNumberText: {
        color: Colors.textSecondary,
        fontSize: 10,
        fontWeight: '800' as const,
    },
    overBowlerName: {
        color: Colors.textMuted,
        fontSize: 11,
        fontWeight: '500' as const,
        flex: 1,
    },
    overTotal: {
        color: Colors.textPrimary,
        fontSize: 11,
        fontWeight: '700' as const,
    },
    overWicketBadge: {
        backgroundColor: Colors.wicket + '20',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    overWicketText: {
        color: Colors.wicket,
        fontSize: 9,
        fontWeight: '800' as const,
    },
    overBalls: {
        flexDirection: 'row',
        gap: 5,
    },
    ballBubble: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1.5,
    },
    ballText: {
        fontSize: 10,
        fontWeight: '700' as const,
    },
    feedbackBanner: {
        alignItems: 'center',
        marginBottom: 8,
    },
    feedbackText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '800' as const,
    },
    matchOverBanner: {
        backgroundColor: Colors.accent + '15',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.accent + '30',
    },
    matchOverText: {
        color: Colors.accent,
        fontSize: 20,
        fontWeight: '800' as const,
        marginTop: 8,
    },
    matchResultText: {
        color: Colors.textPrimary,
        fontSize: 14,
        fontWeight: '600' as const,
        marginTop: 6,
        textAlign: 'center',
    },
    mvpRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 10,
    },
    mvpLabel: {
        color: Colors.primary,
        fontSize: 11,
        fontWeight: '800' as const,
        letterSpacing: 0.5,
    },
    mvpName: {
        color: Colors.textPrimary,
        fontSize: 14,
        fontWeight: '700' as const,
    },
    viewScorecardBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 14,
    },
    viewScorecardText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '700' as const,
    },
    scoringPanel: {
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 10,
    },
    runsRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 6,
    },
    runBtn: {
        flex: 1,
        height: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    dotBtn: {
        backgroundColor: Colors.surfaceLight,
    },
    runBtnText: {
        color: Colors.textPrimary,
        fontSize: 18,
        fontWeight: '700' as const,
    },
    dotBtnText: {
        fontSize: 28,
        color: Colors.textMuted,
    },
    fourBtn: {
        backgroundColor: Colors.four + '20',
        borderColor: Colors.four + '40',
    },
    sixBtn: {
        backgroundColor: Colors.six + '20',
        borderColor: Colors.six + '40',
    },
    wicketBtn: {
        backgroundColor: Colors.wicket + '20',
        borderColor: Colors.wicket + '40',
    },
    extrasBtn: {
        backgroundColor: Colors.extras + '20',
        borderColor: Colors.extras + '40',
    },
    specialBtnText: {
        color: Colors.textPrimary,
        fontSize: 18,
        fontWeight: '800' as const,
    },
    wicketBtnText: {
        color: Colors.wicket,
        fontSize: 18,
        fontWeight: '800' as const,
    },
    extrasBtnText: {
        color: Colors.extras,
        fontSize: 14,
        fontWeight: '800' as const,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 2,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    actionText: {
        color: Colors.textSecondary,
        fontSize: 11,
        fontWeight: '600' as const,
    },
    abandonBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 8,
        marginTop: 2,
    },
    abandonText: {
        color: Colors.danger,
        fontSize: 11,
        fontWeight: '600' as const,
    },
    errorText: {
        color: Colors.textPrimary,
        fontSize: 16,
        textAlign: 'center',
        marginTop: 100,
    },
    backBtn: {
        alignSelf: 'center',
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: Colors.primary,
    },
    backBtnText: {
        color: Colors.white,
        fontWeight: '600' as const,
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
        flex: 1,
    },
    modalInput: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        padding: 14,
        color: Colors.textPrimary,
        fontSize: 15,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 4,
    },
    defaultNameHint: {
        color: Colors.textMuted,
        fontSize: 11,
        fontWeight: '500' as const,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    duplicateWarning: {
        backgroundColor: Colors.danger + '15',
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.danger + '30',
    },
    duplicateWarningText: {
        color: Colors.danger,
        fontSize: 12,
        fontWeight: '600' as const,
    },
    suggestionsContainer: {
        marginBottom: 12,
        borderRadius: 10,
        overflow: 'hidden',
    },
    suggestionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    suggestionName: {
        color: Colors.textPrimary,
        fontSize: 14,
        fontWeight: '600' as const,
    },
    suggestionTeam: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    modalBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    modalBtnText: {
        color: Colors.white,
        fontSize: 15,
        fontWeight: '700' as const,
    },
    bowlerChangeHint: {
        color: Colors.textSecondary,
        fontSize: 13,
        fontWeight: '500' as const,
        marginBottom: 14,
    },
    bowlerChangeList: {
        gap: 6,
        marginBottom: 12,
    },
    bowlerChangeItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    bowlerChangeName: {
        color: Colors.textPrimary,
        fontSize: 14,
        fontWeight: '600' as const,
    },
    bowlerChangeStats: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '500' as const,
    },
    noBowlersText: {
        color: Colors.textMuted,
        fontSize: 13,
        textAlign: 'center',
        paddingVertical: 16,
    },
    addNewBowlerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.primary + '40',
        borderStyle: 'dashed',
        marginBottom: 8,
    },
    addNewBowlerText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600' as const,
    },
    continueSameBtn: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    continueSameText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '500' as const,
    },
    zoneOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    zonePickerContainer: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 20,
        width: 280,
        alignItems: 'center',
    },
    zoneTitle: {
        color: Colors.textPrimary,
        fontSize: 15,
        fontWeight: '700' as const,
        marginBottom: 16,
    },
    zoneGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12,
    },
    zoneBtn: {
        width: 76,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    zoneBtnText: {
        color: Colors.textPrimary,
        fontSize: 12,
        fontWeight: '600' as const,
    },
    zoneSkipBtn: {
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    zoneSkipText: {
        color: Colors.textMuted,
        fontSize: 13,
        fontWeight: '500' as const,
    },
    wicketTypes: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    wicketTypeBtn: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    wicketTypeBtnActive: {
        borderColor: Colors.danger,
        backgroundColor: Colors.danger + '15',
    },
    wicketTypeText: {
        color: Colors.textSecondary,
        fontSize: 13,
        fontWeight: '600' as const,
    },
    wicketTypeTextActive: {
        color: Colors.danger,
    },
    wicketConfirmBtn: {
        backgroundColor: Colors.danger,
    },
    extraTypes: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    extraTypeBtn: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    extraTypeBtnActive: {
        borderColor: Colors.accent,
        backgroundColor: Colors.accent + '15',
    },
    extraTypeText: {
        color: Colors.textSecondary,
        fontSize: 13,
        fontWeight: '600' as const,
    },
    extraTypeTextActive: {
        color: Colors.accent,
    },
    extraRunsLabel: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '600' as const,
        marginBottom: 8,
    },
    extraRunsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    extraRunBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    extraRunBtnActive: {
        borderColor: Colors.accent,
        backgroundColor: Colors.accent + '20',
    },
    extraRunText: {
        color: Colors.textSecondary,
        fontSize: 16,
        fontWeight: '700' as const,
    },
    extraRunTextActive: {
        color: Colors.accent,
    },
    retireSubtitle: {
        color: Colors.textSecondary,
        fontSize: 13,
        marginBottom: 16,
    },
    retirePlayerBlock: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    retirePlayerName: {
        color: Colors.textPrimary,
        fontSize: 14,
        fontWeight: '600' as const,
        marginBottom: 10,
    },
    retireActions: {
        flexDirection: 'row',
        gap: 8,
    },
    retireHurtBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: Colors.accent + '15',
        borderWidth: 1,
        borderColor: Colors.accent + '40',
    },
    retireHurtText: {
        color: Colors.accent,
        fontSize: 13,
        fontWeight: '600' as const,
    },
    retireOutBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: Colors.danger + '15',
        borderWidth: 1,
        borderColor: Colors.danger + '40',
    },
    retireOutText: {
        color: Colors.danger,
        fontSize: 13,
        fontWeight: '600' as const,
    },
});
