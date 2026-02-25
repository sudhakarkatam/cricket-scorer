import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { Innings, ShotZone } from '@/types/cricket';

interface WagonWheelProps {
    innings: Innings;
    size?: number;
}

const ZONE_CONFIG: { key: ShotZone; label: string; angle: number; short: string }[] = [
    { key: 'straight', label: 'Straight', angle: 0, short: 'ST' },
    { key: 'cover', label: 'Cover', angle: 60, short: 'CV' },
    { key: 'off', label: 'Off Side', angle: 120, short: 'OF' },
    { key: 'fine', label: 'Fine', angle: 180, short: 'FN' },
    { key: 'leg', label: 'Leg Side', angle: 240, short: 'LG' },
    { key: 'midwicket', label: 'Mid-wicket', angle: 300, short: 'MW' },
];

export default function WagonWheel({ innings, size = 200 }: WagonWheelProps) {
    const zoneData = useMemo(() => {
        const zones: Record<ShotZone, { runs: number; balls: number; fours: number; sixes: number }> = {
            off: { runs: 0, balls: 0, fours: 0, sixes: 0 },
            cover: { runs: 0, balls: 0, fours: 0, sixes: 0 },
            straight: { runs: 0, balls: 0, fours: 0, sixes: 0 },
            midwicket: { runs: 0, balls: 0, fours: 0, sixes: 0 },
            leg: { runs: 0, balls: 0, fours: 0, sixes: 0 },
            fine: { runs: 0, balls: 0, fours: 0, sixes: 0 },
        };

        innings.ballLog.forEach(ball => {
            if (ball.shotZone && ball.runs > 0 && !ball.extraType) {
                zones[ball.shotZone].runs += ball.runs;
                zones[ball.shotZone].balls++;
                if (ball.runs === 4) zones[ball.shotZone].fours++;
                if (ball.runs === 6) zones[ball.shotZone].sixes++;
            }
        });

        return zones;
    }, [innings.ballLog]);

    const totalZoneRuns = useMemo(() => {
        return Object.values(zoneData).reduce((sum, z) => sum + z.runs, 0);
    }, [zoneData]);

    const maxRuns = useMemo(() => {
        return Math.max(...Object.values(zoneData).map(z => z.runs), 1);
    }, [zoneData]);

    if (totalZoneRuns === 0) {
        return (
            <View style={[styles.emptyContainer, { width: size, height: size }]}>
                <View style={[styles.emptyField, { width: size * 0.8, height: size * 0.8, borderRadius: size * 0.4 }]}>
                    <Text style={styles.emptyText}>No shot data</Text>
                    <Text style={styles.emptyHint}>Tap zones after scoring</Text>
                </View>
            </View>
        );
    }

    const radius = size / 2 - 30;
    const center = size / 2;

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <View style={[styles.fieldOuter, { width: size, height: size, borderRadius: size / 2 }]}>
                <View style={[styles.fieldInner, { width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3 }]}>
                    <View style={styles.pitchLine} />
                    <View style={styles.batsmanDot} />
                </View>

                {ZONE_CONFIG.map(zone => {
                    const data = zoneData[zone.key];
                    const angleRad = ((zone.angle - 90) * Math.PI) / 180;
                    const x = center + radius * Math.cos(angleRad) - 22;
                    const y = center + radius * Math.sin(angleRad) - 16;
                    const intensity = data.runs / maxRuns;
                    const bgOpacity = Math.max(0.15, intensity * 0.6);

                    return (
                        <View
                            key={zone.key}
                            style={[
                                styles.zoneLabel,
                                {
                                    left: x,
                                    top: y,
                                    backgroundColor: data.runs > 0
                                        ? (data.sixes > 0 ? Colors.six : data.fours > 0 ? Colors.four : Colors.primary) + Math.round(bgOpacity * 255).toString(16).padStart(2, '0')
                                        : Colors.surfaceLight,
                                },
                            ]}
                        >
                            <Text style={[styles.zoneName, data.runs > 0 && styles.zoneNameActive]}>{zone.short}</Text>
                            <Text style={[styles.zoneRuns, data.runs > 0 && styles.zoneRunsActive]}>{data.runs}</Text>
                        </View>
                    );
                })}

                {ZONE_CONFIG.map(zone => {
                    const data = zoneData[zone.key];
                    if (data.runs === 0) return null;

                    const angleRad = ((zone.angle - 90) * Math.PI) / 180;
                    const lineLen = (data.runs / maxRuns) * (radius * 0.6);
                    const endX = center + lineLen * Math.cos(angleRad);
                    const endY = center + lineLen * Math.sin(angleRad);
                    const lineColor = data.sixes > 0 ? Colors.six : data.fours > 0 ? Colors.four : Colors.primary;

                    const dx = endX - center;
                    const dy = endY - center;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                    return (
                        <View
                            key={`line-${zone.key}`}
                            style={[
                                styles.shotLine,
                                {
                                    width: length,
                                    left: center,
                                    top: center - 1,
                                    transform: [{ rotate: `${angle}deg` }],
                                    backgroundColor: lineColor,
                                    opacity: 0.8,
                                },
                            ]}
                        />
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyField: {
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    emptyText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '600' as const,
    },
    emptyHint: {
        color: Colors.textMuted,
        fontSize: 10,
        marginTop: 4,
    },
    fieldOuter: {
        backgroundColor: '#1a3320',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.primary + '30',
    },
    fieldInner: {
        backgroundColor: '#1e3d26',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.primary + '20',
    },
    pitchLine: {
        width: 4,
        height: 36,
        backgroundColor: '#c4a35a',
        borderRadius: 2,
        opacity: 0.7,
    },
    batsmanDot: {
        position: 'absolute',
        bottom: '30%',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.textPrimary,
        opacity: 0.5,
    },
    zoneLabel: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    zoneName: {
        color: Colors.textMuted,
        fontSize: 8,
        fontWeight: '700' as const,
        letterSpacing: 0.3,
    },
    zoneNameActive: {
        color: Colors.textPrimary,
    },
    zoneRuns: {
        color: Colors.textMuted,
        fontSize: 11,
        fontWeight: '800' as const,
    },
    zoneRunsActive: {
        color: Colors.textPrimary,
    },
    shotLine: {
        position: 'absolute',
        height: 2.5,
        borderRadius: 1.5,
        transformOrigin: 'left center',
    },
});
