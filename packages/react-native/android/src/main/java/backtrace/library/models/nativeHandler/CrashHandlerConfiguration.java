package backtraceio.library.models.nativeHandler;

import android.content.pm.ApplicationInfo;
import android.os.Build;

import androidx.annotation.RequiresApi;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import backtraceio.library.common.AbiHelper;
import backtraceio.library.services.BacktraceCrashHandlerRunner;

public class CrashHandlerConfiguration {

    public static final String BACKTRACE_CRASH_HANDLER = "BACKTRACE_CRASH_HANDLER";
    public static final Set<String> UNSUPPORTED_ABIS = new HashSet<String>(Arrays.asList(new String[]{"x86"}));
    private static final String CRASHPAD_DIRECTORY_NAME = "crashpad";
    private static final String APK_LIBRARY_SEPARATOR = "!/";
    private static final String BACKTRACE_NATIVE_LIBRARY_NAME = "libbacktrace-native.so";

    interface NativeLibraryPathProvider {
        String getLoadedLibraryPath();
    }

    interface AbiProvider {
        String getCurrentAbi();
    }

    private final NativeLibraryPathProvider nativeLibraryPathProvider;
    private final AbiProvider abiProvider;

    public CrashHandlerConfiguration() {
        this(CrashHandlerConfiguration::safelyResolveLoadedLibraryPath, AbiHelper::getCurrentAbi);
    }

    CrashHandlerConfiguration(NativeLibraryPathProvider nativeLibraryPathProvider) {
        this(nativeLibraryPathProvider, AbiHelper::getCurrentAbi);
    }

    CrashHandlerConfiguration(NativeLibraryPathProvider nativeLibraryPathProvider, AbiProvider abiProvider) {
        this.nativeLibraryPathProvider = nativeLibraryPathProvider;
        this.abiProvider = abiProvider;
    }

    public Boolean isSupportedAbi() {
        final String abi;
        try {
            abi = abiProvider.getCurrentAbi();
        } catch (RuntimeException | LinkageError ignored) {
            return true;
        }
        return isSupportedAbi(abi);
    }

    public Boolean isSupportedAbi(String abi) {
        return !UNSUPPORTED_ABIS.contains(abi);
    }

    public String getClassPath() {
        return BacktraceCrashHandlerRunner.class.getCanonicalName();
    }

    public List<String> getCrashHandlerEnvironmentVariables(ApplicationInfo applicationInfo) {
        return getCrashHandlerEnvironmentVariables(applicationInfo, System.getenv());
    }

    List<String> getCrashHandlerEnvironmentVariables(ApplicationInfo applicationInfo, Map<String, String> baseEnvironment) {
        if (applicationInfo == null) {
            throw new IllegalArgumentException("ApplicationInfo cannot be null");
        }

        final String classPathApk = firstNonEmpty(applicationInfo.sourceDir, applicationInfo.publicSourceDir);
        if (classPathApk == null) {
            throw new IllegalArgumentException("ApplicationInfo does not define an application APK path");
        }

        final String backtraceNativeLibraryPath = resolveBacktraceNativeLibraryPath(applicationInfo, getLoadedLibraryPath());

        return buildCrashHandlerEnvironment(
                baseEnvironment,
                classPathApk,
                backtraceNativeLibraryPath,
                buildNativeLibrarySearchPath(applicationInfo.nativeLibraryDir));
    }

    public String useCrashpadDirectory(String databaseDirectory) {
        if (isNullOrEmpty(databaseDirectory)) {
            throw new IllegalArgumentException("Database directory cannot be null or empty");
        }

        File crashpadDirectory = new File(databaseDirectory, CRASHPAD_DIRECTORY_NAME);
        if (crashpadDirectory.exists()) {
            if (!crashpadDirectory.isDirectory()) {
                throw new IllegalStateException("Crashpad path is not a directory: " + crashpadDirectory);
            }
        } else if (!crashpadDirectory.mkdirs() && !crashpadDirectory.isDirectory()) {
            throw new IllegalStateException("Unable to create Crashpad directory: " + crashpadDirectory);
        }
        return crashpadDirectory.getAbsolutePath();
    }

    String resolveBacktraceNativeLibraryPath(ApplicationInfo appInfo, String loadedLibraryPath) {
        return resolveLibraryPath(appInfo, loadedLibraryPath, abiProvider);
    }

    String resolveBacktraceNativeLibraryPath(ApplicationInfo appInfo, String arch, String loadedLibraryPath) {
        return resolveLibraryPath(appInfo, loadedLibraryPath, () -> arch);
    }

    private static String resolveLibraryPath(ApplicationInfo appInfo, String loadedLibraryPath, AbiProvider abiProvider) {
        if (appInfo == null) {
            throw new IllegalArgumentException("ApplicationInfo cannot be null");
        }

        final String validatedLoadedPath = validateLoadedLibraryPath(loadedLibraryPath);
        if (validatedLoadedPath != null) {
            return validatedLoadedPath;
        }

        final String extractedLibraryPath = getExtractedLibraryPath(appInfo.nativeLibraryDir);
        if (extractedLibraryPath != null) {
            return extractedLibraryPath;
        }

        return resolveFromApkMetadata(appInfo, abiProvider.getCurrentAbi());
    }

    private static String resolveFromApkMetadata(ApplicationInfo appInfo, String arch) {
        if (isNullOrEmpty(arch)) {
            throw new IllegalArgumentException("ABI cannot be null or empty");
        }

        final String entry = getApkLibraryEntry(arch);
        final String splitApkPath = findAbiSplitPath(appInfo, arch);
        if (splitApkPath != null) {
            return splitApkPath + APK_LIBRARY_SEPARATOR + entry;
        }

        final String baseApkPath = firstNonEmpty(appInfo.sourceDir, appInfo.publicSourceDir);
        if (baseApkPath == null) {
            throw new IllegalArgumentException("ApplicationInfo does not define an application APK path");
        }
        return baseApkPath + APK_LIBRARY_SEPARATOR + entry;
    }

    private String getLoadedLibraryPath() {
        if (nativeLibraryPathProvider == null) {
            return null;
        }

        try {
            return nativeLibraryPathProvider.getLoadedLibraryPath();
        } catch (LinkageError | RuntimeException ignored) {
            return null;
        }
    }

    // The linker already picked the module this process runs; a Java-guessed ABI is wrong for 32-bit processes on 64-bit devices.
    private static String validateLoadedLibraryPath(String loadedLibraryPath) {
        if (isNullOrEmpty(loadedLibraryPath)) {
            return null;
        }

        final String path = loadedLibraryPath.trim();
        final int apkSeparatorIndex = path.indexOf(APK_LIBRARY_SEPARATOR);
        if (apkSeparatorIndex >= 0) {
            final String containerPath = path.substring(0, apkSeparatorIndex);
            final String entry = path.substring(apkSeparatorIndex + APK_LIBRARY_SEPARATOR.length());
            if (!isBacktraceApkLibraryEntry(entry)) {
                return null;
            }

            File containerFile = new File(containerPath);
            return containerFile.isAbsolute() && containerFile.isFile() ? path : null;
        }

        File libraryFile = new File(path);
        if (!libraryFile.isAbsolute()
                || !BACKTRACE_NATIVE_LIBRARY_NAME.equals(libraryFile.getName())
                || !libraryFile.isFile()) {
            return null;
        }
        return libraryFile.getAbsolutePath();
    }

    private static boolean isBacktraceApkLibraryEntry(String entry) {
        final String prefix = "lib/";
        final String suffix = "/" + BACKTRACE_NATIVE_LIBRARY_NAME;
        if (entry == null || !entry.startsWith(prefix) || !entry.endsWith(suffix)) {
            return false;
        }

        final int abiEnd = entry.length() - suffix.length();
        if (abiEnd <= prefix.length()) {
            return false;
        }

        final String abi = entry.substring(prefix.length(), abiEnd);
        return abi.indexOf('/') < 0;
    }

    private static String safelyResolveLoadedLibraryPath() {
        try {
            return resolveLoadedLibraryPath();
        } catch (LinkageError | SecurityException ignored) {
            return null;
        }
    }

    private static native String resolveLoadedLibraryPath();

    private static String getExtractedLibraryPath(String nativeLibraryDirPath) {
        if (isNullOrEmpty(nativeLibraryDirPath)) {
            return null;
        }

        File extractedLibrary = new File(nativeLibraryDirPath, BACKTRACE_NATIVE_LIBRARY_NAME);
        return extractedLibrary.isFile() ? extractedLibrary.getAbsolutePath() : null;
    }

    private static String findAbiSplitPath(ApplicationInfo appInfo, String arch) {
        return findAbiSplitPath(appInfo.splitSourceDirs, appInfo.splitPublicSourceDirs, getSplitNames(appInfo), arch);
    }

    static String findAbiSplitPath(String[] splitSourceDirs, String[] splitPublicSourceDirs, String[] splitNames, String arch) {
        // Loose filename matching is decided once per install: any split-name metadata at all turns it off for every candidate.
        final boolean allowLooseFilenameMatching = splitNames == null;

        final Map<String, Integer> candidates = new LinkedHashMap<>();
        collectAbiSplitCandidates(candidates, splitSourceDirs, splitNames, arch, allowLooseFilenameMatching);
        collectAbiSplitCandidates(candidates, splitPublicSourceDirs, splitNames, arch, allowLooseFilenameMatching);

        String bestPath = null;
        int bestScore = 0;
        boolean ambiguous = false;
        for (Map.Entry<String, Integer> candidate : candidates.entrySet()) {
            int score = candidate.getValue();
            if (score > bestScore) {
                bestPath = candidate.getKey();
                bestScore = score;
                ambiguous = false;
            } else if (score == bestScore && score > 0) {
                ambiguous = true;
            }
        }
        return ambiguous ? null : bestPath;
    }

    private static void collectAbiSplitCandidates(
            Map<String, Integer> candidates,
            String[] splitPaths,
            String[] splitNames,
            String arch,
            boolean allowLooseFilenameMatching) {
        if (splitPaths == null) {
            return;
        }

        for (int index = 0; index < splitPaths.length; index++) {
            String splitPath = splitPaths[index];
            if (isNullOrEmpty(splitPath)) {
                continue;
            }

            String splitName = splitNames != null && index < splitNames.length ? splitNames[index] : null;
            int score = getAbiMatchScore(splitPath, splitName, arch, allowLooseFilenameMatching);
            if (score <= 0) {
                continue;
            }

            File splitFile = new File(splitPath);
            if (!splitFile.isAbsolute() || !splitFile.isFile()) {
                continue;
            }

            String candidatePath = splitFile.getAbsolutePath();
            Integer existingScore = candidates.get(candidatePath);
            if (existingScore == null || existingScore < score) {
                candidates.put(candidatePath, score);
            }
        }
    }

    private static String[] getSplitNames(ApplicationInfo appInfo) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return null;
        }
        return Api26Impl.getSplitNames(appInfo);
    }

    // Keeps the splitNames field reference out of any class the verifier loads on API 21-25.
    @RequiresApi(api = Build.VERSION_CODES.O)
    private static final class Api26Impl {
        private Api26Impl() {
        }

        static String[] getSplitNames(ApplicationInfo appInfo) {
            return appInfo.splitNames;
        }
    }

    private static int getAbiMatchScore(String splitPath, String splitName, String arch, boolean allowLooseFilenameMatching) {
        if (isNullOrEmpty(arch)) {
            return 0;
        }

        String normalizedArch = normalizeAbiToken(arch);
        String normalizedSplitName = isNullOrEmpty(splitName) ? null : normalizeAbiToken(splitName);
        String normalizedFileName = normalizeAbiToken(new File(splitPath).getName());

        if (("config." + normalizedArch).equals(normalizedSplitName)) {
            return 300;
        }
        if (("split_config." + normalizedArch + ".apk").equals(normalizedFileName)) {
            return 200;
        }
        if (allowLooseFilenameMatching && normalizedSplitName == null && containsAbiToken(normalizedFileName, arch)) {
            return 100;
        }
        return 0;
    }

    private static boolean containsAbiToken(String value, String arch) {
        if (isNullOrEmpty(value) || isNullOrEmpty(arch)) {
            return false;
        }

        String normalizedValue = normalizeAbiToken(value);
        String normalizedArch = normalizeAbiToken(arch);
        int startIndex = 0;
        while (startIndex < normalizedValue.length()) {
            int matchIndex = normalizedValue.indexOf(normalizedArch, startIndex);
            if (matchIndex < 0) {
                return false;
            }

            int endIndex = matchIndex + normalizedArch.length();
            boolean validStart = matchIndex == 0 || !isAbiTokenCharacter(normalizedValue.charAt(matchIndex - 1));
            boolean validEnd = endIndex == normalizedValue.length() || !isAbiTokenCharacter(normalizedValue.charAt(endIndex));
            if (validStart && validEnd) {
                return true;
            }
            startIndex = matchIndex + 1;
        }
        return false;
    }

    private static boolean isAbiTokenCharacter(char value) {
        return Character.isLetterOrDigit(value) || value == '_';
    }

    private static String normalizeAbiToken(String value) {
        return value.toLowerCase(Locale.ROOT).replace('-', '_');
    }

    private static String getApkLibraryEntry(String arch) {
        return "lib/" + arch + "/" + BACKTRACE_NATIVE_LIBRARY_NAME;
    }

    private static List<String> buildCrashHandlerEnvironment(
            Map<String, String> baseEnvironment, String classPath, String handlerPath, String librarySearchPath) {
        LinkedHashMap<String, String> environment = new LinkedHashMap<>();
        if (baseEnvironment != null) {
            environment.putAll(baseEnvironment);
        }
        putOrRemove(environment, "CLASSPATH", classPath);
        putOrRemove(environment, BACKTRACE_CRASH_HANDLER, handlerPath);
        putOrRemove(environment, "LD_LIBRARY_PATH", librarySearchPath);
        putOrRemove(environment, "ANDROID_DATA", "/data");

        List<String> serialized = new ArrayList<>(environment.size());
        for (Map.Entry<String, String> entry : environment.entrySet()) {
            serialized.add(entry.getKey() + "=" + entry.getValue());
        }
        return serialized;
    }

    private static void putOrRemove(Map<String, String> environment, String key, String value) {
        if (value == null) {
            environment.remove(key);
        } else {
            environment.put(key, value);
        }
    }

    private static String buildNativeLibrarySearchPath(String nativeLibraryDirPath) {
        LinkedHashSet<String> searchPaths = new LinkedHashSet<>();
        addSearchPath(searchPaths, nativeLibraryDirPath);

        if (!isNullOrEmpty(nativeLibraryDirPath)) {
            File allNativeLibrariesDirectory = new File(nativeLibraryDirPath).getParentFile();
            if (allNativeLibrariesDirectory != null) {
                addSearchPath(searchPaths, allNativeLibrariesDirectory.getPath());
            }
        }

        addSearchPath(searchPaths, System.getProperty("java.library.path"));
        addSearchPath(searchPaths, "/data/local");

        StringBuilder joined = new StringBuilder();
        for (String searchPath : searchPaths) {
            if (joined.length() > 0) {
                joined.append(File.pathSeparator);
            }
            joined.append(searchPath);
        }
        return joined.toString();
    }

    private static void addSearchPath(Set<String> searchPaths, String path) {
        if (!isNullOrEmpty(path)) {
            searchPaths.add(path);
        }
    }

    private static String firstNonEmpty(String first, String second) {
        return !isNullOrEmpty(first) ? first : (!isNullOrEmpty(second) ? second : null);
    }

    private static boolean isNullOrEmpty(String value) {
        return value == null || value.isEmpty();
    }
}
