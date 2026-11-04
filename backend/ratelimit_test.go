package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"testing"
	"time"
)

func TestClientIP(t *testing.T) {
	cases := map[string]string{
		"203.0.113.7":         "203.0.113.7",
		"203.0.113.7:51234":   "203.0.113.7",
		"::ffff:203.0.113.7":  "203.0.113.7",
		"[2001:db8::1]:51234": "2001:db8::1",
		"2001:db8::1":         "2001:db8::1",
	}
	for input, want := range cases {
		got, err := clientIP(input)
		if err != nil {
			t.Errorf("clientIP(%q): %v", input, err)
		} else if got.String() != want {
			t.Errorf("clientIP(%q) = %s, want %s", input, got, want)
		}
	}

	if _, err := clientIP("not an address"); err == nil {
		t.Error("clientIP accepted an invalid address")
	}
}

func TestDailyCounters(t *testing.T) {
	now := time.Date(2026, 11, 4, 12, 0, 0, 0, time.UTC)

	cases := []struct {
		ip   string
		want [3]string
	}{
		{"203.0.113.7", [3]string{"ip#203.0.113.7/32#2026-11-04", "net#203.0.113.0/24#2026-11-04", "global#2026-11-04"}},
		{"2001:db8:1:2:3:4:5:6", [3]string{"ip#2001:db8:1:2::/64#2026-11-04", "net#2001:db8:1::/48#2026-11-04", "global#2026-11-04"}},
	}
	for _, c := range cases {
		counters := dailyCounters(netip.MustParseAddr(c.ip), now, 5, 20, 500)
		for i, want := range c.want {
			if counters[i].key != want {
				t.Errorf("%s: counter %d = %s, want %s", c.ip, i, counters[i].key, want)
			}
		}
		if counters[0].limit != 5 || counters[1].limit != 20 || counters[2].limit != 500 {
			t.Errorf("%s: limits in the wrong order: %+v", c.ip, counters)
		}
	}
}

func TestSecondsUntilTomorrow(t *testing.T) {
	now := time.Date(2026, 12, 31, 23, 59, 0, 0, time.UTC)
	if got := secondsUntilTomorrow(now); got != 60 {
		t.Errorf("secondsUntilTomorrow = %d, want 60", got)
	}
}

func TestVerifyTurnstile(t *testing.T) {
	ip := netip.MustParseAddr("203.0.113.7")

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.FormValue("secret") != "secret" || r.FormValue("remoteip") != "203.0.113.7" {
			t.Errorf("unexpected form: %v", r.Form)
		}
		if r.FormValue("response") == "good" {
			w.Write([]byte(`{"success":true}`))
			return
		}
		w.Write([]byte(`{"success":false,"error-codes":["invalid-input-response"]}`))
	}))
	defer server.Close()

	for token, want := range map[string]bool{"good": true, "bad": false, "": false} {
		got, err := verifyTurnstile(context.Background(), server.URL, "secret", token, ip)
		if err != nil {
			t.Errorf("token %q: %v", token, err)
		} else if got != want {
			t.Errorf("token %q = %v, want %v", token, got, want)
		}
	}
}

func TestAllowTestRefusesWhenLambdaHasNoTable(t *testing.T) {
	t.Setenv("AWS_LAMBDA_RUNTIME_API", "127.0.0.1:9001")
	t.Setenv("RATE_LIMIT_TABLE", "")
	t.Setenv("TURNSTILE_SECRET_KEY", "")

	r := httptest.NewRequest(http.MethodPost, "/url", nil)
	r.RemoteAddr = "203.0.113.7"
	w := httptest.NewRecorder()

	if allowTest(w, r, "") {
		t.Fatal("allowTest let a test through with no rate limit table")
	}
	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("status = %d, want %d", w.Code, http.StatusServiceUnavailable)
	}
}
