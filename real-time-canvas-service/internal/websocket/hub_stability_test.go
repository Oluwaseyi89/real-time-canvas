package websocket

import (
	"sync"
	"testing"
	"time"
)

// TestConcurrentUnregisterDoesNotPanic reproduces the double-close race this
// fix targets: a client's ReadPump error handler and the hub's idle-client
// sweep can each independently decide to tear the same client down. Before
// the fix, both paths called client.Close() directly, and closing an
// already-closed channel panics — on the hub's own goroutine, taking down
// real-time collaboration for every room, not just the idle client.
func TestConcurrentUnregisterDoesNotPanic(t *testing.T) {
	hub := NewHub(nil, nil)
	go hub.Run()

	const clientCount = 50
	clients := make([]*Client, clientCount)
	for i := 0; i < clientCount; i++ {
		c := NewClient(nil, hub, "user-"+string(rune('A'+i%26)), "tester")
		clients[i] = c
		hub.Register <- c
		hub.JoinRoom("room-1", c)
	}

	// Give the hub a moment to process all registrations before we start
	// racing teardown paths against each other.
	time.Sleep(50 * time.Millisecond)

	var wg sync.WaitGroup
	for _, c := range clients {
		c := c
		wg.Add(2)

		// Path 1: what ReadPump's deferred cleanup does on a read error.
		go func() {
			defer wg.Done()
			hub.Unregister <- c
		}()

		// Path 2: what the idle-client ticker does — call the sweep logic
		// directly (bypassing the 5-minute wait) against the same client.
		go func() {
			defer wg.Done()
			c.mu.Lock()
			c.LastSeen = time.Now().Add(-10 * time.Minute)
			c.mu.Unlock()
			hub.cleanupInactiveClients()
		}()
	}

	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("timed out waiting for concurrent unregister paths to finish")
	}

	// The hub goroutine must still be alive and responsive — if the double
	// -close panic had happened, it would have crashed Run()'s goroutine
	// and this registration would hang forever (nothing left to receive on
	// hub.Register).
	sentinel := NewClient(nil, hub, "sentinel", "sentinel")
	select {
	case hub.Register <- sentinel:
	case <-time.After(2 * time.Second):
		t.Fatal("hub goroutine appears to have crashed: Register was not consumed")
	}
}
