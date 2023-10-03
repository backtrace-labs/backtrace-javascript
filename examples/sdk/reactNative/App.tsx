import { BacktraceClient } from '@backtrace-labs/react-native';
import { Alert, FlatList, Image, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { generateActions } from './src/actions/actions';
import { CustomizableButton } from './src/components/CustomizableButton';
import { SUBMISSION_URL } from './src/consts';

function App(): JSX.Element {
    const client = BacktraceClient.instance as BacktraceClient;
    if (!client) {
        throw new Error('BacktraceClient is uninitialized. Call "BacktraceClient.initialize" function first.');
    }

    if (SUBMISSION_URL.includes('your-universe')) {
        Alert.alert('Don\'t forget to update your submission url in "./src/consts.ts" with your universe and token!');
    }

    client.addAttribute({ startup: Date.now() });

    return (
        <SafeAreaView style={{ backgroundColor: '#d8f8e9', height: '100%' }}>
            <ScrollView contentInsetAdjustmentBehavior="automatic">
                <View style={styles.sectionContainer}>
                    <Image
                        style={styles.headerLogo}
                        resizeMode="center"
                        alt="Sauce Labs"
                        source={{
                            uri: 'https://info.saucelabs.com/rs/468-XBT-687/images/SL%20logo%20horizontal%20color%2Bdark%402x.png',
                        }}
                    />
                    <Text style={styles.title}>Welcome to the Backtrace React SDK demo</Text>
                    <Text>Click the button below to test Backtrace integration</Text>

                    <ScrollView horizontal={true} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                        <FlatList
                            data={generateActions(client)}
                            renderItem={({ item }) => (
                                <CustomizableButton
                                    title={item.name}
                                    callback={() => {
                                        item.action();
                                    }}
                                ></CustomizableButton>
                            )}
                        />
                    </ScrollView>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    sectionContainer: {
        margin: 25,
        padding: 20,
        backgroundColor: 'white',
    },
    title: {
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '600',
        color: 'black',
        justifyContent: 'center',
    },
    headerLogo: {
        height: 100,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButton: {
        backgroundColor: '#d8f8e9',
        margin: 5,
    },
    sectionDescription: {
        marginTop: 8,
        fontSize: 18,
        fontWeight: '400',
    },
    highlight: {
        fontWeight: '700',
    },
});

export default App;
