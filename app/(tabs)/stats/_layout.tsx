import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function StatsLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: Colors.surface },
                headerTintColor: Colors.textPrimary,
                headerTitleStyle: { fontWeight: '700' as const },
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Statistics' }} />
        </Stack>
    );
}
