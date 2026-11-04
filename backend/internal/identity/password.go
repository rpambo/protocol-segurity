package identity

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
)

const (
	argonMemoryKiB = 64 * 1024
	argonTime      = 3
	argonThreads   = 2
	argonKeyLength = 32
	saltLength     = 16
)

var errInvalidPasswordHash = errors.New("invalid password hash")

func HashPassword(password string) (string, error) {
	if len(password) < 12 || len(password) > 1024 {
		return "", errors.New("password must be between 12 and 1024 bytes")
	}
	salt := make([]byte, saltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generate password salt: %w", err)
	}
	hash := argon2.IDKey([]byte(password), salt, argonTime, argonMemoryKiB, argonThreads, argonKeyLength)
	encodedSalt := base64.RawStdEncoding.EncodeToString(salt)
	encodedHash := base64.RawStdEncoding.EncodeToString(hash)
	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s", argonMemoryKiB, argonTime, argonThreads, encodedSalt, encodedHash), nil
}

func VerifyPassword(encoded, password string) (bool, error) {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" || parts[2] != "v=19" {
		return false, errInvalidPasswordHash
	}
	params := make(map[string]uint32, 3)
	for _, field := range strings.Split(parts[3], ",") {
		keyValue := strings.SplitN(field, "=", 2)
		if len(keyValue) != 2 {
			return false, errInvalidPasswordHash
		}
		value, err := strconv.ParseUint(keyValue[1], 10, 32)
		if err != nil {
			return false, errInvalidPasswordHash
		}
		params[keyValue[0]] = uint32(value)
	}
	memory, hasMemory := params["m"]
	iterations, hasIterations := params["t"]
	threads, hasThreads := params["p"]
	if !hasMemory || !hasIterations || !hasThreads ||
		memory < 8*1024 || memory > 256*1024 ||
		iterations == 0 || iterations > 10 ||
		threads == 0 || threads > 8 {
		return false, errInvalidPasswordHash
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil || len(salt) < 8 || len(salt) > 64 {
		return false, errInvalidPasswordHash
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil || len(expected) < 16 || len(expected) > 64 {
		return false, errInvalidPasswordHash
	}
	actual := argon2.IDKey([]byte(password), salt, iterations, memory, uint8(threads), uint32(len(expected)))
	return subtle.ConstantTimeCompare(actual, expected) == 1, nil
}
