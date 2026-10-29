package main

// Checks that a submitted URL is a public web address. Kept in step with
// browser-tester/proxy.go, which enforces the same rule on every connection
// the test browser makes; this check just turns obvious cases away early with
// a clear error.

import (
	"context"
	"errors"
	"net"
	"net/netip"
	"net/url"
)

var errNotPublicURL = errors.New("url must be a public http or https address")

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

// parseWebURL accepts only http and https URLs with a host.
func parseWebURL(raw string) (*url.URL, error) {
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Hostname() == "" {
		return nil, errNotPublicURL
	}
	return u, nil
}

// checkPublicHost rejects a host that is, or resolves to, an address that
// isn't on the public internet. A name that doesn't resolve is let through:
// the test browser then reports it as not found, from each region.
func checkPublicHost(ctx context.Context, host string) error {
	addrs, err := net.DefaultResolver.LookupNetIP(ctx, "ip", host)
	if err != nil {
		return nil
	}
	for _, addr := range addrs {
		if !isPublicAddr(addr) {
			return errNotPublicURL
		}
	}
	return nil
}
