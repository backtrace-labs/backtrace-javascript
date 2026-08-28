package backtraceio.library.anr;

public class BacktraceThreadWatcher {
    private int counter;
    private int privateCounter;

    public void tickPrivateCounter() {
        privateCounter++;
    }

    public int getPrivateCounter() {
        return privateCounter;
    }

    public synchronized int getCounter() {
        return counter;
    }

    public synchronized void tickCounter() {
        counter++;
    }
}
