package backtrace.library;

import android.util.Log;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class AttributeReader {
    private final static transient String LOG_TAG = AttributeReader.class.getSimpleName();

    public static Map<String, String> readAttributesFromFile(String path, HashMap<String,String> attributeMapping) {
        File file = new File(path);
        Map<String, String> attributes = new HashMap<>();

        try {
            BufferedReader br = new BufferedReader(new FileReader(file));
            String line;

            while ((line = br.readLine()) != null) {
                String[] entry = line.split(":", 2);
                String key = entry[0].trim();
                if(!attributeMapping.containsKey(key)){
                    continue;
                }
                key = attributeMapping.get(key);
                String value = entry[1].trim();
                if(value.endsWith("kB")){
                    value = value.substring(0,value.lastIndexOf('k')).trim();
                }
                attributes.put(key, value);
            }
            br.close();
        } catch (IOException e) {
            Log.d(LOG_TAG, "Cannot read process information. Reason:" + e.getMessage());
        }

        return attributes;
    }
}
