package main

// A forward proxy that Chromium sends all its traffic through, so the test
// browser can only reach the public internet. Without it, a submitted URL (or
// a redirect, iframe or script on the page) could point Chromium at the task
// metadata endpoint, the VPC or the container itself, and the screenshot would
// show whatever answered.

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httputil"
	"net/netip"
	"net/url"
	"syscall"
)

// nonPublicPrefixes are ranges that aren't on the public internet, beyond the
// ones netip.Addr's own methods (IsPrivate, IsLoopback...) already cover.
var nonPublicPrefixes = []netip.Prefix{
	netip.MustParsePrefix("0.0.0.0/8"),
	netip.MustParsePrefix("100.64.0.0/10"), // carrier-grade NAT
	netip.MustParsePrefix("192.0.0.0/24"),
	netip.MustParsePrefix("198.18.0.0/15"), // benchmarking
	netip.MustParsePrefix("240.0.0.0/4"),   // reserved
	netip.MustParsePrefix("64:ff9b::/96"),  // NAT64, which maps onto IPv4
	netip.MustParsePrefix("64:ff9b:1::/48"),
	netip.MustParsePrefix("2002::/16"), // 6to4, which embeds an IPv4 address
}

func isPublicAddr(addr netip.Addr) bool {
	addr = addr.Unmap()
	if !addr.IsGlobalUnicast() || addr.IsPrivate() {
		return false
	}
	for _, prefix := range nonPublicPrefixes {
		if prefix.Contains(addr) {
			return false
		}
	}
	return true
}

var errNotPublic = errors.New("not a public internet address")

// publicDialer only connects to public addresses. The check runs on the
// address actually being connected to, after DNS, so a name that resolves
// differently the second time can't slip past it.
var publicDialer = &net.Dialer{
	Control: func(network, address string, _ syscall.RawConn) error {
		addrPort, err := netip.ParseAddrPort(address)
		if err != nil {
			return err
		}
		if !isPublicAddr(addrPort.Addr()) {
			return fmt.Errorf("%s: %w", address, errNotPublic)
		}
		return nil
	},
}

// checkTargetURL rejects a URL that isn't http(s), or whose host resolves to
// an address that isn't public, before a browser is started for it. The proxy
// would block it anyway; this just gives the test a clear error.
func checkTargetURL(ctx context.Context, siteURL string) error {
	u, err := url.Parse(siteURL)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Hostname() == "" {
		return fmt.Errorf("%q is not an http or https address", siteURL)
	}
	addrs, err := net.DefaultResolver.LookupNetIP(ctx, "ip", u.Hostname())
	if err != nil {
		return err
	}
	for _, addr := range addrs {
		if !isPublicAddr(addr) {
			return fmt.Errorf("%s: %w", u.Hostname(), errNotPublic)
		}
	}
	return nil
}

// startPublicProxy starts the proxy on a loopback port and returns its
// address, and a function that stops it.
func startPublicProxy() (string, func(), error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return "", nil, err
	}

	forward := &httputil.ReverseProxy{
		// Pass the request on unchanged: Rewrite (unlike Director) adds no
		// X-Forwarded-For, so sites don't see a proxy.
		Rewrite: func(*httputil.ProxyRequest) {},
		Transport: &http.Transport{
			DialContext:       publicDialer.DialContext,
			ForceAttemptHTTP2: true,
		},
		ErrorHandler: dropConnection,
	}

	server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodConnect:
			tunnel(w, r)
		case r.URL.IsAbs():
			forward.ServeHTTP(w, r)
		default:
			http.Error(w, "not a proxy request", http.StatusBadRequest)
		}
	})}
	go server.Serve(listener)

	return listener.Addr().String(), func() { server.Close() }, nil
}

// tunnel handles CONNECT, which Chromium uses for https and WebSockets. A
// failed connection answers 502, which Chromium reports as
// ERR_TUNNEL_CONNECTION_FAILED.
func tunnel(w http.ResponseWriter, r *http.Request) {
	upstream, err := publicDialer.DialContext(r.Context(), "tcp", r.Host)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer upstream.Close()

	hijacker, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "can't tunnel", http.StatusInternalServerError)
		return
	}
	client, buffered, err := hijacker.Hijack()
	if err != nil {
		return
	}
	defer client.Close()

	if _, err := io.WriteString(client, "HTTP/1.1 200 Connection Established\r\n\r\n"); err != nil {
		return
	}
	// Copy both ways until either side closes; the deferred Closes then end
	// the other copy.
	done := make(chan struct{}, 2)
	go func() {
		io.Copy(upstream, buffered)
		done <- struct{}{}
	}()
	go func() {
		io.Copy(client, upstream)
		done <- struct{}{}
	}()
	<-done
}

// dropConnection handles a failed plain-http request by closing the
// connection with no response, so Chromium reports a network error (as it
// would have without the proxy) rather than drawing a 502 page that would
// pass for a working site.
func dropConnection(w http.ResponseWriter, _ *http.Request, _ error) {
	if hijacker, ok := w.(http.Hijacker); ok {
		if conn, _, err := hijacker.Hijack(); err == nil {
			conn.Close()
			return
		}
	}
	w.WriteHeader(http.StatusBadGateway)
}
