package main

import (
	"net/http"
	"net/http/httptest"
	"net/netip"
	"strings"
	"testing"
	"time"
)

func TestBotPass(t *testing.T) {
	ip := netip.MustParseAddr("203.0.113.7")
	now := time.Date(2026, 11, 4, 12, 0, 0, 0, time.UTC)
	pass := issueBotPass("secret", ip, now)

	if !validBotPass("secret", pass, ip, now) {
		t.Error("a fresh pass was refused")
	}
	if !validBotPass("secret", pass, ip, now.Add(botPassLifetime-time.Second)) {
		t.Error("a pass was refused before it expired")
	}
	if validBotPass("secret", pass, ip, now.Add(botPassLifetime)) {
		t.Error("an expired pass was accepted")
	}
	if validBotPass("secret", pass, netip.MustParseAddr("203.0.113.8"), now) {
		t.Error("a pass was accepted from another IP")
	}
	if validBotPass("other secret", pass, ip, now) {
		t.Error("a pass signed with another secret was accepted")
	}

	expires, signature, _ := strings.Cut(pass, ".")
	later := expires[:len(expires)-1] + "9"
	for _, forged := range []string{"", "fake", ".", expires, expires + ".", later + "." + signature} {
		if validBotPass("secret", forged, ip, now) {
			t.Errorf("forged pass %q was accepted", forged)
		}
	}
}

func TestAllowTestAcceptsAPassRepeatedly(t *testing.T) {
	t.Setenv("TURNSTILE_SECRET_KEY", "secret")
	t.Setenv("RATE_LIMIT_TABLE", "")
	t.Setenv("AWS_LAMBDA_RUNTIME_API", "")

	ip := netip.MustParseAddr("203.0.113.7")
	pass := issueBotPass("secret", ip, time.Now())

	// One pass covers every country in a run.
	for range 3 {
		r := httptest.NewRequest(http.MethodPost, "/url", nil)
		r.RemoteAddr = ip.String()
		w := httptest.NewRecorder()
		if !allowTest(w, r, pass) {
			t.Fatalf("allowTest refused a valid pass: %d %s", w.Code, w.Body)
		}
	}
}

func TestReceiveVerifyWithBotCheckOff(t *testing.T) {
	t.Setenv("TURNSTILE_SECRET_KEY", "")

	r := httptest.NewRequest(http.MethodPost, "/verify", strings.NewReader(`{"token":""}`))
	r.RemoteAddr = "203.0.113.7"
	w := httptest.NewRecorder()
	receiveVerify(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
}
