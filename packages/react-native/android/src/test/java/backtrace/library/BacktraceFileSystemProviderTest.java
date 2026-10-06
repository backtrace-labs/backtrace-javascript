package backtrace.library;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class BacktraceFileSystemProviderTest {
    private static final String BREADCRUMBS = "{\"id\":1,\"message\":\"café\"}\n{\"id\":2}\n";

    @Rule
    public TemporaryFolder folder = new TemporaryFolder();

    @Test
    public void readFileSyncReturnsTheExactContent() throws IOException {
        File file = folder.newFile("bt-breadcrumbs-0");
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(BREADCRUMBS.getBytes(StandardCharsets.UTF_8));
        }

        assertEquals(BREADCRUMBS, new BacktraceFileSystemProvider(null).readFileSync(file.getPath()));
    }

    @Test
    public void readFileSyncReturnsNullForMissingFile() {
        String path = new File(folder.getRoot(), "missing").getPath();

        assertNull(new BacktraceFileSystemProvider(null).readFileSync(path));
    }
}
