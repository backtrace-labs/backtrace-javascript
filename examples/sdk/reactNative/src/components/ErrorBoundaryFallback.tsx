import React, { useEffect } from 'react';
import { Alert, StyleProp, Text, TextStyle, View } from 'react-native';

export default function ErrorBoundaryFallback({ textStyle }: { textStyle: StyleProp<TextStyle> }) {
    useEffect(() => {
        Alert.alert(
            'Inner ErrorBoundary Triggered! Check your Backtrace console to see the Error and Component stacks.',
        );
    });
    return (
        <View>
            <Text style={textStyle}>Error boundary triggered</Text>
        </View>
    );
}
