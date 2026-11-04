package redisstore

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
)

func TestLoginRateLimitBlocksByIdentityAndExpires(t *testing.T) {
	server := miniredis.RunT(t)
	client, err := Open(context.Background(), "redis://"+server.Addr())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := client.Close(); err != nil {
			t.Errorf("close Redis client: %v", err)
		}
	})

	ctx := context.Background()
	for attempt := 0; attempt < loginIdentityMax; attempt++ {
		retryAfter, allowed, err := client.CheckLogin(ctx, "person@example.org", "192.0.2.1")
		if err != nil {
			t.Fatal(err)
		}
		if !allowed {
			t.Fatalf("attempt %d was unexpectedly blocked for %s", attempt+1, retryAfter)
		}
	}

	retryAfter, allowed, err := client.CheckLogin(ctx, "person@example.org", "192.0.2.1")
	if err != nil {
		t.Fatal(err)
	}
	if allowed || retryAfter <= 0 {
		t.Fatalf("expected identity limit with a retry delay; allowed=%v retryAfter=%s", allowed, retryAfter)
	}

	if err := client.ResetLoginIdentity(ctx, "person@example.org"); err != nil {
		t.Fatal(err)
	}
	_, allowed, err = client.CheckLogin(ctx, "person@example.org", "192.0.2.1")
	if err != nil {
		t.Fatal(err)
	}
	if !allowed {
		t.Fatal("expected successful authentication to reset the identity limit")
	}

	server.FastForward(loginWindow)
	_, allowed, err = client.CheckLogin(ctx, "person@example.org", "192.0.2.1")
	if err != nil {
		t.Fatal(err)
	}
	if !allowed {
		t.Fatal("expected expired login limit to allow another attempt")
	}
}

func TestLoginRateLimitIsSharedAcrossIdentitiesFromOneIP(t *testing.T) {
	server := miniredis.RunT(t)
	client, err := Open(context.Background(), "redis://"+server.Addr())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := client.Close(); err != nil {
			t.Errorf("close Redis client: %v", err)
		}
	})

	ctx := context.Background()
	for attempt := 0; attempt < loginIPMax; attempt++ {
		email := "person-" + time.Unix(int64(attempt), 0).UTC().Format("150405") + "@example.org"
		if _, allowed, err := client.CheckLogin(ctx, email, "192.0.2.2"); err != nil || !allowed {
			t.Fatalf("expected attempt %d to be allowed; allowed=%v err=%v", attempt+1, allowed, err)
		}
	}

	_, allowed, err := client.CheckLogin(ctx, "another@example.org", "192.0.2.2")
	if err != nil {
		t.Fatal(err)
	}
	if allowed {
		t.Fatal("expected the shared IP limit to block a different account")
	}
}
