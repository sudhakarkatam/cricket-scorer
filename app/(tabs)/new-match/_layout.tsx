import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function NewMatchLayout() {
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
                    title: 'New Match',
                    headerTitleStyle: {
                        fontWeight: '800' as const,
                        fontSize: 20,
                    },
                }}
            />
        </Stack>
    );
}

