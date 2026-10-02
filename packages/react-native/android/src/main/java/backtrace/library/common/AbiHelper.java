package backtraceio.library.common;

import android.os.Build;
import android.os.Process;

import androidx.annotation.RequiresApi;

public class AbiHelper {
    @SuppressWarnings("deprecation")
    public static String getCurrentAbi() {
        // CPU_ABI follows the bitness of the running process; SUPPORTED_ABIS[0] is only the device preference.
        String processAbi = normalize(Build.CPU_ABI);
        if (processAbi != null) {
            return processAbi;
        }

        String bitnessAbi = firstValidAbi(getProcessBitnessAbis());
        if (bitnessAbi != null) {
            return bitnessAbi;
        }

        String supportedAbi = firstValidAbi(Build.SUPPORTED_ABIS);
        if (supportedAbi != null) {
            return supportedAbi;
        }

        throw new IllegalStateException("Unable to determine the current process ABI");
    }

    private static String[] getProcessBitnessAbis() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return null;
        }
        return Api23Impl.getProcessBitnessAbis();
    }

    @RequiresApi(api = Build.VERSION_CODES.M)
    private static final class Api23Impl {
        private Api23Impl() {
        }

        static String[] getProcessBitnessAbis() {
            return Process.is64Bit() ? Build.SUPPORTED_64_BIT_ABIS : Build.SUPPORTED_32_BIT_ABIS;
        }
    }

    private static String firstValidAbi(String[] abis) {
        if (abis == null) {
            return null;
        }
        for (String abi : abis) {
            String normalizedAbi = normalize(abi);
            if (normalizedAbi != null) {
                return normalizedAbi;
            }
        }
        return null;
    }

    private static String normalize(String abi) {
        if (abi == null) {
            return null;
        }
        String normalizedAbi = abi.trim();
        if (normalizedAbi.isEmpty() || Build.UNKNOWN.equals(normalizedAbi)) {
            return null;
        }
        return normalizedAbi;
    }
}
