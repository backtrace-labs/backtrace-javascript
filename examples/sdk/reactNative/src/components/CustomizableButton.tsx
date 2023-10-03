import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export type CustomizableButtonOptions = {
    title: string;
    backgroundColor: string;
    textColor: string;
    callback: () => void | Promise<void>;
};
export function CustomizableButton({
    title,
    backgroundColor,
    textColor,
    callback,
}: CustomizableButtonOptions): JSX.Element {
    return (
        <View
            style={{
                margin: 5,
            }}
        >
            <TouchableOpacity
                style={{
                    backgroundColor: backgroundColor ?? '#d8f8e9',
                    width: '100%',
                    padding: 5,
                    borderRadius: 100 / 2,
                }}
                onPress={callback}
            >
                <Text style={{ color: textColor ?? 'black', fontWeight: 'bold', textAlign: 'center' }}>{title}</Text>
            </TouchableOpacity>
        </View>
    );
}
