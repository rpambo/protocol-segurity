package redisstore

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	loginWindow      = 15 * time.Minute
	loginIdentityMax = 10
	loginIPMax       = 40
)

var checkLoginRateLimitScript = redis.NewScript(`
local ip_count = tonumber(redis.call("GET", KEYS[1]) or "0")
local identity_count = tonumber(redis.call("GET", KEYS[2]) or "0")
local ip_limit = tonumber(ARGV[1])
local identity_limit = tonumber(ARGV[2])

if ip_count >= ip_limit then
    return {0, redis.call("PTTL", KEYS[1])}
end
if identity_count >= identity_limit then
    return {0, redis.call("PTTL", KEYS[2])}
end

local next_ip_count = redis.call("INCR", KEYS[1])
if next_ip_count == 1 then
    redis.call("PEXPIRE", KEYS[1], ARGV[3])
end
local next_identity_count = redis.call("INCR", KEYS[2])
if next_identity_count == 1 then
    redis.call("PEXPIRE", KEYS[2], ARGV[3])
end
return {1, 0}
`)

type Client struct {
	client *redis.Client
}

func Open(ctx context.Context, address string) (*Client, error) {
	options, err := redis.ParseURL(address)
	if err != nil {
		return nil, fmt.Errorf("parse REDIS_URL: %w", err)
	}
	client := redis.NewClient(options)
	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("connect to Redis: %w", err)
	}
	return &Client{client: client}, nil
}

func (c *Client) Ping(ctx context.Context) error {
	if err := c.client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("ping Redis: %w", err)
	}
	return nil
}

func (c *Client) Close() error {
	if err := c.client.Close(); err != nil {
		return fmt.Errorf("close Redis connection: %w", err)
	}
	return nil
}

func (c *Client) CheckLogin(ctx context.Context, email, ipAddress string) (time.Duration, bool, error) {
	if email == "" || ipAddress == "" {
		return 0, false, errors.New("login rate-limit identity and IP address are required")
	}
	result, err := checkLoginRateLimitScript.Run(ctx, c.client, []string{
		"login:ip:" + digest(ipAddress),
		"login:identity:" + digest(email),
	}, loginIPMax, loginIdentityMax, loginWindow.Milliseconds()).Slice()
	if err != nil {
		return 0, false, fmt.Errorf("check Redis login rate limit: %w", err)
	}
	if len(result) != 2 {
		return 0, false, errors.New("Redis returned an invalid login rate-limit result")
	}
	allowed, ok := result[0].(int64)
	if !ok {
		return 0, false, errors.New("Redis returned an invalid login rate-limit decision")
	}
	retryAfterMilliseconds, ok := result[1].(int64)
	if !ok {
		return 0, false, errors.New("Redis returned an invalid login rate-limit duration")
	}
	if allowed == 1 {
		return 0, true, nil
	}
	if retryAfterMilliseconds < 1 {
		retryAfterMilliseconds = loginWindow.Milliseconds()
	}
	return time.Duration(retryAfterMilliseconds) * time.Millisecond, false, nil
}

func (c *Client) ResetLoginIdentity(ctx context.Context, email string) error {
	if email == "" {
		return errors.New("login rate-limit identity is required")
	}
	if err := c.client.Del(ctx, "login:identity:"+digest(email)).Err(); err != nil {
		return fmt.Errorf("reset Redis login identity rate limit: %w", err)
	}
	return nil
}

func digest(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}
