import React, { useState } from 'react';
import { Pressable, StyleProp, Text, TextStyle, View } from 'react-native';

export function ErrorBoundaryTrigger({ textStyle }: { textStyle: StyleProp<TextStyle> }) {
    const [clicked, setClicked] = useState(false);

    if (clicked) {
        throw new Error('Button already clicked.');
    }

    return (
        <>
            <View>
                <Pressable
                    onPress={() => {
                        setClicked(true);
                    }}
                >
                    <Text style={textStyle}>Trigger error boundary</Text>
                </Pressable>
            </View>
        </>
    );
}
