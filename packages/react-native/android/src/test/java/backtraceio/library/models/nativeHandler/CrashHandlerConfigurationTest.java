package backtraceio.library.models.nativeHandler;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import android.content.pm.ApplicationInfo;

import java.io.File;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class CrashHandlerConfigurationTest {
    private static final String LIBRARY_NAME = "libbacktrace-native.so";
    private static final String ABI = "arm64-v8a";

    @Rule
    public final TemporaryFolder temporaryFolder = new TemporaryFolder();

    @Test
    public void usesExactApkBackedPathReportedByLinker() throws IOException {
        File baseApk = plainFile("base.apk");
        File splitApk = plainFile("split_config.arm64_v8a.apk");
        String loadedPath = splitApk.getAbsolutePath() + "!/lib/" + ABI + "/" + LIBRARY_NAME;
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);
        applicationInfo.splitSourceDirs = new String[]{splitApk.getAbsolutePath()};

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> loadedPath);

        assertEquals(loadedPath, environmentValue(
                configuration.getCrashHandlerEnvironmentVariables(applicationInfo),
                CrashHandlerConfiguration.BACKTRACE_CRASH_HANDLER));
    }

    @Test
    public void usesExactExtractedPathReportedByLinker() throws IOException {
        File baseApk = plainFile("base.apk");
        File extractedLibrary = plainFile(LIBRARY_NAME);
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(extractedLibrary::getAbsolutePath);

        assertEquals(
                extractedLibrary.getAbsolutePath(),
                configuration.resolveBacktraceNativeLibraryPath(applicationInfo, ABI, extractedLibrary.getAbsolutePath()));
    }

    @Test
    public void usesExtractedNativeLibraryWhenLinkerMetadataIsUnavailable() throws IOException {
        File baseApk = plainFile("base.apk");
        File nativeLibraryDirectory = temporaryFolder.newFolder("lib");
        File extractedLibrary = plainFile(nativeLibraryDirectory, LIBRARY_NAME);
        ApplicationInfo applicationInfo = applicationInfo(baseApk, nativeLibraryDirectory);

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null);

        assertEquals(
                extractedLibrary.getAbsolutePath(),
                configuration.resolveBacktraceNativeLibraryPath(applicationInfo, ABI, null));
    }

    @Test
    public void selectsAbiSplitByFilenameWithoutOpeningTheApk() throws IOException {
        File baseApk = plainFile("base.apk");
        File languageSplit = plainFile("split_config.en.apk");
        File abiSplit = plainFile("split_config.arm64_v8a.apk");
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);
        applicationInfo.splitSourceDirs = new String[]{languageSplit.getAbsolutePath(), abiSplit.getAbsolutePath()};

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null);

        assertEquals(
                apkEntry(abiSplit, ABI),
                configuration.resolveBacktraceNativeLibraryPath(applicationInfo, ABI, null));
    }

    @Test
    public void selectsAbiSplitBySplitNameWhenFilenameIsGeneric() throws IOException {
        File genericSplit = plainFile("split_7.apk");

        assertEquals(
                genericSplit.getAbsolutePath(),
                CrashHandlerConfiguration.findAbiSplitPath(
                        new String[]{genericSplit.getAbsolutePath()}, null, new String[]{"config.arm64_v8a"}, ABI));
    }

    @Test
    public void supportsPublicSplitMetadata() throws IOException {
        File baseApk = plainFile("base.apk");
        File abiSplit = plainFile("split_config.x86_64.apk");
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);
        applicationInfo.splitPublicSourceDirs = new String[]{abiSplit.getAbsolutePath()};

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null);

        assertEquals(
                apkEntry(abiSplit, "x86_64"),
                configuration.resolveBacktraceNativeLibraryPath(applicationInfo, "x86_64", null));
    }

    @Test
    public void doesNotTreatX86SplitAsX8664Split() throws IOException {
        File baseApk = plainFile("base.apk");
        File x86Split = plainFile("split_config.x86.apk");
        File x8664Split = plainFile("split_config.x86_64.apk");
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);
        applicationInfo.splitSourceDirs = new String[]{x86Split.getAbsolutePath(), x8664Split.getAbsolutePath()};

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null);

        assertEquals(
                apkEntry(x8664Split, "x86_64"),
                configuration.resolveBacktraceNativeLibraryPath(applicationInfo, "x86_64", null));
    }

    @Test
    public void doesNotTreatX8664SplitAsX86Split() throws IOException {
        File baseApk = plainFile("base.apk");
        File x8664Split = plainFile("split_config.x86_64.apk");
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);
        applicationInfo.splitSourceDirs = new String[]{x8664Split.getAbsolutePath()};

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null);

        assertEquals(
                apkEntry(baseApk, "x86"),
                configuration.resolveBacktraceNativeLibraryPath(applicationInfo, "x86", null));
    }

    @Test
    public void loadedLinkerPathIsAuthoritativeWhenDevicePreferredAbiDiffers() throws IOException {
        File baseApk = plainFile("base.apk");
        File arm32Split = plainFile("split_config.armeabi_v7a.apk");
        String loadedPath = apkEntry(arm32Split, "armeabi-v7a");
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> loadedPath);

        assertEquals(loadedPath, configuration.resolveBacktraceNativeLibraryPath(applicationInfo, ABI, loadedPath));
    }

    @Test
    public void rejectsRelativeOrWrongLibraryLoadedPath() throws IOException {
        File baseApk = plainFile("base.apk");
        File otherLibrary = plainFile("libsomething-else.so");
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);
        String baseFallback = apkEntry(baseApk, ABI);
        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null);

        assertEquals(baseFallback, configuration.resolveBacktraceNativeLibraryPath(
                applicationInfo, ABI, "lib/" + ABI + "/" + LIBRARY_NAME));
        assertEquals(baseFallback, configuration.resolveBacktraceNativeLibraryPath(
                applicationInfo, ABI, otherLibrary.getAbsolutePath()));
        assertEquals(baseFallback, configuration.resolveBacktraceNativeLibraryPath(
                applicationInfo, ABI, new File(temporaryFolder.getRoot(), LIBRARY_NAME).getAbsolutePath()));
        assertEquals(baseFallback, configuration.resolveBacktraceNativeLibraryPath(
                applicationInfo, ABI, baseApk.getAbsolutePath() + "!/lib/" + ABI + "/libother.so"));
        assertEquals(baseFallback, configuration.resolveBacktraceNativeLibraryPath(
                applicationInfo, ABI, apkEntry(new File(temporaryFolder.getRoot(), "absent.apk"), ABI)));
    }

    @Test
    public void linkerPathProviderFailureUsesMetadataFallback() throws IOException {
        File baseApk = plainFile("base.apk");
        File nativeLibraryDirectory = temporaryFolder.newFolder("lib");
        File extractedLibrary = plainFile(nativeLibraryDirectory, LIBRARY_NAME);
        ApplicationInfo applicationInfo = applicationInfo(baseApk, nativeLibraryDirectory);

        CrashHandlerConfiguration linkageErrorConfiguration = new CrashHandlerConfiguration(() -> {
            throw new UnsatisfiedLinkError("no resolveLoadedLibraryPath");
        });
        CrashHandlerConfiguration runtimeErrorConfiguration = new CrashHandlerConfiguration(() -> {
            throw new IllegalStateException("provider exploded");
        });

        assertEquals(extractedLibrary.getAbsolutePath(), environmentValue(
                linkageErrorConfiguration.getCrashHandlerEnvironmentVariables(applicationInfo),
                CrashHandlerConfiguration.BACKTRACE_CRASH_HANDLER));
        assertEquals(extractedLibrary.getAbsolutePath(), environmentValue(
                runtimeErrorConfiguration.getCrashHandlerEnvironmentVariables(applicationInfo),
                CrashHandlerConfiguration.BACKTRACE_CRASH_HANDLER));
    }

    @Test
    public void ignoresNullSplitPathEvenWhenSplitNameMatchesAbi() {
        assertNull(CrashHandlerConfiguration.findAbiSplitPath(
                new String[]{null}, null, new String[]{"config.arm64_v8a"}, ABI));
    }

    @Test
    public void baseConfigAbiSplitIsPreferred() throws IOException {
        File baseApk = plainFile("base.apk");
        File featureSplit = plainFile("split_feature_video.config.arm64_v8a.apk");
        File baseConfigSplit = plainFile("split_config.arm64_v8a.apk");
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);
        applicationInfo.splitSourceDirs = new String[]{featureSplit.getAbsolutePath(), baseConfigSplit.getAbsolutePath()};

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null);

        assertEquals(
                apkEntry(baseConfigSplit, ABI),
                configuration.resolveBacktraceNativeLibraryPath(applicationInfo, ABI, null));
    }

    @Test
    public void exactPublicSplitOutranksLoosePrivateSplit() throws IOException {
        File baseApk = plainFile("base.apk");
        File looseSplit = plainFile("feature_video.arm64_v8a.apk");
        File exactSplit = plainFile("split_config.arm64_v8a.apk");
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);
        applicationInfo.splitSourceDirs = new String[]{looseSplit.getAbsolutePath()};
        applicationInfo.splitPublicSourceDirs = new String[]{exactSplit.getAbsolutePath()};

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null);

        assertEquals(
                apkEntry(exactSplit, ABI),
                configuration.resolveBacktraceNativeLibraryPath(applicationInfo, ABI, null));
    }

    @Test
    public void duplicatePrivateAndPublicSplitIsDeduplicated() throws IOException {
        File baseApk = plainFile("base.apk");
        File abiSplit = plainFile("split_config.arm64_v8a.apk");
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);
        applicationInfo.splitSourceDirs = new String[]{abiSplit.getAbsolutePath()};
        applicationInfo.splitPublicSourceDirs = new String[]{abiSplit.getAbsolutePath()};

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null);

        assertEquals(
                apkEntry(abiSplit, ABI),
                configuration.resolveBacktraceNativeLibraryPath(applicationInfo, ABI, null));
    }

    @Test
    public void ambiguousLooseAbiSplitsAreRejected() throws IOException {
        File baseApk = plainFile("base.apk");
        File firstLooseSplit = plainFile("feature_video.arm64_v8a.apk");
        File secondLooseSplit = plainFile("feature_audio.arm64_v8a.apk");
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);
        applicationInfo.splitSourceDirs = new String[]{firstLooseSplit.getAbsolutePath(), secondLooseSplit.getAbsolutePath()};

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null);

        assertEquals(
                apkEntry(baseApk, ABI),
                configuration.resolveBacktraceNativeLibraryPath(applicationInfo, ABI, null));
    }

    @Test
    public void dynamicFeatureAbiSplitIsNotSelectedAsBaseConfig() throws IOException {
        File featureSplit = plainFile("split_feature_video.config.arm64_v8a.apk");

        assertNull(CrashHandlerConfiguration.findAbiSplitPath(
                new String[]{featureSplit.getAbsolutePath()}, null, new String[]{"feature_video.config.arm64_v8a"}, ABI));
    }

    @Test
    public void exactBaseConfigWinsAcrossBothMetadataArrays() throws IOException {
        File baseApk = plainFile("base.apk");
        File privateLooseSplit = plainFile("feature_ui.arm64_v8a.apk");
        File publicLooseSplit = plainFile("feature_net.arm64_v8a.apk");
        File exactSplit = plainFile("split_config.arm64_v8a.apk");
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);
        applicationInfo.splitSourceDirs = new String[]{privateLooseSplit.getAbsolutePath(), exactSplit.getAbsolutePath()};
        applicationInfo.splitPublicSourceDirs = new String[]{publicLooseSplit.getAbsolutePath()};

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null);

        assertEquals(
                apkEntry(exactSplit, ABI),
                configuration.resolveBacktraceNativeLibraryPath(applicationInfo, ABI, null));
    }

    @Test
    public void looseTokenIsRejectedWhenGlobalSplitNameMetadataExists() throws IOException {
        File languageSplit = plainFile("split_config.en.apk");
        File looseSplit = plainFile("feature_video.arm64_v8a.apk");

        assertNull(CrashHandlerConfiguration.findAbiSplitPath(
                new String[]{languageSplit.getAbsolutePath(), looseSplit.getAbsolutePath()},
                null,
                new String[]{"config.en", "feature_video"},
                ABI));
    }

    @Test
    public void truncatedSplitNamesDoesNotEnableLooseDynamicFeatureMatch() throws IOException {
        File languageSplit = plainFile("split_config.en.apk");
        File featureAbiSplit = plainFile("feature_video.arm64_v8a.apk");

        assertNull(CrashHandlerConfiguration.findAbiSplitPath(
                new String[]{languageSplit.getAbsolutePath(), featureAbiSplit.getAbsolutePath()},
                null,
                new String[]{"config.en"},
                ABI));
    }

    @Test
    public void exactFilenameStillMatchesWhenSplitNamesArrayIsShort() throws IOException {
        File languageSplit = plainFile("split_config.en.apk");
        File abiSplit = plainFile("split_config.arm64_v8a.apk");

        assertEquals(
                abiSplit.getAbsolutePath(),
                CrashHandlerConfiguration.findAbiSplitPath(
                        new String[]{languageSplit.getAbsolutePath(), abiSplit.getAbsolutePath()},
                        null,
                        new String[]{"config.en"},
                        ABI));
    }

    @Test
    public void uniqueLooseFilenameMatchesWhenSplitNamesAreGloballyUnavailable() throws IOException {
        File baseApk = plainFile("base.apk");
        File looseSplit = plainFile("feature_video.arm64_v8a.apk");
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);
        applicationInfo.splitSourceDirs = new String[]{looseSplit.getAbsolutePath()};

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null);

        assertEquals(
                apkEntry(looseSplit, ABI),
                configuration.resolveBacktraceNativeLibraryPath(applicationInfo, ABI, null));
    }

    @Test
    public void loadedLinkerPathSucceedsWithoutProcessAbi() throws IOException {
        File baseApk = plainFile("base.apk");
        File loadedLibrary = plainFile(LIBRARY_NAME);
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(loadedLibrary::getAbsolutePath);

        assertEquals(
                loadedLibrary.getAbsolutePath(),
                configuration.resolveBacktraceNativeLibraryPath(applicationInfo, null, loadedLibrary.getAbsolutePath()));
    }

    @Test
    public void loadedLinkerPathSucceedsWhenAbiProviderFails() throws IOException {
        File baseApk = plainFile("base.apk");
        File loadedLibrary = plainFile(LIBRARY_NAME);
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(loadedLibrary::getAbsolutePath, () -> {
            throw new IllegalStateException("Unable to determine the current process ABI");
        });

        assertEquals(loadedLibrary.getAbsolutePath(), environmentValue(
                configuration.getCrashHandlerEnvironmentVariables(applicationInfo),
                CrashHandlerConfiguration.BACKTRACE_CRASH_HANDLER));
    }

    @Test
    public void extractedLibrarySucceedsWhenAbiProviderThrows() throws IOException {
        File baseApk = plainFile("base.apk");
        File nativeLibraryDirectory = temporaryFolder.newFolder("lib");
        File extractedLibrary = plainFile(nativeLibraryDirectory, LIBRARY_NAME);
        ApplicationInfo applicationInfo = applicationInfo(baseApk, nativeLibraryDirectory);

        CrashHandlerConfiguration runtimeExceptionConfiguration = new CrashHandlerConfiguration(() -> null, () -> {
            throw new IllegalStateException("Unable to determine the current process ABI");
        });
        CrashHandlerConfiguration linkageErrorConfiguration = new CrashHandlerConfiguration(() -> null, () -> {
            throw new NoSuchMethodError("android.os.Process.is64Bit");
        });

        assertEquals(extractedLibrary.getAbsolutePath(), environmentValue(
                runtimeExceptionConfiguration.getCrashHandlerEnvironmentVariables(applicationInfo),
                CrashHandlerConfiguration.BACKTRACE_CRASH_HANDLER));
        assertEquals(extractedLibrary.getAbsolutePath(), environmentValue(
                linkageErrorConfiguration.getCrashHandlerEnvironmentVariables(applicationInfo),
                CrashHandlerConfiguration.BACKTRACE_CRASH_HANDLER));
    }

    @Test
    public void metadataFallbackStillRequiresProcessAbi() throws IOException {
        File baseApk = plainFile("base.apk");
        File abiSplit = plainFile("split_config.arm64_v8a.apk");
        ApplicationInfo withoutSplits = applicationInfo(baseApk, null);
        ApplicationInfo withSplit = applicationInfo(baseApk, null);
        withSplit.splitSourceDirs = new String[]{abiSplit.getAbsolutePath()};

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null);

        assertThrows(IllegalArgumentException.class,
                () -> configuration.resolveBacktraceNativeLibraryPath(withoutSplits, null, null));
        assertThrows(IllegalArgumentException.class,
                () -> configuration.resolveBacktraceNativeLibraryPath(withSplit, null, null));
    }

    @Test
    public void defaultAbiProviderIsConsultedOnlyAtTheMetadataStage() throws IOException {
        File baseApk = plainFile("base.apk");
        File loadedLibrary = plainFile(LIBRARY_NAME);
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);

        CrashHandlerConfiguration withLinkerPath = new CrashHandlerConfiguration(loadedLibrary::getAbsolutePath);
        CrashHandlerConfiguration withoutLinkerPath = new CrashHandlerConfiguration(() -> null);

        assertEquals(loadedLibrary.getAbsolutePath(), environmentValue(
                withLinkerPath.getCrashHandlerEnvironmentVariables(applicationInfo),
                CrashHandlerConfiguration.BACKTRACE_CRASH_HANDLER));
        assertThrows(IllegalStateException.class,
                () -> withoutLinkerPath.getCrashHandlerEnvironmentVariables(applicationInfo));
    }

    @Test
    public void reservedEnvironmentVariablesAppearExactlyOnceAndAreReplaced() throws IOException {
        File baseApk = plainFile("base.apk");
        File nativeLibraryDirectory = temporaryFolder.newFolder("lib");
        plainFile(nativeLibraryDirectory, LIBRARY_NAME);
        ApplicationInfo applicationInfo = applicationInfo(baseApk, nativeLibraryDirectory);

        Map<String, String> parentEnvironment = new LinkedHashMap<>();
        parentEnvironment.put("CLASSPATH", "/parent/classpath.apk");
        parentEnvironment.put(CrashHandlerConfiguration.BACKTRACE_CRASH_HANDLER, "/parent/stale-handler.so");
        parentEnvironment.put("LD_LIBRARY_PATH", "/parent/lib");
        parentEnvironment.put("ANDROID_DATA", "/parent/data");
        parentEnvironment.put("UNRELATED", "kept");
        parentEnvironment.put("WITH_EQUALS", "a=b=c");

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null);
        List<String> environment = configuration.getCrashHandlerEnvironmentVariables(applicationInfo, parentEnvironment);

        for (String reserved : new String[]{
                "CLASSPATH", CrashHandlerConfiguration.BACKTRACE_CRASH_HANDLER, "LD_LIBRARY_PATH", "ANDROID_DATA"}) {
            int occurrences = 0;
            for (String variable : environment) {
                if (variable.startsWith(reserved + "=")) {
                    occurrences++;
                }
            }
            assertEquals(reserved, 1, occurrences);
        }
        assertEquals(baseApk.getAbsolutePath(), environmentValue(environment, "CLASSPATH"));
        assertNotEquals("/parent/stale-handler.so",
                environmentValue(environment, CrashHandlerConfiguration.BACKTRACE_CRASH_HANDLER));
        assertEquals("/data", environmentValue(environment, "ANDROID_DATA"));
        assertTrue(environmentValue(environment, "LD_LIBRARY_PATH").startsWith(nativeLibraryDirectory.getAbsolutePath()));
        assertEquals("kept", environmentValue(environment, "UNRELATED"));
        assertEquals("a=b=c", environmentValue(environment, "WITH_EQUALS"));
    }

    @Test
    public void ignoresLanguageAndDensitySplitsAndFallsBackToBase() throws IOException {
        File baseApk = plainFile("base.apk");
        File languageSplit = plainFile("split_config.fr.apk");
        File densitySplit = plainFile("split_config.xxhdpi.apk");
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);
        applicationInfo.splitSourceDirs = new String[]{languageSplit.getAbsolutePath(), densitySplit.getAbsolutePath()};

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null);

        assertEquals(
                apkEntry(baseApk, ABI),
                configuration.resolveBacktraceNativeLibraryPath(applicationInfo, ABI, null));
    }

    @Test
    public void handlesNullNativeLibraryDirectory() throws IOException {
        File baseApk = plainFile("base.apk");
        ApplicationInfo applicationInfo = applicationInfo(baseApk, null);

        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null, () -> ABI);
        List<String> environment = configuration.getCrashHandlerEnvironmentVariables(applicationInfo);

        String librarySearchPath = environmentValue(environment, "LD_LIBRARY_PATH");
        assertNotNull(librarySearchPath);
        assertFalse(librarySearchPath.contains("null"));
        assertTrue(librarySearchPath.endsWith("/data/local"));
        assertEquals(apkEntry(baseApk, ABI), environmentValue(environment, CrashHandlerConfiguration.BACKTRACE_CRASH_HANDLER));
    }

    @Test
    public void supportedAbiPolicyIgnoresAbiProviderFailures() {
        CrashHandlerConfiguration configuration = new CrashHandlerConfiguration(() -> null, () -> {
            throw new IllegalStateException("Unable to determine the current process ABI");
        });

        assertTrue(configuration.isSupportedAbi());
        assertTrue(configuration.isSupportedAbi("x86_64"));
        assertFalse(configuration.isSupportedAbi("x86"));
    }

    private static ApplicationInfo applicationInfo(File baseApk, File nativeLibraryDirectory) {
        ApplicationInfo applicationInfo = new ApplicationInfo();
        applicationInfo.sourceDir = baseApk.getAbsolutePath();
        applicationInfo.publicSourceDir = baseApk.getAbsolutePath();
        applicationInfo.nativeLibraryDir = nativeLibraryDirectory == null ? null : nativeLibraryDirectory.getAbsolutePath();
        return applicationInfo;
    }

    private File plainFile(String name) throws IOException {
        return plainFile(temporaryFolder.getRoot(), name);
    }

    private static File plainFile(File directory, String name) throws IOException {
        File file = new File(directory, name);
        assertTrue(file.createNewFile());
        return file;
    }

    private static String apkEntry(File apk, String abi) {
        return apk.getAbsolutePath() + "!/lib/" + abi + "/" + LIBRARY_NAME;
    }

    private static String environmentValue(List<String> environment, String key) {
        String prefix = key + "=";
        for (String variable : environment) {
            if (variable.startsWith(prefix)) {
                return variable.substring(prefix.length());
            }
        }
        return null;
    }
}
