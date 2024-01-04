import { BacktraceClient, ErrorBoundary } from '@backtrace/react-native';
import {
    Alert,
    FlatList,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { generateActions } from './src/actions/actions';
import { CustomizableButton } from './src/components/CustomizableButton';
import ErrorBoundaryFallback from './src/components/ErrorBoundaryFallback';
import { ErrorBoundaryTrigger } from './src/components/ErrorBoundaryTrigger';
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
        <ErrorBoundary
            fallback={
                <View>
                    <Text style={styles.defaultText}>Global error boundary</Text>
                </View>
            }
        >
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

                        <View>
                            <TouchableOpacity style={styles.actionButton}>
                                <ErrorBoundary fallback={<ErrorBoundaryFallback textStyle={styles.defaultText} />}>
                                    <ErrorBoundaryTrigger textStyle={styles.defaultText} />
                                </ErrorBoundary>
                            </TouchableOpacity>
                        </View>

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
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    actionButton: {
        backgroundColor: '#d8f8e9',
        width: '100%',
        padding: 5,
        borderRadius: 100 / 2,
    },
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
    sectionDescription: {
        marginTop: 8,
        fontSize: 18,
        fontWeight: '400',
    },
    highlight: {
        fontWeight: '700',
    },
    defaultText: {
        color: 'black',
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default App;
