package backtraceio.library;

import android.content.Context;
import android.os.Build;
import android.util.Log;

import androidx.annotation.RequiresApi;

import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import backtraceio.library.anr.ActivityManagerExitInfoProvider;
import backtraceio.library.anr.AppExitInfoDetailsExtractor;
import backtraceio.library.anr.ExitInfo;
import backtraceio.library.anr.ExitInfoStackTraceParser;
import backtraceio.library.anr.ProcessExitInfoProvider;
import backtraceio.library.anr.StackFrameMapper;

class AnrExitInfoReader {
    private final static transient String LOG_TAG = AnrExitInfoReader.class.getSimpleName();

    private static final int ALL_EXIT_RECORDS = 0;

    private final Context context;
    private final ProcessExitInfoProvider exitInfoProvider;

    AnrExitInfoReader(Context context) {
        this(context, new ActivityManagerExitInfoProvider(context));
    }

    AnrExitInfoReader(Context context, ProcessExitInfoProvider exitInfoProvider) {
        this.context = context;
        this.exitInfoProvider = exitInfoProvider;
    }

    WritableArray read(long sinceEpochMillis) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            return new WritableNativeArray();
        }
        return readAnrRecords(sinceEpochMillis);
    }

    @RequiresApi(Build.VERSION_CODES.R)
    private WritableArray readAnrRecords(long sinceEpochMillis) {
        WritableArray records = new WritableNativeArray();

        List<ExitInfo> exitInfos = this.exitInfoProvider.getHistoricalExitInfo(
                this.context.getPackageName(), 0, ALL_EXIT_RECORDS);
        List<Integer> supportedReasons = this.exitInfoProvider.getSupportedTypesOfExitInfo();

        // oldest first, so a caller advancing a last-seen timestamp cannot skip a record
        List<ExitInfo> ordered = new ArrayList<>(exitInfos);
        Collections.reverse(ordered);

        for (ExitInfo exitInfo : ordered) {
            if (!supportedReasons.contains(exitInfo.getReason())) {
                continue;
            }
            if (exitInfo.getTimestamp() <= sinceEpochMillis) {
                continue;
            }
            records.pushMap(describe(exitInfo));
        }

        return records;
    }

    @RequiresApi(Build.VERSION_CODES.R)
    private WritableMap describe(ExitInfo exitInfo) {
        String stackTrace = AppExitInfoDetailsExtractor.getStackTraceInfo(exitInfo);

        WritableMap record = new WritableNativeMap();
        // putInt would overflow epoch millis
        record.putDouble("timestamp", (double) exitInfo.getTimestamp());
        record.putString("message", AppExitInfoDetailsExtractor.getANRMessage(exitInfo));
        record.putMap("attributes", toWritableMap(AppExitInfoDetailsExtractor.getANRAttributes(exitInfo)));
        record.putString("stackTrace", stackTrace);

        Map<String, Object> parsed = parseStackTrace(stackTrace);

        StackTraceElement[] frames = ExitInfoStackTraceParser.parseMainThreadStackTrace(parsed);
        if (frames.length > 0) {
            record.putArray("mainThreadFrames", StackFrameMapper.toWritableFrames(frames));
        }

        WritableArray threads = toWritableThreads(ExitInfoStackTraceParser.parseOtherThreadStackTraces(parsed));
        if (threads.size() > 0) {
            record.putArray("threads", threads);
        }
        return record;
    }

    private Map<String, Object> parseStackTrace(String stackTrace) {
        if (stackTrace == null || stackTrace.isEmpty()) {
            return new HashMap<>();
        }

        try {
            return ExitInfoStackTraceParser.parseANRStackTrace(stackTrace);
        } catch (Exception e) {
            Log.e(LOG_TAG, "Could not parse the ANR stack trace", e);
            return new HashMap<>();
        }
    }

    private WritableArray toWritableThreads(List<ExitInfoStackTraceParser.ThreadStackTrace> threads) {
        WritableArray result = new WritableNativeArray();
        for (ExitInfoStackTraceParser.ThreadStackTrace thread : threads) {
            WritableMap map = new WritableNativeMap();
            map.putString("name", thread.getName());
            map.putArray("frames", StackFrameMapper.toWritableFrames(thread.getFrames()));
            result.pushMap(map);
        }
        return result;
    }

    private WritableMap toWritableMap(Map<String, Object> values) {
        WritableMap map = new WritableNativeMap();
        for (Map.Entry<String, Object> entry : values.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();

            if (value instanceof String) {
                map.putString(key, (String) value);
            } else if (value instanceof Integer) {
                map.putInt(key, (Integer) value);
            } else if (value instanceof Long || value instanceof Double || value instanceof Float) {
                map.putDouble(key, ((Number) value).doubleValue());
            } else if (value instanceof Boolean) {
                map.putBoolean(key, (Boolean) value);
            } else if (value == null) {
                map.putNull(key);
            } else {
                map.putString(key, value.toString());
            }
        }
        return map;
    }
}
