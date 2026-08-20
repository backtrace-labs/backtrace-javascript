package backtraceio.library.anr;

import android.content.Context;
import android.content.SharedPreferences;

public class AnrExitInfoState {
    private static final String PREFS_NAME = "ANR_APP_EXIT_INFO_STATE";
    private static final String TIMESTAMP_PREF_KEY = "LAST_ANR_TIMESTAMP";
    private static final long TIMESTAMP_DEFAULT = 0;

    private final SharedPreferences sharedPreferences;

    public AnrExitInfoState(Context context) {
        this.sharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public void saveTimestamp(long value) {
        this.sharedPreferences.edit().putLong(TIMESTAMP_PREF_KEY, value).apply();
    }

    public long getLastTimestamp() {
        return this.sharedPreferences.getLong(TIMESTAMP_PREF_KEY, TIMESTAMP_DEFAULT);
    }
}
