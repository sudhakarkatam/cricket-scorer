import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function HistoryLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: Colors.background },
                headerTintColor: Colors.textPrimary,
                contentStyle: { backgroundColor: Colors.background },
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: 'Match History',
                    headerTitleStyle: {
                        fontWeight: '800' as const,
                        fontSize: 20,
                    },
                }}
            />
        </Stack>
    );
}
